// Requirements
var Module = require("../../libraries/popup/Module");

var getCurrentContext = require("../../libraries/Context").getCurrentContext;
//

class UndoModule extends Module {
    constructor(parent, divName) {
        super(parent, divName);
    }
    onShow() {
        this.setDisabled(getCurrentContext().designer.history.undoStack.length == 0);
    }
    onClick() {
        this.parent.hide();
        getCurrentContext().designer.history.undo();
    }
}

module.exports = UndoModule;