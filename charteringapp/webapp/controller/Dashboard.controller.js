sap.ui.define([
    "sap/ui/core/mvc/Controller"
], (Controller) => {
    "use strict";

    return Controller.extend("hmel.com.charteringapp.controller.Dashboard", {
        onInit() {
            this.getTradeEntryData();
            this.getOwnerComponent().getModel("appModel").setProperty("/IsEditMode", false); 
        },

        getTradeEntryData: function () {
            var oAppModel = this.getOwnerComponent().getModel("appModel");
            // Bind to the created path
            var oModel = this.getOwnerComponent().getModel();
            // Create a filter for TRADE_NO
            // var sFilterUrl = `TRADE_NO eq '${tradeNo}'`;
            // var sPath = `/TradeEntry?$filter=${encodeURIComponent(sFilterUrl)}`;
            var sPath = `/TradeEntry`;
            var oContextBinding = oModel.bindContext(sPath, undefined, undefined);
            var oBusyDialog = new sap.m.BusyDialog();
            oBusyDialog.open();
            oContextBinding.requestObject().then(function (oData) {
                oBusyDialog.close();
                var tradeDetails = oData.value || [];
                oAppModel.setProperty("/CharteringDetails", tradeDetails[0]);
                oAppModel.refresh();
            }.bind(this)).catch(function (oError) {
                oBusyDialog.close();
                console.error("Error fetching project data: ", oError);
            });
        },
        onPressEdit: function () {
           this.getOwnerComponent().getModel("appModel").setProperty("/IsEditMode", true);
            
            this.getOwnerComponent().getModel("appModel").setProperty("/IsSaveEnabled", true);
            this.getOwnerComponent().getModel("appModel").setProperty("/IsEditEnabled", false);
        },
        onPressSave: function() {
            this.getOwnerComponent().getModel("appModel").setProperty("/IsEditMode", false);
            this.getOwnerComponent().getModel("appModel").setProperty("/IsSaveEnabled", false);
            this.getOwnerComponent().getModel("appModel").setProperty("/IsEditEnabled", true);
        }

    });
});