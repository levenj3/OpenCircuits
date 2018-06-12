// Requirements
var PROPAGATION_TIME = require("./Constants").PROPAGATION_TIME;
//

var updateRequests = 0;
class Propagation {
    constructor(designer, sender, receiver, signal, update) {
        this.sender = sender;
        this.receiver = receiver;
        this.signal = signal;

        if (designer.updateRequests === 0) {
            designer.updateRequests++;
            setTimeout(update, PROPAGATION_TIME);
        }
    }
    send() {
        this.receiver.activate(this.signal);
    }
}

module.exports = Propagation;
