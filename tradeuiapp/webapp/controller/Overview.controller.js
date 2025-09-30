sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    'sap/m/p13n/Engine',
	'sap/m/p13n/SelectionController',
	'sap/m/p13n/SortController',
	'sap/m/p13n/GroupController',
	'sap/m/p13n/MetadataHelper',
	'sap/ui/model/Sorter',
	'sap/ui/core/library',
    'sap/ui/model/Filter',
	'sap/m/table/ColumnWidthController',
    'sap/ui/comp/smartvariants/PersonalizableInfo'
], (Controller, JSONModel, Engine, SelectionController, SortController, GroupController, MetadataHelper, Sorter, CoreLibrary, Filter, ColumnWidthController,PersonalizableInfo) => {
    "use strict";

    return Controller.extend("hmel.com.tradeuiapp.controller.Overview", {
        onInit() {
            this.oFilterBar = this.byId("tradeFilterBar");
			this.oTable = this.byId("dashboardTable");
			this._variantMangement();
            this._registerForP13n(this.oTable);

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
			// this.tradeEntryFilter();
			this.getDraftData(oAppModel);
        },

		getDraftData: function () {
			var oAppModel = this.getOwnerComponent().getModel("appModel");
			var sTradeType = oAppModel.getProperty("/TradeType")
			// Prepare and set the template model
            var oDraftModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(oDraftModel, "draftModel");
			var oModel = this.getOwnerComponent().getModel();
            // Create a filter for TRADE TYPE and STATUS
            var sFilterUrl = `STATUS eq 'D'`;
			// Expand with filter
			var sFilterUrl = `tradeMain/TRADEID eq '${sTradeType}' and STATUS eq 'D'`;

			var sPath = `/TradeEntry?$expand=tradeMain&$filter=${encodeURIComponent(sFilterUrl)}`;
            var oContextBinding = oModel.bindContext(sPath, undefined, undefined);
            var oBusyDialog = new sap.m.BusyDialog();
            oBusyDialog.open();
            oContextBinding.requestObject().then(function (oData) {
                oBusyDialog.close();
                var tradeDetails = oData.value || [];
				oDraftModel.setProperty("/DraftTemplate", tradeDetails);
                oDraftModel.setProperty("/OriginalDraftTEMPLATE", tradeDetails);

            }.bind(this)).catch(function (oError) {
                oBusyDialog.close();
                console.error("Error fetching project data: ", oError);
            });
		},

		// tradeEntryFilter: function () {
		// 	var oTable = this.byId("dashboardTable");
		// 	var oBinding = oTable.getBinding("rows");
		// 	// Get TradeNo from your app model
		// 	var sTradeType = this.getOwnerComponent().getModel("appModel").getProperty("/TradeType");
		// 	if (oBinding) {
		// 		var oFilter = new sap.ui.model.Filter("tradeMain/TRADEID", sap.ui.model.FilterOperator.EQ, sTradeType);
		// 		oBinding.filter([oFilter]); // only filter UI data
		// 	} else {
		// 		oBinding.filter([]); // clear UI filter
		// 	}
		// },

		onAfterRendering: function () {
			var oTable = this.byId("dashboardTable");
			var oBinding = oTable.getBinding("rows"); // or "items" if sap.m.Table

			if (oBinding) {
				var sTradeType = this.getOwnerComponent().getModel("appModel").getProperty("/TradeType");
				var oFilter1 = new sap.ui.model.Filter("tradeMain/TRADEID", sap.ui.model.FilterOperator.EQ, sTradeType);
				var oFilter2 = new sap.ui.model.Filter("STATUS", sap.ui.model.FilterOperator.NE, "D");

				// combine with AND
				var oCombinedFilter = new sap.ui.model.Filter({
					filters: [oFilter1, oFilter2],
					and: true
				});

				oBinding.filter(oCombinedFilter, "Application");
			}
			this._bindTableWithVisibleColumnsOnly();			
		},

        _variantMangement: function(){
            this.applyData = this.applyData.bind(this);
			this.fetchData = this.fetchData.bind(this);
            this.getFiltersWithValues = this.getFiltersWithValues.bind(this);

			this.oSmartVariantManagement = this.byId("svm");
			this.oExpandedLabel = this.byId("expandedLabel");
            this.oSnappedLabel = this.byId("snappedLabel");

			this.oFilterBar.registerFetchData(this.fetchData);
            this.oFilterBar.registerApplyData(this.applyData);
            this.oFilterBar.registerGetFiltersWithValues(this.getFiltersWithValues);

			var oPersInfo = new PersonalizableInfo({
				type: "filterBar",
				keyName: "persistencyKey",
				dataSource: "",
				control: this.oFilterBar
			});
			this.oSmartVariantManagement.addPersonalizableControl(oPersInfo);
			this.oSmartVariantManagement.initialise(function () {}, this.oFilterBar);
        },
        fetchData: function () {
			var aData = [];

			this.oFilterBar.getAllFilterItems().forEach(function (oFilterItem) {
				var oControl = oFilterItem.getControl();
				var vValue = null;

				if (oControl) {
					if (oControl.getSelectedKeys) {
						vValue = oControl.getSelectedKeys();  
					} else if (oControl.getValue) {
						vValue = oControl.getValue() ? [oControl.getValue()] : []; 
					}
				}

				if (vValue && vValue.length > 0) {
					aData.push({
						type: "filter",
						fieldName: oFilterItem.getName(),
						groupName: oFilterItem.getGroupName(),
						fieldData: vValue
					});
				}
			});
			var aVisibleCols = this.oTable.getColumns().map(function (oCol) {
				return {
					type: "column",
					p13nKey: oCol.data("p13nKey"),
					visible: oCol.getVisible()
				};
			});

			return {
				filters: aData,
				columns: aVisibleCols
			};
		},
		applyData: function (oSavedData) {
			this.oFilterBar.getAllFilterItems().forEach(function (oFilterItem) {
				var oControl = oFilterItem.getControl();
				if (oControl) {
					if (oControl.setSelectedKeys) oControl.setSelectedKeys([]);
					else if (oControl.setValue) oControl.setValue("");
				}
			});

			this.oTable.getColumns().forEach(function (oCol) {
				oCol.setVisible(true);
			});

			if (!oSavedData) {
				this._bindTableWithVisibleColumnsOnly();
				this.oFilterBar.fireFilterChange();
				return;
			}
			if (oSavedData.filters && oSavedData.filters.length > 0) {
				oSavedData.filters.forEach(function (oDataObject) {
					var oControl = this.oFilterBar.determineControlByName(oDataObject.fieldName, oDataObject.groupName);
					if (oControl) {
						if (oControl.setSelectedKeys) oControl.setSelectedKeys(oDataObject.fieldData || []);
						else if (oControl.setValue && oDataObject.fieldData.length > 0) oControl.setValue(oDataObject.fieldData[0]);
					}
				}, this);
			}

			if (oSavedData.columns && oSavedData.columns.length > 0) {
				oSavedData.columns.forEach(function (oColData) {
					var oCol = this.oTable.getColumns().find(function (c) {
						return c.data("p13nKey") === oColData.p13nKey;
					});
					if (oCol) {
						oCol.setVisible(oColData.visible);
					}
				}, this);
			}

			this._bindTableWithVisibleColumnsOnly();
			this.oFilterBar.fireFilterChange();
		},
        onRowPress: function(oEvent) {
            // var oItem = oEvent.getParameter("listItem");
            // var oContext = oItem.getBindingContext();
            // var oData = oContext.getObject();

            var oItem = oEvent.getSource();  
            var oContext = oItem.getBindingContext();
            var oData = oContext.getObject();
			var oAppModel = this.getOwnerComponent().getModel("appModel");
			var tradeKey = oAppModel.getProperty("/TradeType")
            const oRouter = this.getOwnerComponent().getRouter();
			if (tradeKey === '1') {
				oRouter.navTo("RouteTradeView", {
					"tradeNumber": oData.TRADE_NO
				});
			} else if(tradeKey === '2') {
				oRouter.navTo("RoutePaperTrade", {
					"tradeNumber": oData.TRADE_NO
				});
			}
            
        },

		// onCreate: function () {
        //     const oRouter = this.getOwnerComponent().getRouter();
        //     oRouter.navTo("RouteTradeView", {
        //         "tradeNumber": "CREATE"
        //     });
		// },

		onCreate: function(oEvent) {
			if (!this._oPhyNewPopover) { 
				this._oPhyNewPopover = sap.ui.xmlfragment("hmel.com.tradeuiapp.fragments.PhyNew", this);
				this.getView().addDependent(this._oPhyNewPopover);
			}
			this._oPhyNewPopover.openBy(oEvent.getSource());
		},
		onActionPress: function (oEvent) {
			var sText = oEvent.getSource().getText();
			var sTradeType = this.getOwnerComponent().getModel("appModel").getProperty("/TradeType");
			var sFilterUrl = `tradeMain/TRADEID eq '${sTradeType}' and STATUS ne 'D'`;

			if (sText === "Lift from Term") {
				if (!this._oLiftDialog) {
					this._oLiftDialog = new sap.m.Dialog({
						title: "Lift from Term",
						content: [
							new sap.m.VBox({
								items: [
									new sap.m.Label({ text: "Trade No :" }),
									new sap.m.ComboBox("tradeNoCombo", {
										placeholder: "Select Trade No",
										width: "20rem",
										items: {
											path: "/TradeEntry",
											parameters: {
												$expand: "tradeMain",
												$filter: `tradeMain/TRADEID eq '${sTradeType}' and STATUS ne 'D'`
											},
											template: new sap.ui.core.ListItem({
												key: "{TRADE_NO}",
												text: "{TRADE_NO}"
											}),
											templateShareable: false
										}
									}).addStyleClass("sapUiSmallMarginTop")
								]
							}).addStyleClass("sapUiSmallMargin")
						],
						beginButton: new sap.m.Button({
							text: "OK",
							press: function () {
								var sTradeNo = sap.ui.getCore().byId("tradeNoCombo").getSelectedKey();
								if (sTradeNo) {
									this._oLiftDialog.close();
									var oRouter = this.getOwnerComponent().getRouter();
									oRouter.navTo("RouteTradeView", {
										tradeNumber: sTradeNo
									});
								} else {
									sap.m.MessageToast.show("Please select a Trade No");
								}
							}.bind(this)
						}),
						endButton: new sap.m.Button({
							text: "Cancel",
							press: function () {
								this._oLiftDialog.close();
							}.bind(this)
						})
					});
					this.getView().addDependent(this._oLiftDialog);
				}
				this._oLiftDialog.open();

			} else {
				var oRouter = this.getOwnerComponent().getRouter();
				oRouter.navTo("RouteTradeView", {
					"tradeNumber": "CREATE"
				});
			}
		},

		onShowDraftPressed: function (oEvent) {
			// Create an instance of the popover
			if (!this._oPopover) {
				this._oPopover = sap.ui.xmlfragment("hmel.com.tradeuiapp.fragments.DraftSheet", this);
				this.getView().addDependent(this._oPopover);
			}

			// Calculate the position of the popover
			this._oPopover.openBy(oEvent.getSource());
		},

        _registerForP13n: function (oTable) {
            this.oMetadataHelper = new MetadataHelper(
                oTable.getColumns().map(function (oCol) {
                    return {
                        key: oCol.data("p13nKey"),      
                        label: oCol.getLabel().getText(), 
                        path: oCol.getSortProperty()    
                    };
                })
            );

            Engine.getInstance().register(oTable, {
                helper: this.oMetadataHelper,
                controller: {
                    Columns: new SelectionController({
                        targetAggregation: "columns",
                        control: oTable
                    })
                }
            });

            Engine.getInstance().attachStateChange(this.handleStateChange, this);
        },

		handleStateChange: function(oEvt) {
			const oTable = this.byId("dashboardTable");
			const oState = oEvt.getParameter("state");

			if (!oState) {
				return;
			}

			oTable.getColumns().forEach(function(oColumn) {

				const sKey = this._getKey(oColumn);
				// const sColumnWidth = oState.ColumnWidth[sKey];

				// oColumn.setWidth(sColumnWidth || this._mIntialWidth[sKey]);

				oColumn.setVisible(false);
				oColumn.setSortOrder(CoreLibrary.SortOrder.None);
			}.bind(this));

			oState.Columns.forEach(function(oProp, iIndex) {
				const oCol = this.byId("dashboardTable").getColumns().find((oColumn) => oColumn.data("p13nKey") === oProp.key);
				oCol.setVisible(true);
				oTable.removeColumn(oCol);
				oTable.insertColumn(oCol, iIndex);
			}.bind(this));
		},

        _getKey: function(oControl) {
			return oControl.data("p13nKey");
		},

        openPersoDialog: function(oEvt) {
			const oTable = this.byId("dashboardTable");

			Engine.getInstance().show(oTable, ["Columns"], {
				contentHeight: "35rem",
				contentWidth: "32rem",
				source: oEvt.getSource()
			});
		},
        getFiltersWithValues: function () {
			var aFiltersWithValue = this.oFilterBar.getFilterGroupItems().reduce(function (aResult, oFilterGroupItem) {
				var oControl = oFilterGroupItem.getControl();

				if (oControl && oControl.getSelectedKeys && oControl.getSelectedKeys().length > 0) {
					aResult.push(oFilterGroupItem);
				}

				return aResult;
			}, []);

			return aFiltersWithValue;
		},
        getFormattedSummaryText: function() {
			var aFiltersWithValues = this.oFilterBar.retrieveFiltersWithValues();

			if (aFiltersWithValues.length === 0) {
				return "No filters active";
			}

			if (aFiltersWithValues.length === 1) {
				return aFiltersWithValues.length + " filter active: " + aFiltersWithValues.join(", ");
			}

			return aFiltersWithValues.length + " filters active: " + aFiltersWithValues.join(", ");
		},

		getFormattedSummaryTextExpanded: function() {
			var aFiltersWithValues = this.oFilterBar.retrieveFiltersWithValues();

			if (aFiltersWithValues.length === 0) {
				return "No filters active";
			}

			var sText = aFiltersWithValues.length + " filters active",
				aNonVisibleFiltersWithValues = this.oFilterBar.retrieveNonVisibleFiltersWithValues();

			if (aFiltersWithValues.length === 1) {
				sText = aFiltersWithValues.length + " filter active";
			}

			if (aNonVisibleFiltersWithValues && aNonVisibleFiltersWithValues.length > 0) {
				sText += " (" + aNonVisibleFiltersWithValues.length + " hidden)";
			}

			return sText;
		},
        onSelectionChange: function () {
			this.oSmartVariantManagement.currentVariantSetModified(true);
			this.oFilterBar.fireFilterChange();
		},
        
        onSearch: function () {
            var aTableFilters = this.oFilterBar.getFilterGroupItems().reduce(function (aResult, oFilterGroupItem) {
            var oControl = oFilterGroupItem.getControl();

			if (oControl) {
				// Case 1: MultiComboBox (has getSelectedKeys)
				if (oControl.getSelectedKeys && oControl.getSelectedKeys().length > 0) {
					var aFilters = oControl.getSelectedKeys().map(function (sSelectedKey) {
						return new sap.ui.model.Filter({
							path: oFilterGroupItem.getName(),
							operator: sap.ui.model.FilterOperator.EQ,
							value1: sSelectedKey
						});
					});

					aResult.push(new sap.ui.model.Filter({
						filters: aFilters,
						and: false
					}));
				}

				// Case 2: Input field (has getValue)
				if (oControl.getValue && oControl.getValue().trim() !== "") {
					aResult.push(new sap.ui.model.Filter({
						path: oFilterGroupItem.getName(), 
						operator: sap.ui.model.FilterOperator.EQ,
						value1: oControl.getValue().trim()
					}));
				}
			 } 

			  return aResult;
		    }, []);

			var oAppModel = this.getOwnerComponent().getModel("appModel");
			var sTradeType = oAppModel.getProperty("/TradeType");

			if (sTradeType) {
				aTableFilters.push(new sap.ui.model.Filter({
					path: 'tradeMain/TRADEID',
					operator: sap.ui.model.FilterOperator.EQ,
					value1: sTradeType
				}));
			}

			aTableFilters.push(new sap.ui.model.Filter({
				path: 'STATUS',
				operator: sap.ui.model.FilterOperator.NE,
				value1: 'D'
			}));

			// this._bindTableWithVisibleColumnsOnly();
			var oBinding = this.oTable.getBinding("rows");
			if (oBinding) {
				oBinding.filter(aTableFilters, "Application");
			} else {
				console.error("No rows binding found on the table.");
			}

			this.oTable.setShowOverlay(false);
		},
		
        onFilterChange: function () {
			this._updateLabelsAndTable();
		},

		onAfterVariantLoad: function () {
			this._updateLabelsAndTable();
			this._bindTableWithVisibleColumnsOnly();
		},
	    _updateLabelsAndTable: function () {
			if (this.oExpandedLabel && this.oSnappedLabel) {
				this.oExpandedLabel.setText(this.getFormattedSummaryTextExpanded());
				this.oSnappedLabel.setText(this.getFormattedSummaryText());
			}
			this.oTable.setShowOverlay(true);
		},

		onColumnHeaderItemPress: function(oEvt) {
			const oTable = this.byId("dashboardTable");
			const sPanel = oEvt.getSource().getIcon().indexOf("sort") >= 0 ? "Sorter" : "Columns";

			Engine.getInstance().show(oTable, [sPanel], {
				contentHeight: "35rem",
				contentWidth: "32rem",
				source: oTable
			});
		},

		_bindTableWithVisibleColumnsOnly: function () {
			var oTable = this.oTable;
			var oFilterBar = this.oFilterBar;
			if (!oTable) return;

			var mFieldToExpand = this.getOwnerComponent().getModel("fieldExpandModel").getData();

			var aSelect = [];
			var aExpand = [];

			// Columns
			oTable.getColumns().forEach(function (oCol) {
				if (oCol.getVisible()) {
					var sKey = oCol.data("p13nKey");
					if (mFieldToExpand[sKey]) {
						aExpand.push(mFieldToExpand[sKey]);
					}
					aSelect.push(sKey); // root or navigation field
				}
			});

			// Filters
			if (oFilterBar) {
				oFilterBar.getFilterGroupItems().forEach(function (oItem) {
					var oControl = oItem.getControl();
					if (!oControl) return;

					var sField = oItem.getName();
					var sRootField = sField.split("/")[0];

					if ((oControl.getSelectedKeys && oControl.getSelectedKeys().length > 0) ||
						(oControl.getValue && oControl.getValue().trim() !== "")) {
						if (mFieldToExpand[sRootField]) {
							aExpand.push(mFieldToExpand[sRootField]);
						}
						aSelect.push(sField);
					}
				});
			}

			aExpand = Array.from(new Set(aExpand));
			aSelect = Array.from(new Set(aSelect));

			var oBinding = oTable.getBinding("rows");
			if (oBinding) {
				oBinding.changeParameters({
					"$expand": aExpand.join(","),
					"$select": aSelect.join(","),
					"$count": true
				});
				oBinding.refresh();
			}
		},

		onSearchTrade: function (oEvent) {
			const sQuery = oEvent.getParameter("value").toLowerCase();
			const oDraftModel = this.getView().getModel("draftModel");
			let aOriginalData = oDraftModel.getProperty("/OriginalDraftTEMPLATE");
			if (!aOriginalData || !Array.isArray(aOriginalData)) {
				console.error("Model data not found or invalid!");
				return;
			}

			let aFilteredData = aOriginalData;

			if (sQuery) {
				aFilteredData = aOriginalData.filter((oItem) => {
					return oItem.TRADE_NO && oItem.TRADE_NO.toLowerCase().includes(sQuery);
				});
			}
			oDraftModel.setProperty("/DraftTemplate", aFilteredData);
		},

		onTemplatePress: function (oEvent) {
			// get the pressed list item
			var oItem = oEvent.getSource();
			// get binding context from draftModel
			var oCtx = oItem.getBindingContext("draftModel");
			// get full object of the pressed item
			var oData = oCtx.getObject();
			// retrieve ID (assuming your entity has "ID" field)
			var sId = oData.TRADE_NO;
			var oAppModel = this.getOwnerComponent().getModel("appModel");
			var tradeKey = oAppModel.getProperty("/TradeType")
            const oRouter = this.getOwnerComponent().getRouter();
			if (tradeKey === '1') {
				oRouter.navTo("RouteTradeView", {
					"tradeNumber": sId
				});
			} else if(tradeKey === '2') {
				oRouter.navTo("RoutePaperTrade", {
					"tradeNumber": oData.TRADE_NO
				});
			}
		}






    });
});