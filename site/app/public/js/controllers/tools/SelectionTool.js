var A_KEY                     = require("../../libraries/Constants").A_KEY;
var ROTATION_CIRCLE_RADIUS    = require("../../libraries/Constants").ROTATION_CIRCLE_RADIUS;
var ROTATION_CIRCLE_THICKNESS = require("../../libraries/Constants").ROTATION_CIRCLE_THICKNESS;

var V = require("../../libraries/math/Vector").V;

var SelectionTool = (function() {
    return {
        isActive: false,
        selections: [],
        midpoint: V(0, 0),
        activate: function() {
            Tool.setCurrent(this);
        },
        deactivate: function() {},
        onKeyDown: function(code, input) {
            console.log(code);
            if (!ICDesigner.hidden)
                return false;

            if (code === A_KEY && Input.getModifierKeyDown()) {
                this.selectAll();
                return true;
            }
        },
        onKeyUp: function() {},
        onMouseDown: function() {
            var objects       = getCurrentContext().getObjects();
            var wires         = getCurrentContext().getWires();
            var worldMousePos = Input.getWorldMousePos();

            if (!ICDesigner.hidden)
                return false;

            // Go through objects backwards since objects on top are in the back
            for (var i = objects.length-1; i >= 0; i--) {
                var obj = objects[i];

                // Check if object was pressed
                if (obj.contains(worldMousePos)) {
                    if (obj.isPressable)
                        obj.press();
                    return true;
                }
                
                // Ignore if object's selection box was pressed
                if (obj.sContains(worldMousePos))
                    return;

                // Ignore if a port was pressed
                if (obj.oPortContains(worldMousePos) !== -1 ||
                        obj.iPortContains(worldMousePos) !== -1) {
                    return;
                }
            }
        },
        onMouseMove: function() {},
        onMouseUp: function() {
            var objects       = getCurrentContext().getObjects();
            var wires         = getCurrentContext().getWires();
            var worldMousePos = Input.getWorldMousePos();

            if (!ICDesigner.hidden)
                return false;

            SelectionPopup.update();
            
            for (var i = 0; i < objects.length; i++) {
                var obj = objects[i];

                // Release pressed object
                if (obj.isPressable && obj.isOn && !Input.isDragging()) {
                    obj.release();
                    return true;
                }
            }
        },
        onClick: function() {
            var objects       = getCurrentContext().getObjects();
            var wires         = getCurrentContext().getWires();
            var worldMousePos = Input.getWorldMousePos();

            console.log("uppy");
            console.log(objects);
            console.log(ICDesigner.hidden);
            console.log(Input.isDragging());

            if (!ICDesigner.hidden || Input.isDragging())
                return false;
                
            // Go through objects backwards since objects on top are in the back
            for (var i = objects.length-1; i >= 0; i--) {
                var obj = objects[i];

                // Check if object's selection box was clicked
                if (obj.sContains(worldMousePos)) {
                    if (!Input.getShiftKeyDown())
                        this.deselectAll(true);
                    this.select([obj], true);
                    return true;
                }
                
                console.log(obj);
                console.log(obj.contains(worldMousePos));

                // Check if object was clicked
                if (obj.contains(worldMousePos)) {
                    obj.click();
                    return true;
                }
            }

            // Didn't click on anything so deselect everything
            // And add a deselect action
            if (!Input.getShiftKeyDown() && this.selections.length > 0) {
                this.deselectAll(true);
                return true;
            }
        },
        select: function(objects, doAction) {
            if (objects.length === 0)
                return;
                
            var action = new GroupAction();
            for (var i = 0; i < objects.length; i++) {
                var obj = objects[i];
                if (obj.selected)
                    continue;
                obj.selected = true;
                this.selections.push(obj);
                this.sendToFront(obj);
                if (doAction)
                    action.add(new SelectAction(obj));
            }
            if (doAction)
                getCurrentContext().addAction(action);
            SelectionPopup.update();
            this.recalculateMidpoint();
        },
        deselect: function(objects, doAction) {
            if (objects.length === 0)
                return;
            
            var action = new GroupAction();
            for (var i = 0; i < objects.length; i++) {
                var obj = objects[i];
                if (!obj.selected) {
                    console.error("Can't deselect an unselected object! " + obj);
                    continue;
                }
                obj.selected = false;
                this.selections.splice(this.selections.indexOf(obj), 1);
                if (doAction)
                    action.add(new SelectAction(obj, true));
            }
            if (doAction)
                getCurrentContext().addAction(action);
            SelectionPopup.update();
            this.recalculateMidpoint();
        },
        selectAll: function() {
            this.deselectAll(true);
            this.select(getCurrentContext().getObjects(), true);
        },
        deselectAll: function(doAction) {
            // Copy selections array because just passing selections
            // causes it to get mutated mid-loop at causes weirdness
            var objects = [];
            for (var i = 0; i < this.selections.length; i++)
                objects.push(this.selections[i]);
            this.deselect(objects, doAction);
        },
        sendToFront: function(obj) {
            if (obj instanceof IOObject || obj instanceof Wire) {
                getCurrentContext().remove(obj);
                getCurrentContext().add(obj);
            }
        },
        recalculateMidpoint: function() {
            this.midpoint = V(0, 0);
            for (var i = 0; i < this.selections.length; i++)
                this.midpoint.translate(this.selections[i].getPos());
            this.midpoint = this.midpoint.scale(1. / this.selections.length);
        },
        draw: function(renderer) {
            var camera = renderer.getCamera();
            if (this.selections.length > 0 && !this.drag) {
                var pos = camera.getScreenPos(this.midpoint);
                var r = ROTATION_CIRCLE_RADIUS / camera.zoom;
                var br = ROTATION_CIRCLE_THICKNESS / camera.zoom;
                TransformController.draw(renderer);
                renderer.circle(pos.x, pos.y, r, undefined, '#ff0000', br, 0.5);
            }
            SelectionBox.draw(renderer);
        }
    }
})();
module.exports = SelectionTool;

// Requirements
var SelectAction        = require("../../libraries/actions/SelectAction");
var GroupAction         = require("../../libraries/actions/GroupAction");
var Input               = require("../Input");
var ICDesigner          = require("../ICDesigner");
var TransformController = require("../TransformController");
var SelectionBox        = require("../SelectionBox");
var SelectionPopup      = require("../selectionpopup/SelectionPopup");
var Tool                = require("./Tool");
var IOObject            = require("../../models/IOObject");
var Wire                = require("../../models/Wire");

var getCurrentContext = require("../../libraries/Context").getCurrentContext;
//