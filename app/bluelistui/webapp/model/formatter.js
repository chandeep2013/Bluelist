sap.ui.define([], function () {
    "use strict";

    return {
        /**
         * Returns the ValueState for a given status text.
         * @param {string} sStatus - The status value
         * @returns {string} The sap.ui.core.ValueState
         */
        formatStatusState: function (sStatus) {
            switch (sStatus) {
                case "Approved":
                    return "Success";
                case "Pending Approval":
                    return "Warning";
                case "Rejected":
                    return "Error";
                case "Draft":
                    return "Information";
                case "Sent Back":
                    return "Warning";
                case "Revoked":
                    return "Error";
                default:
                    return "None";
            }
        },

        /**
         * Returns an icon for a given status text.
         * @param {string} sStatus - The status value
         * @returns {string} The icon URI
         */
        formatStatusIcon: function (sStatus) {
            switch (sStatus) {
                case "Approved":
                    return "sap-icon://accept";
                case "Pending Approval":
                    return "sap-icon://pending";
                case "Rejected":
                    return "sap-icon://decline";
                case "Draft":
                    return "sap-icon://draft";
                case "Sent Back":
                    return "sap-icon://undo";
                case "Revoked":
                    return "sap-icon://sys-cancel";
                default:
                    return "";
            }
        },

        /**
         * Returns the ValueState for a given training status.
         * @param {string} sStatus - The training status value 
         * @returns {string} The sap.ui.core.ValueState
         */
        formatTrainingStatusState: function (sStatus) {
            switch (sStatus) {
                case "Completed":
                    return "Success";
                case "In Progress":
                    return "Warning";
                case "Not Started":
                    return "Error";
                default:
                    return "None";
            }
        },

        /**
         * Returns an icon for a given training status.
         * @param {string} sStatus - The training status value
         * @returns {string} The icon URI
         */
        formatTrainingStatusIcon: function (sStatus) {
            switch (sStatus) {
                case "Completed":
                    return "sap-icon://accept";
                case "In Progress":
                    return "sap-icon://pending";
                case "Not Started":
                    return "sap-icon://decline";
                default:
                    return "";
            }
        }
    };
});
