sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/ObjectStatus",
    "../model/formatter"
], (Controller, JSONModel, MessageBox, MessageToast, Filter, FilterOperator, ObjectStatus, formatter) => {
    "use strict";

    return Controller.extend("com.bgsw.bluelistui.controller.ApproverView", {

        formatter: formatter,

        onInit() {
            // Set the approver named model as the default (unnamed) model for this view
            // so SmartFilterBar and SmartTable can consume its metadata and data.
            // This MUST happen in onInit (before the view is placed in DOM via routing),
            // otherwise SmartTable tries to read metadata from the requestor model and fails.
            var oApproverModel = this.getOwnerComponent().getModel("approver");
            this.getView().setModel(oApproverModel);

            // Initialize filter model for the approver smart filter bar
            const oFilterModel = new JSONModel({
                Project_ProjectID: "",
                Table_TableID: ""
            });
            this.getView().setModel(oFilterModel, "approverFilterModel");

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteApproverView").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched() {
            // Refresh SmartTable data when navigating back to this view
            var oSmartTable = this.byId("approverSmartTable");
            if (oSmartTable && oSmartTable.isInitialised()) {
                oSmartTable.rebindTable();
            }
        },

        onSmartTableInit() {
            var oSmartTable = this.byId("approverSmartTable");
            var oInnerTable = oSmartTable.getTable();
            oInnerTable.setMode("SingleSelectLeft");

            // Replace Status and TrainingStatus cells with ObjectStatus controls
            var oTemplate = oSmartTable._oTemplate;
            if (oTemplate) {
                var aCells = oTemplate.getCells();
                for (var i = 0; i < aCells.length; i++) {
                    var oCell = aCells[i];
                    var oBI = oCell.getBindingInfo("text") || oCell.getBindingInfo("value");
                    if (!oBI) { continue; }
                    var sPath = oBI.path || (oBI.parts && oBI.parts[0] && oBI.parts[0].path);
                    if (sPath === "Status") {
                        var oStatusCtrl = new ObjectStatus({
                            text: "{Status}",
                            state: { path: "Status", formatter: formatter.formatStatusState },
                            icon: { path: "Status", formatter: formatter.formatStatusIcon }
                        });
                        oTemplate.removeCell(oCell);
                        oTemplate.insertCell(oStatusCtrl, i);
                        oCell.destroy();
                    } else if (sPath === "TrainingStatus") {
                        var oTrainingCtrl = new ObjectStatus({
                            text: "{TrainingStatus}",
                            state: { path: "TrainingStatus", formatter: formatter.formatTrainingStatusState },
                            icon: { path: "TrainingStatus", formatter: formatter.formatTrainingStatusIcon }
                        });
                        oTemplate.removeCell(oCell);
                        oTemplate.insertCell(oTrainingCtrl, i);
                        oCell.destroy();
                    }
                }
            }
        },

        onBeforeRebindTable(oEvent) {
            var oBindingParams = oEvent.getParameter("bindingParams");
            var oFilterModel = this.getView().getModel("approverFilterModel");
            var oFilterData = oFilterModel.getData();

            // Always filter for Pending Approval requests
            oBindingParams.filters.push(new Filter("Status", FilterOperator.EQ, "Pending Approval"));

            // Expand navigation properties
            if (oBindingParams.parameters.expand) {
                oBindingParams.parameters.expand += ",Project,Table";
            } else {
                oBindingParams.parameters.expand = "Project,Table";
            }

            // Apply custom filter bar selections
            if (oFilterData.Project_ProjectID) {
                oBindingParams.filters.push(new Filter("Project_ProjectID", FilterOperator.EQ, oFilterData.Project_ProjectID));
            }
            if (oFilterData.Table_TableID) {
                oBindingParams.filters.push(new Filter("Table_TableID", FilterOperator.EQ, oFilterData.Table_TableID));
            }
        },

        onNavBack() {
            this.getOwnerComponent().getRouter().navTo("RouteDashboard");
        },

        /**
         * Get the selected request from SmartTable
         */
        _getSelectedRequest() {
            var oSmartTable = this.byId("approverSmartTable");
            var oInnerTable = oSmartTable.getTable();
            var oSelectedItem = oInnerTable.getSelectedItem();
            if (!oSelectedItem) {
                MessageBox.warning("Please select a request first.");
                return null;
            }
            return oSelectedItem.getBindingContext();
        },

        _performAction(sNewStatus, sSuccessMsg, sConfirmMsg) {
            var oContext = this._getSelectedRequest();
            if (!oContext) return;

            var sRequestID = oContext.getProperty("RequestID");

            MessageBox.confirm(sConfirmMsg, {
                title: "Confirm Action",
                onClose: (oAction) => {
                    if (oAction === MessageBox.Action.OK) {
                        var oModel = this.getView().getModel();
                        var sPath = "/Requests(guid'" + sRequestID + "')";
                        oModel.update(sPath, { Status: sNewStatus }, {
                            success: () => {
                                MessageToast.show(sSuccessMsg);
                                oModel.refresh(true);
                            },
                            error: (oError) => {
                                var sMsg = "Error performing action.";
                                try {
                                    var oResponse = JSON.parse(oError.responseText);
                                    sMsg = oResponse.error.message.value || sMsg;
                                } catch (e) { /* use default */ }
                                MessageBox.error(sMsg);
                            }
                        });
                    }
                }
            });
        },

        onApproveRequest() {
            this._performAction(
                "Approved",
                "Request approved successfully!",
                "Are you sure you want to approve this request?"
            );
        },

        onRejectRequest() {
            this._performAction(
                "Rejected",
                "Request rejected.",
                "Are you sure you want to reject this request?"
            );
        },

        onSendBackRequest() {
            this._performAction(
                "Sent Back",
                "Request sent back to requestor.",
                "Are you sure you want to send this request back to the requestor?"
            );
        }
    });
});
