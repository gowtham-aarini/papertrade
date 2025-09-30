sap.ui.define([
    "sap/ui/core/mvc/Controller"
], (Controller) => {
    "use strict";

    return Controller.extend("hmel.com.tradeuiapp.controller.TradeView", {
        onInit() {
            const oRouter = this.getOwnerComponent().getRouter();
			oRouter.getRoute("RouteTradeView").attachPatternMatched(this.onObjectMatched, this);
            // this.getTradeEntryData();
            this._oBusyDialog = new sap.m.BusyDialog();
            //Set Cost Model
            var oCostModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(oCostModel, "costModel");

            var oAppModel = this.getOwnerComponent().getModel("appModel");
			// Get params

			var oComponentData = this.getOwnerComponent().getComponentData();
			var sValue;
			if (oComponentData && oComponentData.startupParameters) {
				var oParams = oComponentData.startupParameters;
				// Example: If parameter name = "myParam"
				if (oParams.tradeType) {
					sValue = oParams.tradeType[0]; // values are arrays
					console.log("Parameter value:", sValue);
				} else {
					sValue = "";
				}
			}
			
			if (sValue === "PHYSICAL"){
				oAppModel.setProperty("/TradeType", "1");
			} else if(sValue === "PAPER"){
				oAppModel.setProperty("/TradeType", "2");
			} else {
				oAppModel.setProperty("/TradeType", "1");
			}
        },

		onObjectMatched(oEvent) {
			var tradeNo = oEvent.getParameter("arguments").tradeNumber;
            var oAppModel = this.getOwnerComponent().getModel("appModel");
            this.checkFieldEnabled(oAppModel, tradeNo);
            var sFilterUrl, sPath;
            // this.filterCostTable()
            if (tradeNo === 'CREATE') {
                // sFilterUrl = `TRADE_NO eq '${tradeNo}'`;
                sPath = `/TradeEntry`;
            } else {
                sFilterUrl = `TRADE_NO eq '${tradeNo}'`;
                sPath = `/TradeEntry?$filter=${encodeURIComponent(sFilterUrl)}`;
                this.getTradeEntryData(sPath);
                this.filterCostTable();
            }
            
            
		},

        filterCostTable: function () {
            var oAppModel = this.getOwnerComponent().getModel("appModel");
            // Bind to the created path
            var oModel = this.getOwnerComponent().getModel();
            var tradeNo = oAppModel.getProperty("/TradeNo");
            // Create a filter for TRADE_NO
            var sFilterUrl = `TRADE_NO eq '${tradeNo}'`;
            var sPath = `/Cost?$expand=tradetype,pricetype&$filter=${encodeURIComponent(sFilterUrl)}`;
            var oContextBinding = oModel.bindContext(sPath, undefined, undefined);
            var oBusyDialog = new sap.m.BusyDialog();
            oBusyDialog.open();
            oContextBinding.requestObject().then(function (oData) {
                oBusyDialog.close();
                var costDetails = oData.value || [];
                costDetails.forEach(row => row.isRowEditable = false);
                this.getView().getModel("costModel").setData(costDetails);
                this.getView().getModel("costModel").refresh();
            }.bind(this)).catch(function (oError) {
                oBusyDialog.close();
                console.error("Error fetching project data: ", oError);
            });
            // var oTable = this.byId("costTableId");
            // var oFilter = new sap.ui.model.Filter("TRADE_NO", "EQ", sTradeNo);
            // oTable.getBinding("rows").filter([oFilter]);
            
        },

        checkFieldEnabled: function (oAppModel, tradeNo) {
            if (tradeNo === 'CREATE') {
                // Show BusyDialog
                this._oBusyDialog.open();

                // Auto close after 5 sec
                setTimeout(() => {
                    this._oBusyDialog.close();
                }, 7000);
                oAppModel.setProperty("/TradeNo", "");
                oAppModel.setProperty("/IsTradeNumberEnabled", true);
                // oAppModel.setProperty("/TradeDetails", []);
                oAppModel.setProperty("/IsCreateEnabled", true);
                oAppModel.setProperty("/IsEditEnabled", false);
                oAppModel.setProperty("/TradeDetails", []);
                oAppModel.setProperty("/IsSaveEnabled", true);
                oAppModel.setProperty("/IsSaveAsDraftEnabled", true);
            } else {
                oAppModel.setProperty("/TradeNo", tradeNo);
                oAppModel.setProperty("/IsTradeNumberEnabled", false);
                oAppModel.setProperty("/IsCreateEnabled", false)
                oAppModel.setProperty("/IsEditEnabled", true);
                oAppModel.setProperty("/IsSaveEnabled", false);
                oAppModel.setProperty("/IsSaveAsDraftEnabled", false);
            }
            oAppModel.refresh();
        },

        onNavPress: function (oEvent) {
            var oItem = oEvent.getSource();  
            var oContext = oItem.getBindingContext();
            var oData = oContext.getObject();

            var tradeNo = this.getOwnerComponent().getModel("appModel").getProperty("/TradeNo")
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteCostEditView", {
                "costType": oData.COSTID
                // "costType": tradeNo
            });
        },

        getTradeEntryData: function (sPath) {
            var oAppModel = this.getOwnerComponent().getModel("appModel");
            // Bind to the created path
            var oModel = this.getOwnerComponent().getModel();
            // Create a filter for TRADE_NO
            // var sFilterUrl = `TRADE_NO eq '${tradeNo}'`;
            // var sPath = `/TradeEntry?$filter=${encodeURIComponent(sFilterUrl)}`;
            var oContextBinding = oModel.bindContext(sPath, undefined, undefined);
            var oBusyDialog = new sap.m.BusyDialog();
            oBusyDialog.open();
            oContextBinding.requestObject().then(function (oData) {
                oBusyDialog.close();
                var tradeDetails = oData.value || [];
                
                oAppModel.setProperty("/TradeDetails", tradeDetails[0]);
                // Extract TRADER_NAME (unique, as array of objects)
                var aTraderNames = [...new Set(tradeDetails.map(function (item) {
                    return item.TRADER_NAME;
                }))].map(function (name) {
                    return { TRADER_NAME: name };
                });

                // Extract ZSCHEDULE (unique, as array of objects)
                var aScheduleDetails = [...new Set(tradeDetails.map(function (item) {
                    return item.ZSCHEDULE;
                }))].map(function (schedule) {
                    return { ZSCHEDULE: schedule };
                });

                // Store in model
                oAppModel.setProperty("/TraderNames", aTraderNames);
                oAppModel.setProperty("/ScheduleDetails", aScheduleDetails);
                oAppModel.refresh();
            }.bind(this)).catch(function (oError) {
                oBusyDialog.close();
                console.error("Error fetching project data: ", oError);
            });
        },

        onPressSave: function (oEvent) {
            var sAction = oEvent.getSource().data("action")
            var appModel = this.getView().getModel("appModel"); 
            var tradeData = appModel.getProperty("/TradeDetails");
            var tradeNumber = appModel.getProperty("/TradeNo");
            var tradeTypeMID = appModel.getProperty("/TradeType");
            var status;
            if (sAction == 'draft') {
                status = "D";
            } else if (sAction == 'save') {
                status = tradeData.STATUS;
            } else {
                status = "A"
            }

            var oRBGroup = this.byId("rbggroup");
            var iSelectedIndex = oRBGroup.getSelectedIndex();   // 0 for Buy, 1 for Sell
            var oSelectedButton = oRBGroup.getButtons()[iSelectedIndex]; 
            var sSelectedId = oSelectedButton.getId();          // "RB3-buy" or "RB3-sell"

            // Map based on id
            var sellOrBuyValue;
            if (sSelectedId.includes("buy")) {
                sellOrBuyValue = "1";
            } else if (sSelectedId.includes("sell")) {
                sellOrBuyValue = "2";
            } else {
                sellOrBuyValue = '';
            }

            var oModel = this.getOwnerComponent().getModel(); // OData V2 model

            function convertToISO(dateStr) {
                if (!dateStr) return null;

                // Case 1: YYYYMMDD
                if (/^\d{8}$/.test(dateStr)) {
                    const year = dateStr.substring(0, 4);
                    const month = dateStr.substring(4, 6);
                    const day = dateStr.substring(6, 8);
                    return `${year}-${month}-${day}T00:00:00`;
                }

                // Case 2: MM/DD/YY or MM/DD/YYYY
                if (dateStr.includes("/")) {
                    const parts = dateStr.split("/");
                    let month = parts[0].padStart(2, "0");
                    let day = parts[1].padStart(2, "0");
                    let year = parts[2].length === 2 ? "20" + parts[2] : parts[2]; // handle YY → 20YY
                    return `${year}-${month}-${day}T00:00:00`;
                }

                // Default: try native Date parsing
                const d = new Date(dateStr);
                if (!isNaN(d)) {
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T00:00:00`;
                }

                return null; // invalid date
            }

            var oSavePayload = {
                "TradeNo": tradeNumber,
                "TradeDat": null,
                "DealDate": convertToISO(tradeData.DEAL_DATE),
                "StartDat": convertToISO(tradeData.START_DAT),
                "EndDate": convertToISO(tradeData.END_DATE),
                "Prcprdsd": null,
                "Prcprded": null,
                "Lcopdat": null,
                "Prcsdatlag1": convertToISO(tradeData.PRCSDATLAG1),
                "Prcedatlag1": null,
                "Prcsdatlag2": null,
                "Prcedatlag2": null,
                "Setlmntdat2": null,
                "Tnsfrcmcnt": null,
                "Tnsfrcmpln": null,
                "Efftvedate": null,
                "Vslnordate": null,
                "Declaredat": convertToISO(tradeData.DECLAREDAT),
                "Cststdate": null,
                "Cstendate": null,
                "Inputdate": null,
                "Payduedat": convertToISO(tradeData.PAYDUEDAT),
                "Evtstadat": null,
                "Evtenddat": null,
                "Evtestdat": null,
                "Buyfrmdat": null,
                "Buytodate": null,
                "Rndgnmbr": "0.000",
                "Prcfrml1": tradeData.PRCFRML1 ? Number(tradeData.PRCFRML1).toFixed(3) : "0.000",
                "Prcfrml2": "0.000",
                "Prcfrml3": "0.000",
                "Pymtrmdys": "0.000",
                "Opencredit": tradeData.OPENCREDIT || "0.000",
                "Lcvalue": tradeData.LCVALUE || "0.000",
                "Mtmfactor": tradeData.MTMFACTOR || "0.000",
                "Aquantity": tradeData.AQUANTITY || "0.000",
                "Cquantity": tradeData.CQUANTITY || "0.000",
                "Prcrndngoff": "0.000",
                "Price": "0.000",
                "Mndteprice": "0.000",
                "Minquant": tradeData.MINQUANT || "0.000",
                "Maxquant": tradeData.MAXQUANT || "0.000",
                "Meanquant": tradeData.MEANQUANT || "0.000",
                "Schedldqty": "0.000",
                "Demrgedays": "0.000",
                "Demrgerate": "0.000",
                "Grnqty":"0.000",
                "Invoiceqty":"0.000",
                "Otrnqtypaymt":"0.000",
                "Api": "0.000",
                "Spcfcgrvity": "0.000",
                "Tolernbpct": tradeData.TOLERNBPCT || "0.000",
                "Tolernapct": tradeData.TOLERNAPCT || "0.000",
                "Pricedisc": tradeData.PRICEDISC || "0.000",
                "Priceprec": "0.000",
                "Costvalue": "0.000",
                "Prcfxdrat": "0.000",
                "Payrolldd": "0.000",
                "Stlmtnday": tradeData.STLMTNDAY || "0.000",
                "Stlmntpay": tradeData.STLMNTPAY || "0.000",
                "Tradtypmid": tradeTypeMID || "",
                "Zschedule": tradeData.ZSCHEDULE || "",
                "Tradtypid": tradeData.TRADTYPID || "",
                "Intercomp": tradeData.INTERCOMP || "",
                "TraderId": tradeData.TRADER_ID || "",
                "Cntrprtid": tradeData.CNTRPRTID || "",
                "Ttltrmsid": tradeData.TTLTRMSID || "",
                "Zlocation": tradeData.ZLOCATION || "",
                "Pcmrkrid": tradeData.PCMRKRID || "",
                "Rndgrlid": tradeData.RNDGRLID || "",
                "Prcgtpid": tradeData.PRCGTPID || "",
                "Prcgrlid": tradeData.PRCGRLID || "",
                "Prcuomid": "",
                "Pymtrmsid": tradeData.PYMTRMSID || "",
                "Pymtrmrid": "",
                "Pmtcurrid": "",
                "Crdtrmsid": tradeData.CRDTRMSID || "",
                "Lccode": "",
                "Mtmcrveid": tradeData.MTMCRVEID || "",
                "Applawid": tradeData.APPLAWID || "",
                "Gtcid": tradeData.GTCID || "",
                "Inmttypid":"",
                "Buysellid": sellOrBuyValue,
                "Qtyunitid": "",
                "Strategyid": tradeData.STRATEGYID || "",
                "Setdpccrv1id": "",
                "Setldprccrv2":"",
                "Mtmcurve1id": "",
                "Mtmcurve2id": "",
                "Undphytrade": "",
                "Setlmtdat1id": "",
                "Mdntpcuomid":"",
                "Attchmntsid": "",
                "Transfernum": "",
                "Uomid": "",
                "Vehicleid": "",
                "Tnsfrstid": "",
                "Demrgrtuom": "",
                "Grnqtyuomid":"",
                "Invqtyuomid": "",
                "Ournqtyuntid": "",
                "Ctseperatlid": "",
                "Costypeuomid": "",
                "Costypecurid": "",
                "Costypetflid": "",
                "Costbasis": "",
                "Basedonpl": "",
                "Coststats": "",
                "Commdtid": tradeData.COMMDTID || "",
                "Delvtrmsid":tradeData.DELVTRMSID || "",
                "Delvloadid": tradeData.DELVLOADID || "",
                "Delvdchrid": tradeData.DELVDCHRID || "",
                "Origlctin": "",
                "Origpoint": "",
                "Country": tradeData.COUNTRY || "",
                "Tolernoptn": tradeData.TOLERNOPTN || "",
                "Declaredby": tradeData.DECLAREDBY || "",
                "Costsched": "",
                "CostReve": "",
                "Company": "",
                "Paymnttrm": "",
                "Prcurrid": tradeData.PRCURRID || "",
                "Priceindx": "",
                "Stlmtcrid": tradeData.STLMTCRID || "",
                "Stlmtuum": tradeData.STLMTUUM || "",
                "Stlmntlev": tradeData.STLMNTLEV || "",
                "Pamtasign": tradeData.PAMTASIGN || "",
                "Contconfm": "",
                "Conftradr": "",
                "Confmappr": "",
                "Contevent": "",
                "Evtprcing": "",
                "Evtpaymnt": "",
                "Evtttltnf": "",
                "Zperiodid": "",
                "Zspanid": "",
                "Status": status
            }
            // this.postS4hana(oSavePayload);
            var oModel = this.getOwnerComponent().getModel("s4HanaModel");
            oModel.create("/ZTM_TRADE_ENTRYSet", oSavePayload, {
                success: function (oData) {
                    sap.m.MessageToast.show("Successfully!");
                    console.log("Created:", oData);
                },
                error: function (oError) {
                    sap.m.MessageBox.error("Error while creating TradeEntry");
                    console.error("Create failed:", oError);
                }
            });
            
        },

        postS4hana: function (oSavePayload) {
            var oModel = this.getOwnerComponent().getModel("s4HanaModel");
            var sServiceUrl = oModel.sServiceUrl + "/ZTM_TRADE_ENTRYSet";
            // Function to send POST request
            $.ajax({
                url: sServiceUrl,
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(oSavePayload),
                headers: {
                    "X-CSRF-Token": getCsrfToken(sServiceUrl) // Fetch CSRF token dynamically
                },
                success: function (oData) {
                    sap.m.MessageToast.show("Successfully!");
                    console.log("Success:", oData);
                },
                error: function (jqXHR) {
                    sap.m.MessageBox.error("Error: " + jqXHR.responseText);
                }
            });
            
            
                function getCsrfToken(sServiceUrl) {
                    var sToken;
                    $.ajax({
                        url: sServiceUrl,
                        type: "GET",
                        async: false,  // Synchronous request
                        headers: {
                            "X-CSRF-Token": "Fetch"
                        },
                        success: function (data, textStatus, request) {
                            sToken = request.getResponseHeader("X-CSRF-Token");
                        },
                        error: function () {
                            sap.m.MessageBox.error("Failed to fetch CSRF token.");
                        }
                    });
                    return sToken;
                }

            // // First fetch the CSRF token
            // $.ajax({
            //     url: oModel.sServiceUrl + "/ZTM_TRADE_ENTRYSet",   // service root URL
            //     type: "GET",
            //     headers: {
            //         "X-CSRF-Token": "Fetch"
            //     },
            //     success: function (data, textStatus, xhr) {
            //         var sToken = xhr.getResponseHeader("X-CSRF-Token");

            //         // Now call create with token
            //         $.ajax({
            //             url: oModel.sServiceUrl + "/ZTM_TRADE_ENTRYSet",
            //             type: "POST",
            //             contentType: "application/json",
            //             data: oSavePayload,
            //             headers: {
            //                 "X-CSRF-Token": sToken
            //             },
            //             success: function (oData) {
            //                 sap.m.MessageToast.show("TradeEntry created ");
            //                 console.log("Created:", oData);
            //             },
            //             error: function (oError) {
            //                 sap.m.MessageBox.error("Error while creating TradeEntry");
            //                 console.error("Create failed:", oError);
            //             }
            //         });
            //     },
            //     error: function (oError) {
            //         sap.m.MessageBox.error("Error while fetching CSRF token");
            //     }
            // });
            

        },

        onPressEdit: function () {
            var oAppModel = this.getOwnerComponent().getModel("appModel");
            oAppModel.setProperty("/IsCreateEnabled", true);
            oAppModel.setProperty("/IsSaveEnabled", true);
            oAppModel.setProperty("/IsEditEnabled", false);
        },
        onRowSelectionChange: function (oEvent) {
            var oTable = this.byId("costTableId");
            var aSelectedIndices = oTable.getSelectedIndices();

            this.byId("toggleEditBtn").setEnabled(aSelectedIndices.length > 0);
        },
        onToggleEdit: function () {
            var oTable = this.byId("costTableId");
            var aSelectedIndices = oTable.getSelectedIndices();
            var oCostModel = this.getView().getModel("costModel");
            var oData = oCostModel.getData();

            if (aSelectedIndices.length > 0) {
                aSelectedIndices.forEach(function (iIndex) {
                    // Always set to editable (don’t toggle)
                    oData[iIndex].isRowEditable = true;
                });

                oCostModel.refresh(true);
                this.byId("toggleSaveBtn").setEnabled(true);
            } else {
                sap.m.MessageToast.show("Please select at least one row to edit.");
            }
        },
        onToggleAdd: function () {
            // var oTable = this.byId("costTableId");
            var oModel = this.getView().getModel("costModel");
            if (!oModel) {
                console.error("costModel not found");
                return;
            }
            var aData = oModel.getProperty("/") || [];
            if (!Array.isArray(aData)) {
                aData = []; 
            }
            if (aData.length > 0) {
                aData.forEach(function(oRow) {
                    oRow.isRowEditable = false;
                });
            }
            var oNewRow = {
                    TRADE_NO: "",
                    COSTTYPE: "",
                    COSTID: "",
                    PRICETYPE: "",
                    PRICEPREM: "",
                    COSTCURR: "",
                    COSTUOM: "",
                    BASED_ON_QTY: "",
                    COST_STATUS: "",
                    PRICING_PRECISION: "",
                    OPERATOR: "",
                    SETTLEMENT_CURR: "",
                    COMPANY: "",
                    PAYMENT: "",
                    PAYMENT_DATE: ""
                    // isRowEditable: true 
            };
            aData.push(oNewRow);
            oModel.setProperty("/", aData);
            // oTable.clearSelection();
            this.byId("toggleSaveBtn").setEnabled(true);
        },
        onToggleSave: function () {
            var ocostModel = this.getView().getModel("costModel");
            var aData = ocostModel.getProperty("/") || [];

            var aPayload = aData.map(function (oRow) {
                return {
                    TRADE_NO: oRow.TRADE_NO || "",
                    COSTTYPE: oRow.COSTTYPE || "",
                    COSTID: oRow.COSTID || "",
                    PRICETYPE: oRow.PRICETYPE || "",
                    PRICEPREM: oRow.PRICEPREM || "",
                    COSTCURR: oRow.COSTCURR || "",
                    COSTUOM: oRow.COSTUOM || "",
                    BASED_ON_QTY: oRow.BASED_ON_QTY || "",
                    COST_STATUS: oRow.COST_STATUS || "",
                    PRICING_PRECISION: oRow.PRICING_PRECISION || "",
                    OPERATOR: oRow.OPERATOR || "",
                    SETTLEMENT_CURR: oRow.SETTLEMENT_CURR || "",
                    COMPANY: oRow.COMPANY || "",
                    PAYMENT: oRow.PAYMENT || "",
                    PAYMENT_DATE: oRow.PAYMENT_DATE || ""
                };
            });

            console.log("Payload to save:", aPayload);
            aData.forEach(function (oRow) {
                oRow.isRowEditable = false;
            });
            ocostModel.setProperty("/", aData);

            this.byId("toggleSaveBtn").setEnabled(false);

            sap.m.MessageToast.show("Data saved successfully!");
        },
        onAddDialog: function (oEvent) {
            var oButton = oEvent.getSource();
            var sFieldName = oButton.data("fieldName");
            var sModelPath = oButton.data("modelPath"); 
            var sIdField = oButton.data("fieldId");
            var sNameField = oButton.data("fieldActName");
            var sStatusField = oButton.data("fieldStatus");

            var sIdKey = oButton.data("idKey");
            var sNameKey = oButton.data("nameKey");
            var sStatusKey = oButton.data("statusKey");

            var sIdPlaceholder = "Enter " + sIdField;
            var sNamePlaceholder = "Enter " + sNameField;
            var sStatusPlaceholder = "Enter " + sStatusField;

            if (!this.oDefaultDialog) {
                this._oIdInput = new sap.m.Input(this.createId("idInput"), { placeholder: sIdPlaceholder });
                this._oNameInput = new sap.m.Input(this.createId("nameInput"), { placeholder: sNamePlaceholder });
                this._oStatusInput = new sap.m.Input(this.createId("statusInput"), { placeholder: sStatusPlaceholder });

                this.oDefaultDialog = new sap.m.Dialog({
                    title: sFieldName,
                    content: new sap.m.VBox({
                        items: [
                            new sap.m.Label({ text: sIdField }),
                            this._oIdInput,
                            new sap.m.Label({ text: sNameField }),
                            this._oNameInput,
                            new sap.m.Label({ text: sStatusField }),
                            this._oStatusInput
                        ]
                    }).addStyleClass("sapUiSmallMargin"),
                    beginButton: new sap.m.Button({
                        type: sap.m.ButtonType.Emphasized,
                        text: "OK",
                        press: function () {
                            var bValid = true;

                            [this._oIdInput, this._oNameInput, this._oStatusInput].forEach(function(oInput) {
                                oInput.setValueState("None");
                            });

                            var sId = this._oIdInput.getValue().trim();
                            var sName = this._oNameInput.getValue().trim();
                            var sStatus = this._oStatusInput.getValue().trim();

                            if (!sId) { this._oIdInput.setValueState("Error"); this._oIdInput.setValueStateText("Please enter " + sIdField); bValid = false; }
                            if (!sName) { this._oNameInput.setValueState("Error"); this._oNameInput.setValueStateText("Please enter " + sNameField); bValid = false; }
                            if (!sStatus) { this._oStatusInput.setValueState("Error"); this._oStatusInput.setValueStateText("Please enter " + sStatusField); bValid = false; }

                            if (!bValid) return;

                            if (sModelPath) {
                                var oModel = this.getOwnerComponent().getModel("s4HanaModel"); 
                                var oPayload = {};
                                oPayload[sIdKey] = sId;
                                oPayload[sNameKey] = sName;
                                oPayload[sStatusKey] = sStatus;

                                oModel.create(`/${sModelPath}`, oPayload, {
                                    success: function () {
                                        sap.m.MessageToast.show(sFieldName + " saved successfully!");
                                    },
                                    error: function (oError) {
                                        sap.m.MessageToast.show("Error saving " + sFieldName);
                                        console.error(oError);
                                    }
                                });
                            }

                            this.oDefaultDialog.close();
                        }.bind(this)
                    }),
                    endButton: new sap.m.Button({
                        text: "Cancel",
                        press: function () { this.oDefaultDialog.close(); }.bind(this)
                    })
                });

                this.getView().addDependent(this.oDefaultDialog);
            } else {
                this.oDefaultDialog.setTitle(sFieldName);
                this._oIdInput.setPlaceholder(sIdPlaceholder).setValue("").setValueState("None");
                this._oNameInput.setPlaceholder(sNamePlaceholder).setValue("").setValueState("None");
                this._oStatusInput.setPlaceholder(sStatusPlaceholder).setValue("").setValueState("None");
            }

            this.oDefaultDialog.open();
        }

    });
});