var Context         = require("../libraries/Context");
// var CircuitDesigner = require("../views/CircuitDesigner");

var ICDesigner = (function() {
    var canvas        = document.getElementById("designer-canvas");
    var confirmButton = document.getElementById("ic-confirmbutton");
    var cancelButton  = document.getElementById("ic-cancelbutton");

    if (confirmButton)
        confirmButton.onclick = () => { ICDesigner.confirm(); };
    if (cancelButton)
        cancelButton.onclick  = () => { ICDesigner.cancel(); };

    var designer;

    var ic, data;
    
    var drag = false;
    var dragObj, dragEdge;
    
    return {
        context: undefined,
        hidden: true,
        setup: function() {
            designer = new CircuitDesigner(canvas, 0.84, 0.76);
            this.context = new Context(designer);
        },
        confirm: function() {
            if (ic != undefined) {
                ICData.add(this.data);
                var out = this.ic.copy();
                out.setContext(context);
                getMainContext().getDesigner().addObject(out);
                this.hide();
            }
        },
        cancel: function() {
            if (ic != undefined) {
                this.hide();
            }
        },
        show: function(selections) {
            Context.setCurrentContext(this.context);
            
            this.hidden = false;
            this.canvas.style.visibility = "visible";
            this.confirmButton.style.visibility = "visible";
            this.cancelButton.style.visibility = "visible";
            popup.hide();

            this.data = ICData.create(selections);
            this.ic = new IC(this.context, this.data, 0, 0);

            this.designer.addObject(this.ic);
            SelectionTool.deselect(selections);
            this.context.getCamera().zoom = 0.5 + 0.1*(this.ic.transform.size.x-50)/20;
            render();
        },
        hide() {
            setCurrentContext(getMainContext());
            this.hidden = true;
            canvas.style.visibility = "hidden";
            confirmButton.style.visibility = "hidden";
            cancelButton.style.visibility = "hidden";
            if (ic != undefined) {
                ic.remove();
                ic = undefined;
                data = undefined;
            }
            // render();
        },
        onMouseDown() {
            if (this.ic == undefined)
                return false;

            var worldMousePos = Input.getWorldMousePos();

            var inputs = this.ic.inputs;
            for (var i = 0; i < inputs.length; i++) {
                var inp = inputs[i];
                if (inp.sContains(worldMousePos)) {
                    this.drag = true;
                    this.dragObj = this.data.iports[i];
                    return false;
                }
            }
            var outputs = this.ic.outputs;
            for (var i = 0; i < outputs.length; i++) {
                var out = outputs[i];
                if (out.sContains(worldMousePos)) {
                    this.drag = true;
                    this.dragObj = this.data.oports[i];
                    return false;
                }
            }

            var pos = this.ic.getPos();
            var size = this.ic.getSize();
            var transform1 = new Transform(pos, size.scale(1.1), 0, this.context.getCamera());
            var transform2 = new Transform(pos, size.scale(0.9), 0, this.context.getCamera());
            if (RectContains(transform1, worldMousePos) && !RectContains(transform2, worldMousePos)) {
                if (worldMousePos.y < pos.y+size.y/2-4 && worldMousePos.y > pos.y-size.y/2+4) {
                    this.dragEdge = "horizontal";
                } else {
                    this.dragEdge = "vertical";
                }
            }
        },
        onMouseUp() {
            if (this.ic == undefined)
                return false;

            this.drag = false;
            this.dragObj = undefined;
            this.dragEdge = undefined;
        },
        onMouseMove() {
            if (this.ic == undefined)
                return false;

            var worldMousePos = Input.getWorldMousePos();

            if (this.drag) {
                var size = this.ic.getSize();
                var p = GetNearestPointOnRect(V(-size.x/2, -size.y/2), V(size.x/2, size.y/2), worldMousePos);
                var v1 = p.sub(worldMousePos).normalize().scale(size.scale(0.5)).add(p);
                var v2 = p.sub(worldMousePos).normalize().scale(size.scale(0.5).sub(V(IO_PORT_LENGTH+size.x/2-25, IO_PORT_LENGTH+size.y/2-25))).add(p);
                this.dragObj.setOrigin(v1);
                this.dragObj.setTarget(v2);

                this.ic.update();

                return true;
            }
            if (this.dragEdge != undefined) {
                if (this.dragEdge === "horizontal") {
                    this.data.transform.setWidth(Math.abs(2*worldMousePos.x));
                } else {
                    this.data.transform.setHeight(Math.abs(2*worldMousePos.y));
                }
                this.data.recalculatePorts();

                this.ic.update();

                return true;
            }
        },
        onClick() {
        }
    };
})();
// ItemNavController.toggle();

module.exports = ICDesigner;

// Requirements
var V               = require("../libraries/math/Vector").V;
var Transform       = require("../libraries/math/Transform");
var Context         = require("../libraries/Context");
var Input           = require("./Input");
var SelectionTool   = require("./tools/SelectionTool");
var ICData          = require("../models/ioobjects/other/ICData");
var IC              = require("../models/ioobjects/other/IC");
var CircuitDesigner = require("../views/CircuitDesigner");

var RectContains               = require("../libraries/math/MathUtils").RectContains;
var GetNearestPointOnRect      = require("../libraries/math/MathUtils").GetNearestPointOnRect;
var setCurrentContext          = require("../libraries/Context").setCurrentContext;
var getCurrentContext          = require("../libraries/Context").getCurrentContext;
var getMainContext             = require("../libraries/Context").getMainContext;
var render                     = require("../libraries/RenderUtils").render;
//
