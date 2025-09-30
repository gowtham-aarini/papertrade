/*global QUnit*/

sap.ui.define([
	"hmel/com/charteringapp/controller/Dashboard.controller"
], function (Controller) {
	"use strict";

	QUnit.module("Dashboard Controller");

	QUnit.test("I should test the Dashboard controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
