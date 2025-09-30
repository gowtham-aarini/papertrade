/*global QUnit*/

sap.ui.define([
	"hmel/com/transfercargoapp/controller/TransferView.controller"
], function (Controller) {
	"use strict";

	QUnit.module("TransferView Controller");

	QUnit.test("I should test the TransferView controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
