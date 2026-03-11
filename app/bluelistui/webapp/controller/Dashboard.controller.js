sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (Controller, JSONModel, Filter, FilterOperator) => {
    "use strict";

    return Controller.extend("com.bgsw.bluelistui.controller.Dashboard", {

        onInit() {
            var oDashModel = new JSONModel({
                totalCount: 0,
                pendingCount: 0,
                approvedCount: 0,
                rejectedCount: 0,
                kpiState: "Loading"
            });
            this.getView().setModel(oDashModel, "dashModel");

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteDashboard").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched() {
            this._loadKPIData();
        },

        _loadKPIData() {
            var oModel = this.getOwnerComponent().getModel();
            var oDashModel = this.getView().getModel("dashModel");
            oDashModel.setProperty("/kpiState", "Loading");

            var _readCount = function (filters, fnSuccess) {
                oModel.read("/Requests", {
                    urlParameters: { "$top": "1", "$inlinecount": "allpages" },
                    filters: filters || [],
                    success: function (oData) {
                        fnSuccess(parseInt(oData.__count || 0, 10));
                    },
                    error: function () { fnSuccess(0); }
                });
            };

            _readCount(null, function (n) { oDashModel.setProperty("/totalCount", n); });
            _readCount([new Filter("Status", FilterOperator.EQ, "Pending Approval")], function (n) { oDashModel.setProperty("/pendingCount", n); });
            _readCount([new Filter("Status", FilterOperator.EQ, "Approved")], function (n) { oDashModel.setProperty("/approvedCount", n); });
            _readCount([new Filter("Status", FilterOperator.EQ, "Rejected")], function (n) {
                oDashModel.setProperty("/rejectedCount", n);
                oDashModel.setProperty("/kpiState", "Loaded");
            });
        },

        onRequestorTilePress() {
            this.getOwnerComponent().getRouter().navTo("RouteView1");
        },

        onApproverTilePress() {
            this.getOwnerComponent().getRouter().navTo("RouteApproverView");
        }
    });
});
