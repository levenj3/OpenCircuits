var Module = require("../../libraries/popup/Module");

class PasteModule extends Module {
    constructor(parent, divName) {
        super(parent, divName);
    }
    onShow() {
        this.setDisabled(false);
    }
    onClick() {
        this.parent.hide();
        document.execCommand("copy");
    }
}

module.exports = PasteModule;