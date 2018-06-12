// Requirements
var DEFAULT_SIZE = require("../../../libraries/Constants").DEFAULT_SIZE;

var Images   = require("../../../libraries/Images");
var IOObject = require("../../IOObject");

var CircleContains = require("../../../libraries/math/MathUtils").CircleContains;
//

class Button extends IOObject {
    constructor(context, x, y) {
        super(context, x, y, DEFAULT_SIZE, DEFAULT_SIZE, Images["buttonUp.svg"], true, 0, 1, 60, 60);
    }
    press() {
        super.activate(true);
        this.img = Images["buttonDown.svg"];
    }
    release() {
        super.activate(false);
        this.img = Images["buttonUp.svg"];
    }
    contains(pos) {
        return CircleContains(this.transform, pos);
    }
    getDisplayName() {
        return "Button";
    }
}
Button.getXMLName = function() { return "button"; }

module.exports = Button;
