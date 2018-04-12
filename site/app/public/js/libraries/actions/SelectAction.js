var Action = require("./Action");

class SelectAction extends Action {
    constructor(obj, flip) {
        super();
        this.obj = obj;
        this.flip = flip;
    }
    undo() {
        if (this.flip)
            this.reselect();
        else
            this.deselect();
    }
    redo() {
        if (this.flip)
            this.deselect();
        else
            this.reselect();
    }
    reselect() {
        SelectionTool.select([this.obj]);
    }
    deselect() {
        SelectionTool.deselect([this.obj]);
    }
}

module.exports = SelectAction;

// Requirements
var SelectionTool = require("../../controllers/tools/SelectionTool");
// 