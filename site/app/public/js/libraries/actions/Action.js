class Action {
    constructor() {
        this.context = getCurrentContext();
        // Anytime an action is performed, user should need to save
        setSaved(false);
    }
    undo() {
    }
    redo() {
    }
}

module.exports = Action;

// Requirements
var getCurrentContext = require("../Context").getCurrentContext;
var setSaved          = require("../Context").setSaved;
// 