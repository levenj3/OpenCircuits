var Popup           = require("../../libraries/popup/Popup");
var CutModule       = require("./CutModule");
var CopyModule      = require("./CopyModule");
var PasteModule     = require("./PasteModule");
var SelectAllModule = require("./SelectAllModule");
var UndoModule      = require("./UndoModule");
var RedoModule      = require("./RedoModule");

class ContextMenu extends Popup {
    constructor() {
        super("context-menu");

        this.add(new CutModule(this, "context-menu-cut"));
        this.add(new CopyModule(this, "context-menu-copy"));
        this.add(new PasteModule(this, "context-menu-paste"));
        this.add(new SelectAllModule(this, "context-menu-select-all"))

        this.add(new UndoModule(this, "context-menu-undo"));
        this.add(new RedoModule(this, "context-menu-redo"))
    }
    onKeyDown(code) {
        if (code === ESC_KEY && !this.hidden) {
            this.hide();
            return;
        }
    }
    onShow() {
        super.onShow();

        var pos = Input.getRawMousePos();
        this.setPos(V(pos.x, pos.y));
    }
}
var contextmenu = new ContextMenu();

module.exports = contextmenu;

// Requirements
var Input = require("../Input");
// 