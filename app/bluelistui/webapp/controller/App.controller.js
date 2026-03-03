sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "../controller/ChatbotHelper"
], (BaseController, ChatbotHelper) => {
  "use strict";

  return BaseController.extend("com.bgsw.bluelistui.controller.App", Object.assign({
      onInit() {
          this.initChatbot();
      }
  }, ChatbotHelper));
});