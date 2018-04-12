var ItemTool = (function() {
    return {
        isActive: false,
        item: undefined,
        activate: function(object, context) {
            // If already active, remove current item
            if (this.item != undefined)
                context.remove(this.item);

            Tool.setCurrent(this);
            this.item = object;
            context.addObject(this.item);
            this.onMouseMove();
        },
        deactivate: function() {
            this.item = undefined;
        },
        onKeyDown: function() {},
        onKeyUp: function() {},
        onMouseDown: function() {},
        onMouseMove: function() {
            this.item.setPos(Input.getWorldMousePos());
            return true;
        },
        onMouseUp: function() {},
        onClick: function() {
            this.item.setPos(Input.getWorldMousePos());
            var action = new PlaceAction(this.item);
            getCurrentContext().addAction(action);
            SelectionTool.activate();
            return true;
        },
        draw: function() {}
    }
})();

module.exports = ItemTool;

// Requirements
var PlaceAction   = require("../../libraries/actions/PlaceAction");
var Input         = require("../Input");
var Tool          = require("./Tool");
var SelectionTool = require("./SelectionTool");

var getCurrentContext = require("../../libraries/Context").getCurrentContext;
// 