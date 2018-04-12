var GRID_SIZE              = require("../libraries/Constants").GRID_SIZE;
var ROTATION_CIRCLE_R2     = require("../libraries/Utils").ROTATION_CIRCLE_R2;
var ROTATION_CIRCLE_R1     = require("../libraries/Utils").ROTATION_CIRCLE_R1;
var ROTATION_CIRCLE_RADIUS = require("../libraries/Constants").ROTATION_CIRCLE_RADIUS;

var V = require("../libraries/math/Vector").V;

var TransformController = (function() {
    var pressedObj = undefined;
    
    var isDragging = false;
    var isRotating = false;
    
    var dragPos = V(0,0);
    var dragObjects = [];
    
    var startAngle = 0;
    var prevAngle = 0
    var realAngles = [];
    var rotateObjects = [];
    
    var startTransforms = []; // For undoing
    
    var drag = function(pos, shift) {
        var dPos = V(pos).sub(pressedObj.getPos()).sub(dragPos);
        for (var i = 0; i < dragObjects.length; i++) {
            var obj = dragObjects[i];
            var newPos = obj.getPos().add(dPos);
            if (shift) {
                newPos = V(Math.floor(newPos.x/GRID_SIZE+0.5)*GRID_SIZE,
                           Math.floor(newPos.y/GRID_SIZE+0.5)*GRID_SIZE);
            }
            obj.setPos(newPos);
        }
        SelectionTool.recalculateMidpoint();
    }
    var rotate = function(pos, shift) {
        var origin = SelectionTool.midpoint;
        var dAngle = Math.atan2(pos.y - origin.y, pos.x - origin.x) - prevAngle;
        for (var i = 0; i < rotateObjects.length; i++) {
            var newAngle = realAngles[i] + dAngle;
            realAngles[i] = newAngle;
            if (shift)
                newAngle = Math.floor(newAngle/(Math.PI/4))*Math.PI/4;
            rotateObjects[i].setRotationAbout(newAngle, origin);
        }
        prevAngle = dAngle + prevAngle;
    }

    return {
        startDrag: function(obj, worldMousePos) {
            if (!obj.selected) {
                SelectionTool.deselectAll();
                SelectionTool.select([obj]);
            }
            dragObjects = SelectionTool.selections;
            
            startTransforms = [];
            for (var i = 0; i < dragObjects.length; i++) {
                if (!dragObjects[i].transform)
                    return true;
                startTransforms[i] = dragObjects[i].transform.copy();
            }
            isDragging = true;
            dragPos = worldMousePos.copy().sub(obj.getPos());
            pressedObj = obj;
            SelectionPopup.hide();
            return true;
        },
        startRotation(objs, pos) {
            rotateObjects = objs;
            realAngles = [];
            startTransforms = [];
            for (var i = 0; i < rotateObjects.length; i++) {
                if (!rotateObjects[i].transform)
                    return true;
                realAngles[i] = rotateObjects[i].getAngle();
                startTransforms[i] = rotateObjects[i].transform.copy();
            }
            isRotating = true;
            startAngle = Math.atan2(pos.y-SelectionTool.midpoint.y, pos.x-SelectionTool.midpoint.x);
            prevAngle = startAngle;
            SelectionPopup.hide();
            return true;
        },
        onMouseDown: function() {
            var objects       = getCurrentContext().getObjects();
            var worldMousePos = Input.getWorldMousePos();

            // Check if rotation circle was pressed
            if (!isRotating && SelectionTool.selections.length > 0) {
                var d = worldMousePos.sub(SelectionTool.midpoint).len2();
                if (d <= ROTATION_CIRCLE_R2 && d >= ROTATION_CIRCLE_R1) {
                    return this.startRotation(SelectionTool.selections, worldMousePos);
                }
            }
            
            // Go through objects backwards since objects on top are in the back
            for (var i = objects.length-1; i >= 0; i--) {
                var obj = objects[i];

                // Check if object's selection box was pressed
                if (obj.contains(worldMousePos) || obj.sContains(worldMousePos)) {
                    pressedObj = obj;
                    return;
                }
            }
        },
        onMouseMove: function() {
            var objects       = getCurrentContext().getObjects();
            var worldMousePos = Input.getWorldMousePos();
            
            // Begin dragging
            if (!isDragging && pressedObj != undefined) {
                return this.startDrag(pressedObj, worldMousePos);
            }
            
            // Actually move the object(s)
            if (isDragging) {
                drag(worldMousePos, Input.getShiftKeyDown());
                return true;
            }
            if (isRotating) {
                rotate(worldMousePos, Input.getShiftKeyDown());
                return true;
            }
        },
        onMouseUp: function() {
            pressedObj = undefined;

            // Stop dragging
            if (isDragging) {
                // Add transform action
                getCurrentContext().addAction(CreateTransformAction(dragObjects, startTransforms));
                isDragging = false;
                return true;
            }

            // Stop rotating
            if (isRotating) {
                // ADd transform action
                getCurrentContext().addAction(CreateTransformAction(rotateObjects, startTransforms));
                isRotating = false;
                return true;
            }
        },
        onClick: function() {
        },
        draw: function(renderer) {
            // Draw rotation circle
            var camera = renderer.getCamera();
            var pos    = camera.getScreenPos(SelectionTool.midpoint);
            var r      = ROTATION_CIRCLE_RADIUS / camera.zoom;
            if (isRotating) {
                renderer.save();
                renderer.context.fillStyle = '#fff';
                renderer.context.strokeStyle = '#000'
                renderer.context.lineWidth = 5;
                renderer.context.globalAlpha = 0.4;
                renderer.context.beginPath();
                renderer.context.moveTo(pos.x, pos.y);
                var da = (prevAngle - startAngle) % (2*Math.PI);
                if (da < 0) da += 2*Math.PI;
                renderer.context.arc(pos.x, pos.y, r, startAngle, prevAngle, da > Math.PI);
                renderer.context.fill();
                renderer.context.closePath();
                renderer.restore();
            }
        }
    };
})();

module.exports = TransformController;

// Requirements
var Input          = require("./Input");
var SelectionTool  = require("./tools/SelectionTool");
var SelectionPopup = require("./selectionpopup/SelectionPopup");

var CreateTransformAction = require("../libraries/Utils").CreateTransformAction;
var getCurrentContext     = require("../libraries/Context").getCurrentContext;
// 