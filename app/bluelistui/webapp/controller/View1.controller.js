sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/ObjectStatus",
    "../model/formatter"
], (Controller, JSONModel, MessageBox, MessageToast, Fragment, Filter, FilterOperator, ObjectStatus, formatter) => {
    "use strict";

    return Controller.extend("com.bgsw.bluelistui.controller.View1", {

        formatter: formatter,

        onInit() {
            // Set date display format for SmartTable columns
            sap.ui.getCore().getConfiguration().getFormatSettings().setDatePattern("medium", "dd-MM-yyyy");

            // Attach route matched event
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteView1").attachPatternMatched(this._onRouteMatched, this);

            // Initialize form model for the dialog
            const oFormModel = new JSONModel(this._getEmptyFormData());
            this.getView().setModel(oFormModel, "formModel");

            // Initialize filter model
            const oFilterModel = new JSONModel({
                Project_ProjectID: "",
                Table_TableID: ""
            });
            this.getView().setModel(oFilterModel, "filterModel");
        },

        onSmartTableInit() {
            const oSmartTable = this.byId("smartTable");
            const oInnerTable = oSmartTable.getTable();
            oInnerTable.setMode("SingleSelectLeft");

            // Replace Status and TrainingStatus cells in SmartTable's internal template with ObjectStatus
            const oTemplate = oSmartTable._oTemplate;
            if (oTemplate) {
                const aCells = oTemplate.getCells();
                for (let i = 0; i < aCells.length; i++) {
                    const oCell = aCells[i];
                    const oBI = oCell.getBindingInfo("text") || oCell.getBindingInfo("value");
                    if (!oBI) { continue; }
                    const sPath = oBI.path || (oBI.parts && oBI.parts[0] && oBI.parts[0].path);
                    if (sPath === "Status") {
                        const oObjectStatus = new ObjectStatus({
                            text: "{Status}",
                            state: { path: "Status", formatter: formatter.formatStatusState },
                            icon: { path: "Status", formatter: formatter.formatStatusIcon }
                        });
                        oTemplate.removeCell(oCell);
                        oTemplate.insertCell(oObjectStatus, i);
                        oCell.destroy();
                    } else if (sPath === "TrainingStatus") {
                        const oTrainingStatus = new ObjectStatus({
                            text: "{TrainingStatus}",
                            state: { path: "TrainingStatus", formatter: formatter.formatTrainingStatusState },
                            icon: { path: "TrainingStatus", formatter: formatter.formatTrainingStatusIcon }
                        });
                        oTemplate.removeCell(oCell);
                        oTemplate.insertCell(oTrainingStatus, i);
                        oCell.destroy();
                    }
                }
            }
        },

        onBeforeRebindTable(oEvent) {
            const oBindingParams = oEvent.getParameter("bindingParams");
            const oFilterModel = this.getView().getModel("filterModel");
            const oFilterData = oFilterModel.getData();

            // Expand navigation properties to fetch Project Name and Table Name
            if (oBindingParams.parameters.expand) {
                oBindingParams.parameters.expand += ",Project,Table,Role";
            } else {
                oBindingParams.parameters.expand = "Project,Table,Role";
            }

            if (oFilterData.Project_ProjectID) {
                oBindingParams.filters.push(new Filter("Project_ProjectID", FilterOperator.EQ, oFilterData.Project_ProjectID));
            }
            if (oFilterData.Table_TableID) {
                oBindingParams.filters.push(new Filter("Table_TableID", FilterOperator.EQ, oFilterData.Table_TableID));
            }
        },

        _getEmptyFormData() {
            return {
                NTID: "",
                FullName: "",
                MailID: "",
                Project_ProjectID: "",
                Table_TableID: "",
                Role_RoleID: "",
                ApproverNTID: "",
                TrainingStatus: "",
                AccessFromDate: "",
                AccessEndDate: "",
                Comments: "",
                dialogTitle: "Create Access Request",
                submitButtonText: "Submit",
                isEditMode: false,
                editRequestID: ""
            };
        },

        // Open creation dialog
        onCreateRequest() {
            const oView = this.getView();
            if (!this._pDialog) {
                this._pDialog = Fragment.load({
                    id: oView.getId(),
                    name: "com.bgsw.bluelistui.view.CreateRequestDialog",
                    controller: this
                }).then((oDialog) => {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }
            this._pDialog.then((oDialog) => {
                // Reset form data each time dialog opens
                this.getView().getModel("formModel").setData(this._getEmptyFormData());
                oDialog.open();
            });
        },

        // Open edit dialog with selected request data
        onEditRequest() {
            const oTable = this.byId("smartTable").getTable();
            const oSelectedItem = oTable.getSelectedItem();
            if (!oSelectedItem) {
                MessageBox.warning("Please select a request to edit.");
                return;
            }

            const oContext = oSelectedItem.getBindingContext();
            const oData = oContext.getObject();

            // Only allow editing requests with certain statuses
            if (oData.Status === "Approved") {
                MessageBox.error("Approved requests cannot be edited.");
                return;
            }

            const oView = this.getView();
            if (!this._pDialog) {
                this._pDialog = Fragment.load({
                    id: oView.getId(),
                    name: "com.bgsw.bluelistui.view.CreateRequestDialog",
                    controller: this
                }).then((oDialog) => {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }
            this._pDialog.then((oDialog) => {
                // Read the full entity from backend to get all fields
                const oModel = this.getView().getModel();
                const sPath = oContext.getPath();
                oModel.read(sPath, {
                    success: (oFullData) => {
                        const oFormModel = this.getView().getModel("formModel");
                        oFormModel.setData({
                            NTID: oFullData.NTID || "",
                            FullName: oFullData.FullName || "",
                            MailID: oFullData.MailID || "",
                            Project_ProjectID: oFullData.Project_ProjectID || "",
                            Table_TableID: oFullData.Table_TableID || "",
                            Role_RoleID: oFullData.Role_RoleID || "",
                            ApproverNTID: oFullData.ApproverNTID || "",
                            TrainingStatus: oFullData.TrainingStatus || "",
                            AccessFromDate: oFullData.AccessFromDate || "",
                            AccessEndDate: oFullData.AccessEndDate || "",
                            Comments: oFullData.Comments || "",
                            dialogTitle: "Edit Access Request",
                            submitButtonText: "Update",
                            isEditMode: true,
                            editRequestID: oFullData.RequestID
                        });
                        oDialog.open();
                    },
                    error: () => {
                        MessageBox.error("Failed to load request details.");
                    }
                });
            });
        },

        // Delete selected request
        onDeleteRequest() {
            const oTable = this.byId("smartTable").getTable();
            const oSelectedItem = oTable.getSelectedItem();
            if (!oSelectedItem) {
                MessageBox.warning("Please select a request to delete.");
                return;
            }

            const oContext = oSelectedItem.getBindingContext();
            const oData = oContext.getObject();

            if (oData.Status === "Approved") {
                MessageBox.error("Approved requests cannot be deleted.");
                return;
            }

            MessageBox.confirm(
                "Are you sure you want to delete the request for '" + oData.FullName + "'?",
                {
                    title: "Confirm Deletion",
                    onClose: (oAction) => {
                        if (oAction === MessageBox.Action.OK) {
                            const oModel = this.getView().getModel();
                            const sPath = oContext.getPath();
                            oModel.remove(sPath, {
                                success: () => {
                                    MessageToast.show("Request deleted successfully!");
                                    oModel.refresh(true);
                                },
                                error: (oError) => {
                                    let sMsg = "Error deleting request.";
                                    try {
                                        const oResponse = JSON.parse(oError.responseText);
                                        sMsg = oResponse.error.message.value || sMsg;
                                    } catch (e) { /* use default */ }
                                    MessageBox.error(sMsg);
                                }
                            });
                        }
                    }
                }
            );
        },

        // Submit or update request from dialog
        onSubmitRequest() {
            const oFormModel = this.getView().getModel("formModel");
            const oData = oFormModel.getData();

            // Validate required fields
            if (!oData.NTID || !oData.FullName || !oData.MailID ||
                !oData.Project_ProjectID || !oData.Table_TableID ||
                !oData.Role_RoleID || !oData.TrainingStatus ||
                !oData.AccessFromDate || !oData.AccessEndDate) {
                MessageBox.error("Please fill in all required fields.");
                return;
            }

            // Validate dates
            if (oData.AccessEndDate < oData.AccessFromDate) {
                MessageBox.error("Access End Date must be after Access From Date.");
                return;
            }

            const oModel = this.getView().getModel();
            const oPayload = {
                NTID: oData.NTID,
                FullName: oData.FullName,
                MailID: oData.MailID,
                Project_ProjectID: oData.Project_ProjectID,
                Table_TableID: oData.Table_TableID,
                Role_RoleID: oData.Role_RoleID,
                ApproverNTID: oData.ApproverNTID,
                TrainingStatus: oData.TrainingStatus,
                AccessFromDate: oData.AccessFromDate,
                AccessEndDate: oData.AccessEndDate,
                Comments: oData.Comments
            };

            if (oData.isEditMode && oData.editRequestID) {
                // Update existing request — reset status to Pending Approval so approver sees it
                oPayload.Status = "Pending Approval";
                const sPath = "/Requests(guid'" + oData.editRequestID + "')";
                oModel.update(sPath, oPayload, {
                    success: () => {
                        MessageToast.show("Request updated successfully!");
                        this._closeDialog();
                        oModel.refresh(true);
                    },
                    error: (oError) => {
                        let sMsg = "Error updating request.";
                        try {
                            const oResponse = JSON.parse(oError.responseText);
                            sMsg = oResponse.error.message.value || sMsg;
                        } catch (e) { /* use default */ }
                        MessageBox.error(sMsg);
                    }
                });
            } else {
                // Create new request
                oPayload.Status = "Pending Approval";
                oModel.create("/Requests", oPayload, {
                    success: () => {
                        MessageToast.show("Request submitted successfully!");
                        this._closeDialog();
                        oModel.refresh(true);
                    },
                    error: (oError) => {
                        let sMsg = "Error submitting request.";
                        try {
                            const oResponse = JSON.parse(oError.responseText);
                            sMsg = oResponse.error.message.value || sMsg;
                        } catch (e) { /* use default */ }
                        MessageBox.error(sMsg);
                    }
                });
            }
        },

        onCancelDialog() {
            this._closeDialog();
        },

        _closeDialog() {
            this._pDialog.then((oDialog) => {
                oDialog.close();
            });
        },

        _onRouteMatched() {
            // Refresh table data when returning to this view
            var oSmartTable = this.byId("smartTable");
            if (oSmartTable) {
                oSmartTable.rebindTable();
            }
        },

        onNavBack() {
            this.getOwnerComponent().getRouter().navTo("RouteDashboard");
        }
    });
});