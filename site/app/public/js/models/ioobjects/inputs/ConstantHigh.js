var DEFAULT_SIZE = require("../../../libraries/Constants").DEFAULT_SIZE;

var IOObject = require("../../IOObject");

class ConstantHigh extends IOObject {
    constructor(context, x, y) {
        super(context, x, y, DEFAULT_SIZE, DEFAULT_SIZE, Images["constHigh.svg"], false, 0, 1);
        super.activate(true);
    }
    getDisplayName() {
        return "Constant High";
    }
}
ConstantHigh.getXMLName = function() { return "consthigh"; }

module.exports = ConstantHigh;

// Requirements
var Images   = require("../../../libraries/Images");

// 

