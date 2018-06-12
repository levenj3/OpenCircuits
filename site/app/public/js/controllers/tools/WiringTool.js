var WiringTool = (function() {
    return {
        isActive: false,
        clickOPort: false,
        wire: undefined,
        activate: function(object, context) {
            Tool.setCurrent(this);
            
            console.log(object);

            this.wire = new Wire(context);
            this.clickOPort = (object instanceof OPort);
            var success;
            if (this.clickOPort)
                success = object.connect(this.wire);
            else
                success = this.wire.connect(object);
            if (success) {
                this.onMouseMove();
                context.addWire(this.wire);
            } else { // Illegal connection (ex. two inputs to IPort)
                SelectionTool.activate();
            }
        },
        deactivate: function() {
            this.wire = undefined;
        },
        onKeyDown: function() {},
        onKeyUp: function() {
            if (code === ESC_KEY)  {
                this.removeWire(getCurrentContext().getWires());
                SelectionTool.activate();
                render();
            }
        },
        removeWire: function(wires) {
            var j;
            for (var j = 0; j < wires.length && wires[j] !== this.wire; j++);
            wires.splice(j, 1);
            if (this.clickOPort)
                this.wire.input.disconnect(this.wire);
            else
                this.wire.disconnect();
        },
        onKeyDown: function() {},
        onKeyUp: function() {},
        onMouseDown: function() {},
        onMouseMove: function() {
            if (this.clickOPort)
                this.wire.curve.update(this.wire.curve.p1, Input.getWorldMousePos(), this.wire.curve.c1, Input.getWorldMousePos());
            else
                this.wire.curve.update(Input.getWorldMousePos(), this.wire.curve.p2, Input.getWorldMousePos(), this.wire.curve.c2);
            return true;
        },
        onMouseUp: function() {},
        onClick: function() {
            var objects       = getCurrentContext().getObjects();
            var wires         = getCurrentContext().getWires();
            var worldMousePos = Input.getWorldMousePos();

            for (var i = 0; i < objects.length; i++) {
                var ii = -1;
                if (this.clickOPort && (ii = objects[i].iPortContains(worldMousePos)) !== -1) {
                    if (!this.wire.connect(objects[i].inputs[ii]))
                        this.removeWire(wires);
                }
                if (!this.clickOPort && (ii = objects[i].oPortContains(worldMousePos)) !== -1) {
                    if (!objects[i].outputs[ii].connect(this.wire))
                        this.removeWire(wires);
                }
                if (ii !== -1) {
                    var action = new PlaceWireAction(this.wire);
                    getCurrentContext().addAction(action);

                    SelectionTool.activate();
                    return true;
                }
             }

            this.removeWire(wires);
            SelectionTool.activate();
            return true;
        },
        draw: function() {}
    }
})();

module.exports = WiringTool;

// Requirements
var PlaceAction     = require("../../libraries/actions/PlaceAction");
var PlaceWireAction = require("../../libraries/actions/PlaceWireAction");
var Input           = require("../Input");
var Tool            = require("./Tool");
var SelectionTool   = require("./SelectionTool");
var Wire            = require("../../models/Wire");
var OPort           = require("../../models/OPort");

var getCurrentContext = require("../../libraries/Context").getCurrentContext;
var render            = require("../../libraries/RenderUtils").render;
// 