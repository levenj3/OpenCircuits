var IOObject = require("../../IOObject");

class Clock extends IOObject {
    constructor(context, x, y) {
        super(context, x, y, 60, 60/Images["clock.svg"].ratio, Images["clock.svg"], false, 0, 1);
        this.frequency = 1000;
        setTimeout(() => this.tick(), this.frequency);
    }
    tick() {
        this.activate(!this.isOn);
        setTimeout(() => this.tick(), this.frequency);
    }
    activate(on) {
        super.activate(on);
        this.img = (on ? Images["clockOn.svg"] : Images["clock.svg"]);
        render();
    }
    getDisplayName() {
        return "Clock";
    }
}
Clock.getXMLName = function() { return "clock"; }

module.exports = Clock;

// Requirements
var Images   = require("../../../libraries/Images");

// 

