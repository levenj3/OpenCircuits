var Module        = require("../../libraries/popup/Module");
var SelectionTool = require("../tools/SelectionTool");

class CutModule extends Module {
    constructor(parent, divName) {
        super(parent, divName);
    }
    onShow() {
        this.setDisabled(SelectionTool.selections.length == 0);
    }
    onClick() {
        this.parent.hide();
        document.execCommand("cut");
    }
}

module.exports = CutModule;