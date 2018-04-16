var DELETE_KEY = require("../../libraries/Constants").DELETE_KEY;
var ESC_KEY    = require("../../libraries/Constants").ESC_KEY;

var Popup             = require("../../libraries/popup/Popup");
var TitleModule       = require("./TitleModule");
var PositionXModule   = require("./PositionXModule");
var PositionYModule   = require("./PositionYModule");
var InputCountModule  = require("./InputCountModule");
var ColorPickerModule = require("./ColorPickerModule");
var ICButtonModule    = require("./ICButtonModule");
var BusButtonModule   = require("./BusButtonModule");

class SelectionPopup extends Popup {
    constructor() {
        super("popup");

        this.add(new TitleModule(this, "popup-name"));

        this.add(new PositionXModule(this, "popup-position-x"));
        this.add(new PositionYModule(this, "popup-position-y"));

        this.add(new InputCountModule(this, "popup-input-count", "popup-input-count-text"));

        this.add(new ColorPickerModule(this, "popup-color-picker", "popup-color-text"));

        this.add(new ICButtonModule(this, "popup-ic-button"));
        this.add(new BusButtonModule(this, "popup-bus-button"));
    }
    onKeyDown(code) {
        if (code === DELETE_KEY && !this.focused) {
            SelectionTool.removeSelections(true);
            return;
        }
        if (code === ESC_KEY && !this.hidden) {
            SelectionTool.deselectAll();
            render();
            return;
        }
    }
    onEnter() {
        this.blur();
    }
    update() {
        var selections = SelectionTool.selections;
        if (selections.length > 0) {
            this.show();
            this.onMove();
        } else {
            this.hide();
        }
    }
    onMove() {
        var camera = getCurrentContext().getCamera();
        if (SelectionTool.selections.length > 0) {
            SelectionTool.recalculateMidpoint();
            var pos = camera.getScreenPos(SelectionTool.midpoint);
            pos.y -= this.div.clientHeight/2;
            this.setPos(pos);
        }
    }
    onWheel() {
        this.onMove();
    }
}
var selectionpopup = new SelectionPopup();

module.exports = selectionpopup;

// Requirements
var SelectionTool = require("../tools/SelectionTool");

var getCurrentContext = require("../../libraries/Context").getCurrentContext;
// 