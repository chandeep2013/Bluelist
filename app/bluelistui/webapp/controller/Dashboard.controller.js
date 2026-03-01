sap.ui.define([
    "sap/ui/core/mvc/Controller"
], (Controller) => {
    "use strict";

    return Controller.extend("com.bgsw.bluelistui.controller.Dashboard", {

        onInit() {
        },

        onRequestorTilePress() {
            this.getOwnerComponent().getRouter().navTo("RouteView1");
        },

        onApproverTilePress() {
            this.getOwnerComponent().getRouter().navTo("RouteApproverView");
        }
    });
});
