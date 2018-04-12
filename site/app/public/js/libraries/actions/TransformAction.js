var Action = require("./Action");

class TransformAction extends Action {
    constructor(obj, t0, t1) {
        super();
        this.obj = obj;
        this.t0 = t0;
        this.t1 = t1;
    }
    undo() {
        this.obj.setTransform(this.t0);
        this.updatePopup();
    }
    redo() {
        this.obj.setTransform(this.t1);
        this.updatePopup();
    }
    updatePopup() {
        if (this.obj.selected) {
            SelectionTool.recalculateMidpoint();
            SelectionPopup.onMove();
        }
    }
}

module.exports = TransformAction;

// Requirements
var SelectionTool  = require("../../controllers/tools/SelectionTool");
var SelectionPopup = require("../../controllers/selectionpopup/SelectionPopup");
// 