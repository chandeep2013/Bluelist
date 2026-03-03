sap.ui.define([], function () {
    "use strict";

    /**
     * Chatbot helper – mixed into any controller via Object.assign.
     * Provides FAQ pattern-matching and live OData queries for the Bluelist app.
     */
    var ChatbotHelper = {

        /* ====================================================================
         *  Lifecycle
         * ==================================================================== */

        initChatbot: function () {
            this._chatHistory = [];
            this._chatbotDialog = null;
            this._chatReady = false;
        },

        /* ====================================================================
         *  Open / Close / Clear
         * ==================================================================== */

        onChatbotToggle: function () {
            if (!this._chatbotDialog) {
                this._chatbotDialog = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "com.bgsw.bluelistui.view.Chatbot",
                    this
                );
                this.getView().addDependent(this._chatbotDialog);
                // Add welcome message after dialog is opened first time
                this._chatbotDialog.attachAfterOpen(function () {
                    if (!this._chatReady) {
                        this._chatReady = true;
                        this._addBotMessage("👋 Hi! I'm the **Bluelist Assistant**.\n\nI can help you with:\n• Request status & statistics\n• How to create or approve requests\n• Navigation around the app\n\nType a question or tap a quick action below!");
                    }
                    // Position dialog at bottom-right above the FAB
                    this._positionChatDialog();
                }.bind(this));
            }

            if (this._chatbotDialog.isOpen()) {
                this._chatbotDialog.close();
            } else {
                this._chatbotDialog.open();
            }
        },

        _positionChatDialog: function () {
            var oDlg = this._chatbotDialog;
            if (!oDlg) { return; }
            var oDom = oDlg.getDomRef();
            if (!oDom) { return; }
            // Pin to bottom-right, just above the FAB button
            oDom.style.position = "fixed";
            oDom.style.bottom = "90px";
            oDom.style.right = "24px";
            oDom.style.left = "auto";
            oDom.style.top = "auto";
            oDom.style.transform = "none";
            oDom.style.margin = "0";
        },

        onChatbotClose: function () {
            if (this._chatbotDialog && this._chatbotDialog.isOpen()) {
                this._chatbotDialog.close();
            }
        },

        onChatbotClear: function () {
            this._chatHistory = [];
            var oBox = this.byId("chatMessagesBox");
            if (oBox) {
                oBox.destroyItems();
            }
            this._chatReady = false;
            this._addBotMessage("👋 Chat cleared. How can I help you?");
            this._chatReady = true;
        },

        /* ====================================================================
         *  Send message
         * ==================================================================== */

        onChatSend: function () {
            var oInput = this.byId("chatInput");
            var sText = (oInput.getValue() || "").trim();
            if (!sText) { return; }

            oInput.setValue("");
            this._addUserMessage(sText);
            this._processMessage(sText);
        },

        /* ====================================================================
         *  Quick actions
         * ==================================================================== */

        onQuickAction: function (oEvent) {
            var sKey = oEvent.getSource().getText();
            var sQuery = "";
            switch (sKey) {
                case "Request Status": sQuery = "What are the request status counts?"; break;
                case "Search Tips":    sQuery = "What can you search for?"; break;
                case "My Stats":       sQuery = "Show me overall statistics"; break;
                case "Help":           sQuery = "What can you help me with?"; break;
                default:               sQuery = sKey;
            }
            this._addUserMessage(sQuery);
            this._processMessage(sQuery);
        },

        /* ====================================================================
         *  Message rendering helpers
         * ==================================================================== */

        _addUserMessage: function (sText) {
            this._chatHistory.push({ role: "user", text: sText });
            this._renderBubble(sText, "user");
        },

        _addBotMessage: function (sText) {
            this._chatHistory.push({ role: "bot", text: sText });
            this._renderBubble(sText, "bot");
        },

        _renderBubble: function (sText, sRole) {
            var oBox = this.byId("chatMessagesBox");
            if (!oBox) { return; }

            // Convert simple markdown bold **text** to <strong>
            var sHtml = sText
                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                .replace(/\n/g, "<br>")
                .replace(/• /g, "&bull; ");

            var oBubble = new sap.m.HBox({
                justifyContent: sRole === "user" ? "End" : "Start",
                items: [
                    new sap.m.VBox({
                        items: [
                            new sap.m.FormattedText({
                                htmlText: "<span>" + sHtml + "</span>"
                            }).addStyleClass(sRole === "user" ? "chatBubbleUser" : "chatBubbleBot")
                        ]
                    }).addStyleClass("chatBubbleWrap")
                ]
            }).addStyleClass("sapUiTinyMarginBottom");

            oBox.addItem(oBubble);

            // Scroll to bottom
            setTimeout(function () {
                var oScroll = this.byId("chatScrollContainer");
                if (oScroll) {
                    var oDom = oScroll.getDomRef();
                    if (oDom) {
                        oDom.scrollTop = oDom.scrollHeight;
                    }
                }
            }.bind(this), 100);
        },

        /* ====================================================================
         *  Message processing — pattern matching + OData
         * ==================================================================== */

        _processMessage: function (sText) {
            var sLower = sText.toLowerCase();

            // --- Greeting ---
            if (/^(hi|hello|hey|good\s*(morning|afternoon|evening))/.test(sLower)) {
                this._addBotMessage("Hello! 😊 How can I help you with Bluelist today?");
                return;
            }

            // --- Thanks ---
            if (/^(thanks|thank\s*you|thx|ty)/.test(sLower)) {
                this._addBotMessage("You're welcome! Let me know if you need anything else. 😊");
                return;
            }

            // --- Help / capabilities ---
            if (/what can you|capabilities|features/.test(sLower)) {
                this._addBotMessage(
                    "I can help with:\n\n" +
                    "• **Smart Search** — find requests by NTID, name, email, status, request number, date range, etc.\n" +
                    "  Examples: \"requests by NT002\", \"approved requests\", \"requests from 2026-03-01 to 2026-06-30\"\n" +
                    "• **Request Lookup** — type a request number (e.g. 2026100101)\n" +
                    "• **Status Counts** — \"how many requests\" or \"status counts\"\n" +
                    "• **Create Request** — step-by-step guide\n" +
                    "• **Approve / Reject** — how the approver flow works\n" +
                    "• **Roles & Projects** — list available roles and projects\n" +
                    "• **Navigation** — how to get to different pages\n" +
                    "• **Statistics** — overall request stats from the database\n\n" +
                    "Just type your question!"
                );
                return;
            }

            // --- Search tips ---
            if (/search.*tip|what.*search|how.*search|search.*for/.test(sLower)) {
                this._addBotMessage(
                    "**🔍 Smart Search Examples:**\n\n" +
                    "**By Role:**\n• \"requests for Fiori Developer role\"\n• \"ABAP Developer requests\"\n\n" +
                    "**By Project:**\n• \"requests from HC project\"\n• \"BBM requests\"\n\n" +
                    "**By Table:**\n• \"requests from O2C table\"\n• \"P2F requests\"\n\n" +
                    "**By NTID:**\n• \"requests by NT002\"\n\n" +
                    "**By Name:**\n• \"requests by John Smith\"\n\n" +
                    "**By Email:**\n• \"requests for jane.doe@example.com\"\n\n" +
                    "**By Status:**\n• \"approved requests\"\n• \"pending approval requests\"\n\n" +
                    "**By Date Range:**\n• \"requests from Jan 1st to today\"\n• \"requests from 2026-01-01 to 2026-03-03\"\n\n" +
                    "**Combined:**\n• \"approved requests from HC project\"\n• \"Fiori Developer requests from Jan 1st to today\""
                );
                return;
            }

            // --- How to create a request ---
            if (/how.*(create|submit|new|make|raise).*request/.test(sLower) || /create.*request/.test(sLower)) {
                this._addBotMessage(
                    "**How to Create a New Request:**\n\n" +
                    "1. Click **Submit Request** tile on the Dashboard\n" +
                    "2. Click the **+ (Create)** button\n" +
                    "3. Fill in the required fields:\n" +
                    "   • NTID, Full Name, Email\n" +
                    "   • Project, Table, **Role** (mandatory)\n" +
                    "   • Training Status, Date Range\n" +
                    "4. Click **Submit** to send for approval\n\n" +
                    "Your request will appear as **Pending Approval** in the approver's queue."
                );
                return;
            }

            // --- How approval works (exclude "how many" queries) ---
            if (!/how\s*many/.test(sLower) && (/how.*(approv|reject|send\s*back|review)/.test(sLower) || /approv.*process|workflow/.test(sLower))) {
                this._addBotMessage(
                    "**Approval Workflow:**\n\n" +
                    "1. Requestor submits a request → status becomes **Pending Approval**\n" +
                    "2. Approver navigates to **Approve Requests** tile\n" +
                    "3. In the **Pending Requests** tab, approver can:\n" +
                    "   • **Approve** ✅ — grants access\n" +
                    "   • **Reject** ❌ — denies access\n" +
                    "   • **Send Back** ↩️ — returns for correction\n" +
                    "4. Approved requests can later be **Revoked** from the Approved tab\n\n" +
                    "Email notifications are sent for each action."
                );
                return;
            }

            // --- Revoke ---
            if (/revok/.test(sLower)) {
                this._addBotMessage(
                    "**Revoking Access:**\n\n" +
                    "1. Go to **Approve Requests** → **Approved** tab\n" +
                    "2. Select one or more approved requests\n" +
                    "3. Click **Revoke** button\n" +
                    "4. The request status changes to **Revoked**\n\n" +
                    "Revoked requests appear in the **Revoked** tab and the requestor receives an email notification."
                );
                return;
            }

            // --- Navigation ---
            if (/navigate|go to|where.*find|open|page/.test(sLower)) {
                this._addBotMessage(
                    "**Navigation Guide:**\n\n" +
                    "• **Dashboard** — Home page with tiles (default page)\n" +
                    "• **Submit Request** — Create/manage your requests\n" +
                    "• **Approve Requests** — Review pending requests (4 tabs: Pending, Approved, Revoked, Logs)\n" +
                    "• **Logs** tab — Visual charts showing request distribution by Status, Table, and Role\n\n" +
                    "Use the **back button** ← on any page to return to the Dashboard."
                );
                return;
            }

            // --- Lookup specific request by number ---
            var aReqNoMatch = sText.match(/(\d{8,})/);  // 8+ digit number like 2026100101
            if (aReqNoMatch) {
                this._fetchRequestByNumber(aReqNoMatch[1]);
                return;
            }

            // --- Smart search: detect NTID, email, name, status, training, date range ---
            var oSearch = this._parseSearchQuery(sText);
            if (oSearch.hasFilters) {
                this._fetchSmartSearch(oSearch);
                return;
            }

            // --- Status counts (live OData) ---
            if (/status.*count|count.*status|how many.*request|pending.*count|approved.*count/.test(sLower)) {
                this._fetchStatusCounts();
                return;
            }

            // --- Statistics / stats / overview ---
            if (/statistic|stats|overview|summary|overall|dashboard.*data|numbers/.test(sLower)) {
                this._fetchStats();
                return;
            }

            // --- Roles ---
            if (/role|roles|what.*role/.test(sLower)) {
                this._fetchRoles();
                return;
            }

            // --- Projects ---
            if (/project|projects|what.*project/.test(sLower)) {
                this._fetchProjects();
                return;
            }

            // --- Tables ---
            if (/table|tables|what.*table/.test(sLower) && !/smart\s*table/.test(sLower)) {
                this._fetchTables();
                return;
            }

            // --- What is Bluelist ---
            if (/what.*bluelist|about.*bluelist|bluelist.*about/.test(sLower)) {
                this._addBotMessage(
                    "**Bluelist** is an Access Management application built on SAP CAP & SAPUI5.\n\n" +
                    "It allows users to:\n" +
                    "• **Request** access to specific project tables with defined roles\n" +
                    "• **Approve/Reject** requests through a structured workflow\n" +
                    "• **Track** request status with visual dashboards and logs\n" +
                    "• **Revoke** previously approved access when needed\n\n" +
                    "All actions trigger email notifications to keep everyone informed."
                );
                return;
            }

            // --- Fallback ---
            this._addBotMessage(
                "I'm not sure I understand that. Here are some things you can ask me:\n\n" +
                "• **By Role**: \"requests for Fiori Developer role\"\n" +
                "• **By Project**: \"requests from HC project\"\n" +
                "• **By Table**: \"requests from O2C table\"\n" +
                "• **By NTID**: \"requests by NT002\"\n" +
                "• **By Status**: \"approved requests\"\n" +
                "• **By Date**: \"requests from Jan 1st to today\"\n" +
                "• **Request number**: type 2026100101\n" +
                "• **Combine**: \"approved requests from HC project\"\n\n" +
                "Or tap one of the quick action buttons below!"
            );
        },

        /* ====================================================================
         *  OData queries
         * ==================================================================== */

        _fetchRequestByNumber: function (sReqNo) {
            this._addBotMessage("⏳ Looking up request **" + sReqNo + "**...");
            var oModel = this.getOwnerComponent().getModel("approver");
            var aFilters = [new sap.ui.model.Filter("RequestNo", sap.ui.model.FilterOperator.EQ, sReqNo)];
            oModel.read("/Requests", {
                filters: aFilters,
                urlParameters: { "$expand": "Project,Table,Role" },
                success: function (oData) {
                    var aResults = oData.results || [];
                    if (aResults.length === 0) {
                        this._addBotMessage("❌ No request found with number **" + sReqNo + "**.\n\nPlease check the number and try again.");
                        return;
                    }
                    this._formatRequestResults(aResults, "Request #" + sReqNo);
                }.bind(this),
                error: function () {
                    this._addBotMessage("❌ Could not look up request **" + sReqNo + "**. Please try again.");
                }.bind(this)
            });
        },

        /* ====================================================================
         *  Smart search — parse natural language into OData filters
         * ==================================================================== */

        _parseSearchQuery: function (sText) {
            var sLower = sText.toLowerCase();
            var result = { hasFilters: false, filters: [], clientFilters: [], description: [] };

            // --- NTID pattern: NT followed by digits ---
            var aNtid = sText.match(/\b(NT\d{2,})\b/i);
            if (aNtid) {
                result.filters.push({ field: "NTID", op: "EQ", value: aNtid[1].toUpperCase() });
                result.description.push("NTID = **" + aNtid[1].toUpperCase() + "**");
                result.hasFilters = true;
            }

            // --- Email pattern ---
            var aEmail = sText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            if (aEmail) {
                result.filters.push({ field: "MailID", op: "EQ", value: aEmail[1] });
                result.description.push("Email = **" + aEmail[1] + "**");
                result.hasFilters = true;
            }

            // --- Status ---
            var aStatuses = ["pending approval", "approved", "rejected", "sent back", "revoked", "draft"];
            for (var i = 0; i < aStatuses.length; i++) {
                if (sLower.indexOf(aStatuses[i]) !== -1) {
                    var sStatusVal = aStatuses[i].replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                    result.filters.push({ field: "Status", op: "EQ", value: sStatusVal });
                    result.description.push("Status = **" + sStatusVal + "**");
                    result.hasFilters = true;
                    break;
                }
            }

            // --- Training Status ---
            var aTraining = ["completed", "in progress", "not started"];
            for (var t = 0; t < aTraining.length; t++) {
                if (sLower.indexOf("training") !== -1 && sLower.indexOf(aTraining[t]) !== -1) {
                    var sTrainVal = aTraining[t].replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                    result.filters.push({ field: "TrainingStatus", op: "EQ", value: sTrainVal });
                    result.description.push("Training = **" + sTrainVal + "**");
                    result.hasFilters = true;
                    break;
                }
            }

            // --- Role name (client-side filter on expanded data) ---
            var aRoleNames = ["fiori developer", "fiori configurator", "lead developer", "tdm", "abap developer", "authorization developer", "support access"];
            for (var ri = 0; ri < aRoleNames.length; ri++) {
                if (sLower.indexOf(aRoleNames[ri]) !== -1) {
                    var sRoleDisplay = aRoleNames[ri].replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                    result.clientFilters.push({ nav: "Role", field: "RoleName", value: aRoleNames[ri] });
                    result.description.push("Role = **" + sRoleDisplay + "**");
                    result.hasFilters = true;
                    break;
                }
            }

            // --- Project name (client-side filter) ---
            var aProjectNames = ["bbm", "hc", "hr efile"];
            for (var pi = 0; pi < aProjectNames.length; pi++) {
                if (sLower.indexOf(aProjectNames[pi]) !== -1) {
                    var sProjDisplay = aProjectNames[pi].toUpperCase();
                    if (aProjectNames[pi] === "hr efile") { sProjDisplay = "HR EFile"; }
                    result.clientFilters.push({ nav: "Project", field: "ProjectName", value: aProjectNames[pi] });
                    result.description.push("Project = **" + sProjDisplay + "**");
                    result.hasFilters = true;
                    break;
                }
            }

            // --- Table name (client-side filter) ---
            var aTableNames = ["o2c", "p2f", "r2s", "q2e"];
            for (var ti = 0; ti < aTableNames.length; ti++) {
                if (sLower.indexOf(aTableNames[ti]) !== -1) {
                    result.clientFilters.push({ nav: "Table", field: "TableName", value: aTableNames[ti] });
                    result.description.push("Table = **" + aTableNames[ti].toUpperCase() + "**");
                    result.hasFilters = true;
                    break;
                }
            }

            // --- Date parsing: support natural language and ISO formats ---
            var sFromDate = null, sToDate = null;
            var sToday = this._formatDate(new Date());

            // "today" / "till today" / "to today" / "until today"
            var bToToday = /(?:to|till|until)\s*today/.test(sLower);

            // ISO date range: YYYY-MM-DD to YYYY-MM-DD
            var aISORange = sText.match(/(\d{4}-\d{2}-\d{2})\s*(?:to|-)\s*(\d{4}-\d{2}-\d{2})/);
            if (aISORange) {
                sFromDate = aISORange[1];
                sToDate = aISORange[2];
            } else {
                // Natural language dates: "Jan 1st", "January 1", "March 15th", etc.
                var aNatRange = sLower.match(/(?:from|since|after)\s+(.+?)\s+(?:to|till|until|-|through)\s+(.+?)(?:\s|$)/i);
                if (aNatRange) {
                    sFromDate = this._parseNaturalDate(aNatRange[1]);
                    var sTo = aNatRange[2].replace(/today/i, "").trim();
                    sToDate = sTo ? this._parseNaturalDate(sTo) : sToday;
                    if (bToToday) { sToDate = sToday; }
                } else {
                    // Single ISO date
                    var aSingleISO = sText.match(/(\d{4}-\d{2}-\d{2})/);
                    if (aSingleISO) {
                        sFromDate = aSingleISO[1];
                        sToDate = sFromDate;
                    } else {
                        // "from Jan 1st to today" or "since January till today"
                        var aNatFrom = sLower.match(/(?:from|since|after)\s+(.+?)(?:\s+to\s+today|\s+till\s+today|\s+until\s+today|$)/i);
                        if (aNatFrom && bToToday) {
                            sFromDate = this._parseNaturalDate(aNatFrom[1]);
                            sToDate = sToday;
                        }
                    }
                }
            }

            if (sFromDate && sToDate) {
                result.filters.push({ field: "AccessFromDate", op: "GE", value: sFromDate });
                result.filters.push({ field: "AccessEndDate", op: "LE", value: sToDate });
                result.description.push("Date: **" + sFromDate + "** to **" + sToDate + "**");
                result.hasFilters = true;
            } else if (sFromDate) {
                result.filters.push({ field: "AccessFromDate", op: "LE", value: sFromDate });
                result.filters.push({ field: "AccessEndDate", op: "GE", value: sFromDate });
                result.description.push("Active on **" + sFromDate + "**");
                result.hasFilters = true;
            }

            // --- Name search (if no NTID/email/role/project/table found) ---
            if (!aNtid && !aEmail && result.clientFilters.length === 0) {
                var aName = sText.match(/(?:by|for|of|from|named?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
                if (aName) {
                    result.filters.push({ field: "FullName", op: "Contains", value: aName[1] });
                    result.description.push("Name contains **" + aName[1] + "**");
                    result.hasFilters = true;
                }
            }

            return result;
        },

        /**
         * Parse natural language date like "Jan 1st", "January 1", "March 15th"
         * Returns YYYY-MM-DD string or null
         */
        _parseNaturalDate: function (sInput) {
            if (!sInput) { return null; }
            var s = sInput.trim().toLowerCase();

            // "today"
            if (s === "today" || s === "now") {
                return this._formatDate(new Date());
            }

            var months = {
                "jan": 0, "january": 0, "feb": 1, "february": 1, "mar": 2, "march": 2,
                "apr": 3, "april": 3, "may": 4, "jun": 5, "june": 5,
                "jul": 6, "july": 6, "aug": 7, "august": 7, "sep": 8, "september": 8,
                "oct": 9, "october": 9, "nov": 10, "november": 10, "dec": 11, "december": 11
            };

            // "Jan 1st", "January 1", "Jan 1", "1st Jan", "1 January"
            var aMatch = s.match(/([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/) ||
                         s.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)/);
            if (aMatch) {
                var sMonth, sDay;
                if (isNaN(parseInt(aMatch[1]))) {
                    sMonth = aMatch[1]; sDay = aMatch[2];
                } else {
                    sDay = aMatch[1]; sMonth = aMatch[2];
                }
                var nMonth = months[sMonth];
                if (nMonth !== undefined) {
                    var nYear = new Date().getFullYear();
                    var nDay = parseInt(sDay, 10);
                    return this._formatDate(new Date(nYear, nMonth, nDay));
                }
            }

            return null;
        },

        _formatDate: function (oDate) {
            var y = oDate.getFullYear();
            var m = String(oDate.getMonth() + 1).padStart(2, "0");
            var d = String(oDate.getDate()).padStart(2, "0");
            return y + "-" + m + "-" + d;
        },

        _fetchSmartSearch: function (oSearch) {
            var Filter = sap.ui.model.Filter;
            var FO = sap.ui.model.FilterOperator;
            var sDesc = oSearch.description.join(", ");
            this._addBotMessage("⏳ Searching requests where " + sDesc + "...");

            // Build OData filters for direct entity fields
            var aODataFilters = [];
            oSearch.filters.forEach(function (f) {
                var sOp;
                switch (f.op) {
                    case "EQ": sOp = FO.EQ; break;
                    case "GE": sOp = FO.GE; break;
                    case "LE": sOp = FO.LE; break;
                    case "Contains": sOp = FO.Contains; break;
                    default: sOp = FO.EQ;
                }
                aODataFilters.push(new Filter(f.field, sOp, f.value));
            });

            var aClientFilters = oSearch.clientFilters || [];

            var oModel = this.getOwnerComponent().getModel("approver");
            oModel.read("/Requests", {
                filters: aODataFilters,
                urlParameters: { "$expand": "Project,Table,Role" },
                success: function (oData) {
                    var aResults = oData.results || [];

                    // Apply client-side filters for navigation properties (Role, Project, Table)
                    if (aClientFilters.length > 0) {
                        aResults = aResults.filter(function (r) {
                            return aClientFilters.every(function (cf) {
                                var oNav = r[cf.nav];
                                if (!oNav) { return false; }
                                return oNav[cf.field] && oNav[cf.field].toLowerCase() === cf.value.toLowerCase();
                            });
                        });
                    }

                    if (aResults.length === 0) {
                        this._addBotMessage("❌ No requests found matching: " + sDesc);
                        return;
                    }
                    this._formatRequestResults(aResults, "Search: " + sDesc);
                }.bind(this),
                error: function () {
                    this._addBotMessage("❌ Search failed. Please try again.");
                }.bind(this)
            });
        },

        _formatRequestResults: function (aResults, sTitle) {
            var icons = {
                "Pending Approval": "🟡", "Approved": "🟢", "Rejected": "🔴",
                "Sent Back": "🟠", "Revoked": "🚫", "Draft": "📝"
            };

            if (aResults.length === 1) {
                var r = aResults[0];
                var sIcon = icons[r.Status] || "⚪";
                var sMsg = "**" + sTitle + "** — 1 result\n\n";
                sMsg += "• **Request #:** " + (r.RequestNo || "-") + "\n";
                sMsg += "• **Status:** " + sIcon + " " + r.Status + "\n";
                sMsg += "• **Requestor:** " + (r.FullName || "-") + " (" + (r.NTID || "-") + ")\n";
                sMsg += "• **Email:** " + (r.MailID || "-") + "\n";
                sMsg += "• **Project:** " + (r.Project ? r.Project.ProjectName : "-") + "\n";
                sMsg += "• **Table:** " + (r.Table ? r.Table.TableName : "-") + "\n";
                sMsg += "• **Role:** " + (r.Role ? r.Role.RoleName : "-") + "\n";
                sMsg += "• **Training:** " + (r.TrainingStatus || "-") + "\n";
                sMsg += "• **Access Period:** " + (r.AccessFromDate || "-") + " → " + (r.AccessEndDate || "-") + "\n";
                if (r.Comments) { sMsg += "• **Comments:** " + r.Comments + "\n"; }
                this._addBotMessage(sMsg);
            } else {
                // Multiple results — show summary table
                var sMsg = "**" + sTitle + "** — " + aResults.length + " results\n\n";
                // Status summary
                var oCounts = {};
                aResults.forEach(function (r) { oCounts[r.Status] = (oCounts[r.Status] || 0) + 1; });
                var aStatusKeys = Object.keys(oCounts);
                if (aStatusKeys.length > 0) {
                    sMsg += "**Status Breakdown:**\n";
                    aStatusKeys.forEach(function (s) {
                        sMsg += "• " + (icons[s] || "") + " " + s + ": " + oCounts[s] + "\n";
                    });
                    sMsg += "\n";
                }
                // List each (max 10)
                var nShow = Math.min(aResults.length, 10);
                sMsg += "**Details:**\n";
                for (var i = 0; i < nShow; i++) {
                    var req = aResults[i];
                    var ic = icons[req.Status] || "⚪";
                    sMsg += (i + 1) + ". " + ic + " **#" + req.RequestNo + "** — " + (req.FullName || "-") +
                        " | " + req.Status +
                        " | " + (req.Project ? req.Project.ProjectName : "-") +
                        " | " + (req.Role ? req.Role.RoleName : "-") + "\n";
                }
                if (aResults.length > 10) {
                    sMsg += "\n... and " + (aResults.length - 10) + " more.";
                }
                this._addBotMessage(sMsg);
            }
        },

        _fetchStatusCounts: function () {
            this._addBotMessage("⏳ Fetching request status counts...");
            var oModel = this.getOwnerComponent().getModel("approver");
            oModel.read("/Requests", {
                success: function (oData) {
                    var aResults = oData.results || [];
                    var oCounts = {};
                    aResults.forEach(function (r) {
                        var s = r.Status || "Unknown";
                        oCounts[s] = (oCounts[s] || 0) + 1;
                    });
                    var sMsg = "**Request Status Counts:**\n\n";
                    var aOrder = ["Pending Approval", "Approved", "Rejected", "Sent Back", "Revoked", "Draft"];
                    var icons = {
                        "Pending Approval": "🟡", "Approved": "🟢", "Rejected": "🔴",
                        "Sent Back": "🟠", "Revoked": "🚫", "Draft": "📝"
                    };
                    aOrder.forEach(function (s) {
                        if (oCounts[s]) {
                            sMsg += "• " + (icons[s] || "") + " **" + s + "**: " + oCounts[s] + "\n";
                        }
                    });
                    // Any other statuses
                    Object.keys(oCounts).forEach(function (s) {
                        if (aOrder.indexOf(s) === -1) {
                            sMsg += "• **" + s + "**: " + oCounts[s] + "\n";
                        }
                    });
                    sMsg += "\n**Total**: " + aResults.length + " requests";
                    this._addBotMessage(sMsg);
                }.bind(this),
                error: function () {
                    this._addBotMessage("❌ Sorry, I couldn't fetch the data. Please try again.");
                }.bind(this)
            });
        },

        _fetchStats: function () {
            this._addBotMessage("⏳ Loading statistics...");
            var oModel = this.getOwnerComponent().getModel("approver");
            oModel.read("/Requests", {
                urlParameters: { "$expand": "Project,Table,Role" },
                success: function (oData) {
                    var aResults = oData.results || [];
                    var oCounts = {}, oProjects = {}, oRoles = {};
                    aResults.forEach(function (r) {
                        oCounts[r.Status] = (oCounts[r.Status] || 0) + 1;
                        if (r.Project) { oProjects[r.Project.ProjectName] = (oProjects[r.Project.ProjectName] || 0) + 1; }
                        if (r.Role) { oRoles[r.Role.RoleName] = (oRoles[r.Role.RoleName] || 0) + 1; }
                    });

                    var sMsg = "📊 **Overall Statistics:**\n\n";
                    sMsg += "**Total Requests:** " + aResults.length + "\n\n";

                    sMsg += "**By Status:**\n";
                    Object.keys(oCounts).sort().forEach(function (s) {
                        sMsg += "• " + s + ": " + oCounts[s] + "\n";
                    });

                    sMsg += "\n**By Project:**\n";
                    Object.keys(oProjects).sort().forEach(function (p) {
                        sMsg += "• " + p + ": " + oProjects[p] + "\n";
                    });

                    sMsg += "\n**By Role:**\n";
                    Object.keys(oRoles).sort().forEach(function (r) {
                        sMsg += "• " + r + ": " + oRoles[r] + "\n";
                    });

                    this._addBotMessage(sMsg);
                }.bind(this),
                error: function () {
                    this._addBotMessage("❌ Sorry, I couldn't fetch the statistics. Please try again.");
                }.bind(this)
            });
        },

        _fetchRoles: function () {
            var oModel = this.getOwnerComponent().getModel("approver");
            oModel.read("/Roles", {
                success: function (oData) {
                    var aRoles = oData.results || [];
                    var sMsg = "**Available Roles (" + aRoles.length + "):**\n\n";
                    aRoles.forEach(function (r, i) {
                        sMsg += "• " + (i + 1) + ". " + r.RoleName + "\n";
                    });
                    sMsg += "\nRoles are assigned when creating a request and are **mandatory**.";
                    this._addBotMessage(sMsg);
                }.bind(this),
                error: function () {
                    this._addBotMessage("❌ Could not fetch roles. Please try again.");
                }.bind(this)
            });
        },

        _fetchProjects: function () {
            var oModel = this.getOwnerComponent().getModel("approver");
            oModel.read("/Projects", {
                success: function (oData) {
                    var aProjects = oData.results || [];
                    var sMsg = "**Available Projects (" + aProjects.length + "):**\n\n";
                    aProjects.forEach(function (p, i) {
                        sMsg += "• " + (i + 1) + ". " + p.ProjectName + "\n";
                    });
                    this._addBotMessage(sMsg);
                }.bind(this),
                error: function () {
                    this._addBotMessage("❌ Could not fetch projects. Please try again.");
                }.bind(this)
            });
        },

        _fetchTables: function () {
            var oModel = this.getOwnerComponent().getModel("approver");
            oModel.read("/Tables", {
                success: function (oData) {
                    var aTables = oData.results || [];
                    var sMsg = "**Available Tables (" + aTables.length + "):**\n\n";
                    aTables.forEach(function (t, i) {
                        sMsg += "• " + (i + 1) + ". " + t.TableName + "\n";
                    });
                    this._addBotMessage(sMsg);
                }.bind(this),
                error: function () {
                    this._addBotMessage("❌ Could not fetch tables. Please try again.");
                }.bind(this)
            });
        }
    };

    return ChatbotHelper;
});
