// Requirements
var Images   = require("../../../libraries/Images");
var Gate = require("../Gate");
// 

class BUFGate extends Gate {
    constructor(context, not, x, y) {
        super(context, not, x, y, Images["buffer.svg"]);
        this.maxInputs = 1;

        this.setInputAmount(1);
        this.activate(false);
    }
    activate(x) {
        var on = false;
        for (var i = 0; i < this.inputs.length; i++)
            on = this.inputs[i].isOn;
        super.activate(on);
    }
    getDisplayName() {
        return this.not ? "NOT Gate" : "Buffer Gate";
    }
}
BUFGate.getXMLName = function() { return "bufgate"; }

module.exports = BUFGate;