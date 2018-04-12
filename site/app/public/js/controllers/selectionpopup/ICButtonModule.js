var Module = require("../../libraries/popup/Module");

class ICButtonModule extends Module {
    constructor(parent, divName) {
        super(parent, divName);
    }
    onShow() {
        var count = 0;
        var selections = SelectionTool.selections;
        for (var i = 0; i < selections.length; i++) {
            if (selections[i] instanceof IOObject && !(selections[i] instanceof WirePort))
                count++;
        }
        this.setVisibility(count >= 2 ? "inherit" : "none");
    }
    onClick() {
        ICDesigner.show(SelectionTool.selections);
    }
}

module.exports = ICButtonModule;

// Requirements
var IOObject      = require("../../models/IOObject");
var WirePort      = require("../../models/WirePort");
var ICDesigner    = require("../ICDesigner");
var SelectionTool = require("../tools/SelectionTool");
// 