var Module = require("../../libraries/popup/Module");

class RedoModule extends Module {
    constructor(parent, divName) {
        super(parent, divName);
    }
    onShow() {
        this.setDisabled(getCurrentContext().designer.history.redoStack.length == 0);
    }
    onClick() {
        this.parent.hide();
        getCurrentContext().designer.history.redo();
    }
}

module.exports = RedoModule;