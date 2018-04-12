var Module        = require("../../libraries/popup/Module");
var SelectionTool = require("../tools/SelectionTool");

var render = require("../../views/Renderer").render;

class SelectAllModule extends Module {
    constructor(parent, divName) {
        super(parent, divName);
    }
    onShow() {
        this.setDisabled(false);
    }
    onClick() {
        this.parent.hide();
        SelectionTool.selectAll();
        render();
    }
}

module.exports = SelectAllModule;