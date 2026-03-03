sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/ObjectStatus",
    "../model/formatter",
    "sap/viz/ui5/format/ChartFormatter"
], (Controller, JSONModel, MessageBox, MessageToast, Filter, FilterOperator, ObjectStatus, formatter, ChartFormatter) => {
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

            // Initialize logs chart model
            var oLogsModel = new JSONModel({
                selectedProjectID: "",
                selectedProjectName: "All Projects",
                selectedStatus: "All",
                statusData: [],
                tableData: [],
                roleData: [],
                totalCount: 0,
                approvedCount: 0,
                rejectedCount: 0
            });
            this.getView().setModel(oLogsModel, "logsModel");

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteApproverView").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched() {
            // Refresh SmartTable data when navigating back to this view
            var oSmartTable = this.byId("approverSmartTable");
            if (oSmartTable && oSmartTable.isInitialised()) {
                oSmartTable.rebindTable();
            }
            // Default-select the first project, then load chart data
            this._initLogsDefaultProject();
        },

        /**
         * Read Projects and default the logs filter to the first entry
         */
        _initLogsDefaultProject() {
            var oModel = this.getView().getModel();
            var oLogsModel = this.getView().getModel("logsModel");

            oModel.read("/Projects", {
                success: function (oData) {
                    var aProjects = oData.results || [];
                    if (aProjects.length > 0) {
                        var oFirst = aProjects[0];
                        oLogsModel.setProperty("/selectedProjectID", oFirst.ProjectID);
                        oLogsModel.setProperty("/selectedProjectName", oFirst.ProjectName);
                    }
                    this._loadLogsChartData();
                }.bind(this),
                error: function () {
                    // Fallback: load without project filter
                    this._loadLogsChartData();
                }.bind(this)
            });
        },

        onSmartTableInit() {
            var oSmartTable = this.byId("approverSmartTable");
            var oInnerTable = oSmartTable.getTable();
            oInnerTable.setMode("MultiSelect");

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
                oBindingParams.parameters.expand += ",Project,Table,Role";
            } else {
                oBindingParams.parameters.expand = "Project,Table,Role";
            }

            // Apply custom filter bar selections
            if (oFilterData.Project_ProjectID) {
                oBindingParams.filters.push(new Filter("Project_ProjectID", FilterOperator.EQ, oFilterData.Project_ProjectID));
            }
            if (oFilterData.Table_TableID) {
                oBindingParams.filters.push(new Filter("Table_TableID", FilterOperator.EQ, oFilterData.Table_TableID));
            }
        },

        onBeforeRebindApprovedTable(oEvent) {
            var oBindingParams = oEvent.getParameter("bindingParams");

            // Only show Approved records
            oBindingParams.filters.push(new Filter("Status", FilterOperator.EQ, "Approved"));

            // Expand navigation properties
            if (oBindingParams.parameters.expand) {
                oBindingParams.parameters.expand += ",Project,Table,Role";
            } else {
                oBindingParams.parameters.expand = "Project,Table,Role";
            }
        },

        onApprovedSmartTableInit() {
            var oSmartTable = this.byId("approvedSmartTable");
            var oInnerTable = oSmartTable.getTable();
            oInnerTable.setMode("MultiSelect");

            // Replace Status and TrainingStatus cells with ObjectStatus controls
            this._applyObjectStatusCells(oSmartTable);
        },

        onBeforeRebindRevokedTable(oEvent) {
            var oBindingParams = oEvent.getParameter("bindingParams");

            // Only show Revoked records
            oBindingParams.filters.push(new Filter("Status", FilterOperator.EQ, "Revoked"));

            // Expand navigation properties
            if (oBindingParams.parameters.expand) {
                oBindingParams.parameters.expand += ",Project,Table,Role";
            } else {
                oBindingParams.parameters.expand = "Project,Table,Role";
            }
        },

        onRevokedSmartTableInit() {
            var oSmartTable = this.byId("revokedSmartTable");
            var oInnerTable = oSmartTable.getTable();
            oInnerTable.setMode("None");

            // Replace Status and TrainingStatus cells with ObjectStatus controls
            this._applyObjectStatusCells(oSmartTable);
        },

        /**
         * Reusable helper to replace Status/TrainingStatus text cells with ObjectStatus controls
         */
        _applyObjectStatusCells(oSmartTable) {
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

        onNavBack() {
            this.getOwnerComponent().getRouter().navTo("RouteDashboard");
        },

        /**
         * Get selected requests from the Pending SmartTable
         */
        _getSelectedRequests() {
            var oSmartTable = this.byId("approverSmartTable");
            var oInnerTable = oSmartTable.getTable();
            var aSelectedItems = oInnerTable.getSelectedItems();
            if (!aSelectedItems || aSelectedItems.length === 0) {
                MessageBox.warning("Please select at least one request.");
                return null;
            }
            return aSelectedItems;
        },

        _performAction(sNewStatus, sSuccessMsg, sConfirmMsg) {
            var aSelectedItems = this._getSelectedRequests();
            if (!aSelectedItems) return;

            var iCount = aSelectedItems.length;
            MessageBox.confirm(sConfirmMsg + " (" + iCount + " selected)", {
                title: "Confirm Action",
                onClose: (oAction) => {
                    if (oAction === MessageBox.Action.OK) {
                        var oModel = this.getView().getModel();
                        oModel.setDeferredGroups(["pendingActionGroup"]);

                        aSelectedItems.forEach(function (oItem) {
                            var oContext = oItem.getBindingContext();
                            var sRequestID = oContext.getProperty("RequestID");
                            var sPath = "/Requests(guid'" + sRequestID + "')";
                            oModel.update(sPath, { Status: sNewStatus }, { groupId: "pendingActionGroup" });
                        });

                        oModel.submitChanges({
                            groupId: "pendingActionGroup",
                            success: () => {
                                MessageToast.show(iCount + " request(s) " + sSuccessMsg);
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
                "approved successfully!",
                "Are you sure you want to approve the selected request(s)?"
            );
        },

        onRejectRequest() {
            this._performAction(
                "Rejected",
                "rejected.",
                "Are you sure you want to reject the selected request(s)?"
            );
        },

        onSendBackRequest() {
            this._performAction(
                "Sent Back",
                "sent back to requestor.",
                "Are you sure you want to send the selected request(s) back?"
            );
        },

        /**
         * Revoke multiple selected approved requests
         */
        onRevokeRequest() {
            var oSmartTable = this.byId("approvedSmartTable");
            var oInnerTable = oSmartTable.getTable();
            var aSelectedItems = oInnerTable.getSelectedItems();

            if (!aSelectedItems || aSelectedItems.length === 0) {
                MessageBox.warning("Please select at least one request to revoke.");
                return;
            }

            var iCount = aSelectedItems.length;
            MessageBox.confirm("Are you sure you want to revoke " + iCount + " selected request(s)?", {
                title: "Confirm Revoke",
                onClose: (oAction) => {
                    if (oAction === MessageBox.Action.OK) {
                        var oModel = this.getView().getModel();
                        oModel.setDeferredGroups(["revokeGroup"]);

                        aSelectedItems.forEach(function (oItem) {
                            var oContext = oItem.getBindingContext();
                            var sRequestID = oContext.getProperty("RequestID");
                            var sPath = "/Requests(guid'" + sRequestID + "')";
                            oModel.update(sPath, { Status: "Revoked" }, { groupId: "revokeGroup" });
                        });

                        oModel.submitChanges({
                            groupId: "revokeGroup",
                            success: () => {
                                MessageToast.show(iCount + " request(s) revoked successfully.");
                                oModel.refresh(true);
                            },
                            error: (oError) => {
                                var sMsg = "Error revoking requests.";
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

        // ==================== Logs / Charts ====================

        /**
         * Load all requests and compute chart aggregations
         */
        _loadLogsChartData() {
            var oModel = this.getView().getModel();
            var oLogsModel = this.getView().getModel("logsModel");
            var sProjectFilter = oLogsModel.getProperty("/selectedProjectID");

            var aFilters = [];
            if (sProjectFilter) {
                aFilters.push(new Filter("Project_ProjectID", FilterOperator.EQ, sProjectFilter));
            }

            oModel.read("/Requests", {
                filters: aFilters,
                urlParameters: {
                    "$expand": "Project,Table,Role"
                },
                success: function (oData) {
                    var aResults = oData.results || [];
                    this._processChartData(aResults);
                }.bind(this),
                error: function () {
                    MessageToast.show("Failed to load logs data.");
                }
            });
        },

        /**
         * Process raw request data into chart-ready aggregations
         */
        _processChartData(aRequests, sSelectedStatus) {
            var oLogsModel = this.getView().getModel("logsModel");

            // --- Status aggregation (for Pie chart) ---
            var mStatus = {};
            aRequests.forEach(function (req) {
                var s = req.Status || "Unknown";
                mStatus[s] = (mStatus[s] || 0) + 1;
            });
            var aStatusData = Object.keys(mStatus).map(function (key) {
                return { Status: key, Count: mStatus[key] };
            });

            // Counts
            var iApproved = mStatus["Approved"] || 0;
            var iRejected = mStatus["Rejected"] || 0;

            oLogsModel.setProperty("/statusData", aStatusData);
            oLogsModel.setProperty("/totalCount", aRequests.length);
            oLogsModel.setProperty("/approvedCount", iApproved);
            oLogsModel.setProperty("/rejectedCount", iRejected);

            // --- Filter by selected status for secondary charts ---
            var aFiltered = aRequests;
            if (sSelectedStatus) {
                aFiltered = aRequests.filter(function (r) { return r.Status === sSelectedStatus; });
                oLogsModel.setProperty("/selectedStatus", sSelectedStatus);
            } else {
                oLogsModel.setProperty("/selectedStatus", "All");
            }

            // --- Table aggregation (for Column chart) ---
            var mTable = {};
            aFiltered.forEach(function (req) {
                var tName = (req.Table && req.Table.TableName) || "Unknown";
                mTable[tName] = (mTable[tName] || 0) + 1;
            });
            var aTableData = Object.keys(mTable).map(function (key) {
                return { TableName: key, Count: mTable[key] };
            });
            oLogsModel.setProperty("/tableData", aTableData);

            // --- Role aggregation (for Column chart) ---
            var mRole = {};
            aFiltered.forEach(function (req) {
                var r = (req.Role && req.Role.RoleName) || "Unknown";
                mRole[r] = (mRole[r] || 0) + 1;
            });
            var aRoleData = Object.keys(mRole).map(function (key) {
                return { RoleName: key, Count: mRole[key] };
            });
            oLogsModel.setProperty("/roleData", aRoleData);

            // Configure chart properties
            this._configureCharts();
        },

        /**
         * Set VizFrame properties (titles, colors, tooltips)
         */
        _configureCharts() {
            var oPieChart = this.byId("statusPieChart");
            if (oPieChart) {
                oPieChart.setVizProperties({
                    title: { text: "Requests by Status" },
                    plotArea: {
                        dataLabel: { visible: true, type: "value" },
                        colorPalette: ["#2b7c2b", "#e6600d", "#bb0000", "#5899da", "#999999"]
                    },
                    legend: { visible: true }
                });
            }

            var oTableChart = this.byId("tableColumnChart");
            if (oTableChart) {
                oTableChart.setVizProperties({
                    title: { text: "Requests by Table" },
                    plotArea: {
                        dataLabel: { visible: true },
                        colorPalette: ["#5899da"]
                    },
                    legend: { visible: false }
                });
            }

            var oRoleChart = this.byId("roleColumnChart");
            if (oRoleChart) {
                oRoleChart.setVizProperties({
                    title: { text: "Requests by Role" },
                    plotArea: {
                        dataLabel: { visible: true },
                        colorPalette: ["#e8743b"]
                    },
                    legend: { visible: false }
                });
            }
        },

        /**
         * Handle project dropdown change in logs tab
         */
        onLogsProjectFilterChange(oEvent) {
            var oSource = oEvent.getSource();
            var sKey = oSource.getSelectedKey();
            var sText = oSource.getSelectedItem() ? oSource.getSelectedItem().getText() : "All Projects";
            var oLogsModel = this.getView().getModel("logsModel");
            oLogsModel.setProperty("/selectedProjectID", sKey);
            oLogsModel.setProperty("/selectedProjectName", sText || "All Projects");
            oLogsModel.setProperty("/selectedStatus", "All");
            this._loadLogsChartData();
        },

        /**
         * Handle pie chart slice selection – filters Table & Role charts
         */
        onPieChartSelect(oEvent) {
            var oData = oEvent.getParameter("data");
            if (!oData || !oData.length) { return; }

            var aDataPoints = oData[0].data;
            if (!aDataPoints || !aDataPoints.length) { return; }

            var sStatus = aDataPoints[0].Status;
            var oLogsModel = this.getView().getModel("logsModel");
            var sProjectFilter = oLogsModel.getProperty("/selectedProjectID");

            // Re-read and re-process with selected status
            var oModel = this.getView().getModel();
            var aFilters = [];
            if (sProjectFilter) {
                aFilters.push(new Filter("Project_ProjectID", FilterOperator.EQ, sProjectFilter));
            }

            oModel.read("/Requests", {
                filters: aFilters,
                urlParameters: { "$expand": "Project,Table,Role" },
                success: function (oResult) {
                    this._processChartData(oResult.results || [], sStatus);
                }.bind(this),
                error: function () {
                    MessageToast.show("Failed to load filtered data.");
                }
            });
        }
    });
});
