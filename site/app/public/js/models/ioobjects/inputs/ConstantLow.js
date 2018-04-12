var DEFAULT_SIZE = require("../../../libraries/Constants").DEFAULT_SIZE;

var IOObject = require("../../IOObject");

class ConstantLow extends IOObject {
    constructor(context, x, y) {
        super(context, x, y, DEFAULT_SIZE, DEFAULT_SIZE, Images["constLow.svg"], false, 0, 1);
        super.activate(false);
    }
    getDisplayName() {
        return "Constant Low";
    }
}
ConstantLow.getXMLName = function() { return "constlow"; }

module.exports = ConstantLow;

// Requirements
var Images   = require("../../../libraries/Images");
var Importer = require("../../../controllers/Importer");
// 

Importer.types.push(ConstantLow);