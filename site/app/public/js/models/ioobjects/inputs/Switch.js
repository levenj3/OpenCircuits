var DEFAULT_SIZE = require("../../../libraries/Constants").DEFAULT_SIZE;

var IOObject = require("../../IOObject");

class Switch extends IOObject {
    constructor(context, x, y) {
        super(context, x, y, 60*Images["switchUp.svg"].ratio, 60, Images["switchUp.svg"], true, 0, 1, 77*Images["switchUp.svg"].ratio, 77);
    }
    activate(on) {
        super.activate(on);
        this.img = Images[this.isOn ? "switchDown.svg" : "switchUp.svg"];
    }
    click() {
        super.click();
        this.activate(!this.isOn);
    }
    getDisplayName() {
        return "Switch";
    }
    writeTo(node) {
        var switchNode = super.writeTo(node);
        createTextElement(switchNode, "isOn", this.outputs[0].isOn);
        return switchNode;
    }
}
Switch.getXMLName = function() { return "switch"; }

module.exports = Switch;

// Requirements
var Images   = require("../../../libraries/Images");


var createTextElement = require("../../../controllers/Exporter").createTextElement;
// 

