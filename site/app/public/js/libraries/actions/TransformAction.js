// Requirements
var Action         = require("./Action");
var GroupAction    = require("./GroupAction");
//

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
}

module.exports = TransformAction;
