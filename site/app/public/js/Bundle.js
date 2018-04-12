(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var Exporter = (function() {    
    var saveButton       = document.getElementById('save-button');
    var projectNameInput = document.getElementById("project-name");
    saveButton.onclick = () => { Exporter.saveFile(); };

    return {
        ROOT: undefined,
        saveFile: function() {
            var data = this.write(getCurrentContext());
            var projectName = projectNameInput.value;
            if (projectName === "Untitled Circuit*")
                projectName = "Untitled Circuit";
            var filename = projectName + ".circuit";

            var file = new Blob([data], {type: "text/plain"});
            if (window.navigator.msSaveOrOpenBlob) { // IE10+
                window.navigator.msSaveOrOpenBlob(file, filename);
                saved = true;
            } else { // Others
                var a = document.createElement("a");
                var url = URL.createObjectURL(file);
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                setTimeout(function() {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    saved = true;
                }, 0);
            }
        },
        write: function(context) {
            var root = new window.DOMParser().parseFromString("<?xml version=\"1.0\" encoding=\"UTF-8\"?><project></project>", "text/xml");
            this.ROOT = root;

            var objects = context.getObjects();
            var wires   = context.getWires();

            var projectNode = getChildNode(root, "project");

            var icNode = createChildNode(projectNode, "ics");

            this.writeICs(icNode);
            this.writeGroup(projectNode, objects, wires);

            return root.xml ? root.xml : (new XMLSerializer()).serializeToString(root);
        },
        writeGroup: function(node, objects, wires) {
            var objectsNode = createChildNode(node, "objects");
            var wiresNode = createChildNode(node, "wires");

            for (var i = 0; i < objects.length; i++)
                objects[i].writeTo(objectsNode);

            for (var i = 0; i < wires.length; i++)
                wires[i].writeTo(wiresNode);
        },
        writeICs: function(node) {
            for (var i = 0; i < ICData.ICs.length; i++) {
                var ic = ICData.ICs[i];
                var ICNode = createChildNode(node, "ic");
                createTextElement(ICNode, "icuid", ic.icuid);
                createTextElement(ICNode, "width", ic.transform.size.x);
                createTextElement(ICNode, "height", ic.transform.size.y);

                var iportNode = createChildNode(ICNode, "iports");
                for (var j = 0; j < ic.iports.length; j++)
                    ic.iports[j].writeTo(iportNode);

                var oportNode = createChildNode(ICNode, "oports");
                for (var j = 0; j < ic.oports.length; j++)
                    ic.oports[j].writeTo(oportNode);

                var componentsNode = createChildNode(ICNode, "components");
                var objects = ic.inputs.concat(ic.components, ic.outputs);
                var wires = GetAllWires(objects);
                this.writeGroup(componentsNode, objects, wires);
            }
        }
    };
})();

// UTILS
function createChildNode(parent, tag) {
    var child = Exporter.ROOT.createElement(tag);
    parent.appendChild(child);
    return child;
}

function createTextElement(node, tag, text) {
    var a = Exporter.ROOT.createElement(tag);
    var b = Exporter.ROOT.createTextNode(text);
    a.appendChild(b);
    node.appendChild(a);
}

module.exports = Exporter;
module.exports.createChildNode = createChildNode;
module.exports.createTextElement = createTextElement;

// Requirements
var ICData      = require("../models/ioobjects/other/ICData");
var GetAllWires = require("../libraries/Utils").GetAllWires;
// 
},{"../libraries/Utils":35,"../models/ioobjects/other/ICData":70}],2:[function(require,module,exports){
var Context         = require("../libraries/Context");
var CircuitDesigner = require("../views/CircuitDesigner");

var ICDesigner = (function() {
    var canvas        = document.getElementById("designer-canvas");
    var confirmButton = document.getElementById("ic-confirmbutton");
    var cancelButton  = document.getElementById("ic-cancelbutton");

    confirmButton.onclick = () => { ICDesigner.confirm(); };
    cancelButton.onclick  = () => { ICDesigner.cancel(); };

    var designer = new CircuitDesigner(canvas, 0.84, 0.76);

    var ic, data;
    
    var drag = false;
    var dragObj, dragEdge;
    
    return {
        context: new Context(designer),
        hidden: true,
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
var Input           = require("./Input");
var SelectionTool   = require("./tools/SelectionTool");
var ICData          = require("../models/ioobjects/other/ICData");
var IC              = require("../models/ioobjects/other/IC");

var RectContains               = require("../libraries/Utils").RectContains;
var GetNearestPointOnRect      = require("../libraries/Utils").GetNearestPointOnRect;
var setCurrentContext          = require("../libraries/Context").setCurrentContext;
var getCurrentContext          = require("../libraries/Context").getCurrentContext;
var getMainContext             = require("../libraries/Context").getMainContext;
var render                     = require("../views/Renderer").render;
//

},{"../libraries/Context":29,"../libraries/Utils":35,"../libraries/math/Transform":44,"../libraries/math/Vector":45,"../models/ioobjects/other/IC":69,"../models/ioobjects/other/ICData":70,"../views/CircuitDesigner":75,"../views/Renderer":77,"./Input":4,"./tools/SelectionTool":25}],3:[function(require,module,exports){
var Importer = (function() {   
    var fileInput = document.getElementById('file-input');
    fileInput.onchange = () => { Importer.openFile(); };
     
    return {
        types: [],
        openFile: function() {
            // TODO: Custom popup w/ option to save
            var open = confirm("Are you sure you want to overwrite your current scene?");

            if (open) {
                reset();

                var reader = new FileReader();

                reader.onload = (e) => {
                    this.load(reader.result, getCurrentContext());
                    render();
                }

                reader.readAsText(fileInput.files[0]);
            }
        },
        load: function(text, context) {
            // Remove all whitespace from XML file except for header
            var header = text.substring(0, text.indexOf(">")+1);
            text = header + text.substring(text.indexOf(">")+1).replace(/\s/g,'');

            var root = new window.DOMParser().parseFromString(text, "text/xml");
            if (root.documentElement.nodeName == "parsererror")
                return;

            var project = getChildNode(root, "project");
            var icsNode = getChildNode(project, "ics");

            var ics = this.loadICs(icsNode, context);

            var group = this.loadGroup(project, context, ics);
            context.addObjects(group.objects);
            context.addWires(group.wires);

            for (var i = 0; i < ics.length; i++)
                ICData.add(ics[i]);

            context.redistributeUIDs();
            ICData.redistributeUIDs();

            return group;
        },
        loadGroup: function(node, context, ics) {
            var objectsNode = getChildNode(node, "objects");
            var wiresNode   = getChildNode(node, "wires");

            var objects = [];
            var wires = [];

            for (var i = 0; i < this.types.length; i++) {
                var type = this.types[i];
                var nodes = getChildrenByTagName(objectsNode, type.getXMLName());
                for (var j = 0; j < nodes.length; j++)
                    objects.push(new type(context).load(nodes[j], ics));
            }

            var wiresArr = getChildrenByTagName(wiresNode, "wire");
            for (var i = 0; i < wiresArr.length; i++)
                wires.push(new Wire(context).load(wiresArr[i]));

            for (var i = 0; i < wires.length; i++)
                wires[i].loadConnections(wiresArr[i], objects);

            return {objects:objects, wires:wires};
        },
        loadICs: function(node, context) {
            var ics = [];
            var icNodes = getChildrenByTagName(node, "ic");
            for (var i = 0; i < icNodes.length; i++) {
                var icNode = icNodes[i];
                var icuid  = getIntValue(getChildNode(icNode, "icuid"));
                var width  = getIntValue(getChildNode(icNode, "width"));
                var height = getIntValue(getChildNode(icNode, "height"));

                var componentsNode = getChildNode(icNode, "components");
                var group = this.loadGroup(componentsNode, context, ics);
                var data = ICData.create(group.objects);

                data.icuid = icuid;
                data.transform.setSize(V(width, height));

                var iports = getChildrenByTagName(getChildNode(icNode, "iports"), "iport");
                for (var j = 0; j < iports.length; j++)
                    data.iports[j] = new IPort().load(iports[j]);

                var oports = getChildrenByTagName(getChildNode(icNode, "oports"), "oport");
                for (var j = 0; j < oports.length; j++)
                    data.oports[j] = new OPort().load(oports[j]);

                ics.push(data);
            }
            return ics;
        }
    };
})();

// UTILS
function getChildNode(parent, name) {
    for (var i = 0; i < parent.childNodes.length; i++) {
        if (parent.childNodes[i].nodeName === name)
            return parent.childNodes[i];
    }
    return undefined;
}
function getChildrenByTagName(parent, name) {
    var children = [];
    for (var i = 0; i < parent.childNodes.length; i++) {
        if (parent.childNodes[i].nodeName === name)
            children.push(parent.childNodes[i]);
    }
    return children;
}
function getBooleanValue(node, def) {
    if (node == undefined)
        return def;
    return node.childNodes[0].nodeValue === "true" ? true : false;
}
function getIntValue(node, def) {
    if (node == undefined)
        return def;
    return parseInt(node.childNodes[0].nodeValue);
}
function getFloatValue(node, def) {
    if (node == undefined)
        return def;
    return parseFloat(node.childNodes[0].nodeValue);
}
function getStringValue(node, def) {
    if (node == undefined)
        return def;
    return node.childNodes[0].nodeValue;
}

module.exports = Importer;
module.exports.getChildNode = getChildNode;
module.exports.getChildrenByTagName = getChildrenByTagName;
module.exports.getBooleanValue = getBooleanValue;
module.exports.getIntValue = getIntValue;
module.exports.getFloatValue = getIntValue;
module.exports.getStringValue = getIntValue;

// Requirements
var ICData = require("../models/ioobjects/other/ICData");
var Wire   = require("../models/Wire");
var IPort  = require("../models/IPort");

var getCurrentContext = require("../libraries/Context").getCurrentContext;
var reset             = require("../libraries/Context").reset;
var render            = require("../views/Renderer").render;
//

},{"../libraries/Context":29,"../models/IPort":50,"../models/Wire":52,"../models/ioobjects/other/ICData":70,"../views/Renderer":77}],4:[function(require,module,exports){
var LEFT_MOUSE_BUTTON = require("../libraries/Constants").LEFT_MOUSE_BUTTON;
var SHIFT_KEY         = require("../libraries/Constants").SHIFT_KEY;
var CONTROL_KEY       = require("../libraries/Constants").CONTROL_KEY;
var COMMAND_KEY       = require("../libraries/Constants").COMMAND_KEY;
var OPTION_KEY        = require("../libraries/Constants").OPTION_KEY;
var ENTER_KEY         = require("../libraries/Constants").ENTER_KEY;
var Browser           = require("../libraries/Utils").GetBrowser();

var Vector              = require("../libraries/math/Vector");
var V                   = require("../libraries/math/Vector").V;

var Input = (function () {
    var rawMousePos   = new Vector(0,0);
    var mousePos      = new Vector(0,0);
    var prevMousePos  = new Vector(0,0);
    var worldMousePos = new Vector(0,0);

    var mouseDown = false;
    var mouseDownPos = undefined;
    
    var mouseListeners = [];

    var z = 0;

    var shiftKeyDown = false;
    var modifierKeyDown = false;
    var optionKeyDown = false;

    var isDragging = false;
    var startTapTime = undefined;
    
    console.log(shiftKeyDown);
    
    var onKeyDown = function(e) {
        var code = e.keyCode;
        
        console.log(shiftKeyDown);
        
        switch (code) {
            case SHIFT_KEY:
                shiftKeyDown = true;
                break;
            case CONTROL_KEY:
            case COMMAND_KEY:
                modifierKeyDown = true;
                break;
            case OPTION_KEY:
                optionKeyDown = true;
                getCurrentContext().setCursor("pointer");
                break;
            case ENTER_KEY:
                if (document.activeElement !== document.body)
                    document.activeElement.blur();
                break;
        }

        var objects = getCurrentContext().getObjects();
        for (var i = 0; i < objects.length; i++) {
            if (objects[i] instanceof Keyboard)
                objects[i].onKeyDown(code);
        }

        getCurrentContext().getHistoryManager().onKeyDown(code);
        if (getCurrentTool().onKeyDown(code))
            render();
    }
    var onKeyUp = function(e) {
        var code = e.keyCode;

        switch (code) {
            case SHIFT_KEY:
                shiftKeyDown = false;
                break;
            case CONTROL_KEY:
            case COMMAND_KEY:
                modifierKeyDown = false;
                break;
            case OPTION_KEY:
                optionKeyDown = false;
                getCurrentContext().setCursor("default");
                break;
        }

        var objects = getCurrentContext().getObjects();
        for (var i = 0; i < objects.length; i++) {
            if (objects[i] instanceof Keyboard)
                objects[i].onKeyUp(code);
        }

        if (getCurrentTool().onKeyUp(code))
            render();
    }
    var onDoubleClick = function(e) {
    }
    var onWheel = function(e) {
        var camera = getCurrentContext().getCamera();
        var delta = -e.deltaY / 120.0;

        var factor = 0.95;
        if (delta < 0)
            factor = 1 / factor;

        var worldMousePos = camera.getWorldPos(mousePos);
        camera.zoomBy(factor);
        var newMousePos = camera.getScreenPos(worldMousePos);
        var dx = (mousePos.x - newMousePos.x) * camera.zoom;
        var dy = (mousePos.y - newMousePos.y) * camera.zoom;

        camera.translate(-dx, -dy);

        SelectionPopup.onWheel();

        render();
    }
    var onMouseDown = function(e) {
        var canvas = getCurrentContext().getRenderer().canvas;
        var rect = canvas.getBoundingClientRect();
        isDragging = false;
        startTapTime = Date.now();
        mouseDown = true;
        mouseDownPos = new Vector(e.clientX - rect.left, e.clientY - rect.top);

        if (e.button === LEFT_MOUSE_BUTTON) {
            var shouldRender = false;
            ContextMenu.hide();
            shouldRender = getCurrentTool().onMouseDown(shouldRender);
            for (var i = 0; i < mouseListeners.length; i++)
                shouldRender = mouseListeners[i].onMouseDown(shouldRender) || shouldRender;
            if (shouldRender)
                render();
        }
    }
    var onMouseMove = function(e) {
        var canvas = getCurrentContext().getRenderer().canvas;
        var camera = getCurrentContext().getCamera();
        var rect = canvas.getBoundingClientRect();

        prevMousePos.x = mousePos.x;
        prevMousePos.y = mousePos.y;

        rawMousePos   = new Vector(e.clientX, e.clientY);
        mousePos      = new Vector(e.clientX - rect.left, e.clientY - rect.top);
        worldMousePos = camera.getWorldPos(mousePos);

        isDragging = (mouseDown && (Date.now() - startTapTime > 50));

        var shouldRender = false;

        if (optionKeyDown && isDragging) {
            var pos = new Vector(mousePos.x, mousePos.y);
            var dPos = mouseDownPos.sub(pos);
            camera.translate(camera.zoom * dPos.x, camera.zoom * dPos.y);
            mouseDownPos = mousePos;

            SelectionPopup.onMove();
            shouldRender = true;
        }

        shouldRender = getCurrentTool().onMouseMove(shouldRender) || shouldRender;
        for (var i = 0; i < mouseListeners.length; i++)
            shouldRender = mouseListeners[i].onMouseMove(shouldRender) || shouldRender;
        if (shouldRender)
            render();
    }
    var onMouseUp = function(e) {
        mouseDown = false;

        var shouldRender = false;
        shouldRender = getCurrentTool().onMouseUp(shouldRender);
        for (var i = 0; i < mouseListeners.length; i++)
            shouldRender = mouseListeners[i].onMouseUp(shouldRender) || shouldRender;
        if (shouldRender)
            render();
    }
    var onClick = function(e) {
        var shouldRender = false;
        shouldRender = getCurrentTool().onClick(shouldRender);
        for (var i = 0; i < mouseListeners.length; i++)
            shouldRender = mouseListeners[i].onClick(shouldRender) || shouldRender;
        if (shouldRender)
            render();
    }
    
    window.addEventListener('keydown', e => {onKeyDown(e);}, false);
    window.addEventListener('keyup', e => {onKeyUp(e);}, false);
    
    return {
        registerContext: function(ctx) {
            var canvas = ctx.getRenderer().canvas;
            canvas.addEventListener('click',      e => onClick(e), false);
            canvas.addEventListener('dblclick',   e => onDoubleClick(e), false);
            // if (browser.name !== "Firefox")
                canvas.addEventListener('wheel',  e => onWheel(e), false);
            // else
            //     canvas.addEventListener('DOMMouseScroll', e => onWheel(e), false);
            canvas.addEventListener('mousedown',  e => onMouseDown(e), false);
            canvas.addEventListener('mouseup',    e => onMouseUp(e), false);
            canvas.addEventListener('mousemove',  e => onMouseMove(e), false);
            canvas.addEventListener('mouseenter', e => { if (PlaceItemController.drag) { onMouseMove(e); onClick(e); PlaceItemController.drag = false; }}, false);
            canvas.addEventListener("mouseleave", e => { if (mouseDown) { onMouseUp(e); onClick(e); } });

            canvas.addEventListener("contextmenu", function(e) {
                ContextMenu.show(e);
                e.preventDefault();
            });
        },
        addMouseListener: function(l) {
            mouseListeners.push(l);
        },
        getWorldMousePos() {
            return V(worldMousePos);
        },
        getRawMousePos() {
            return V(rawMousePos);
        },
        getShiftKeyDown() {
            return shiftKeyDown;
        },
        getModifierKeyDown() {
            return modifierKeyDown;
        },
        getOptionKeyDown() {
            return optionKeyDown;
        },
        isDragging() {
            return isDragging;
        }
    }
})();
module.exports = Input;

// Requirements
var Keyboard            = require("../models/ioobjects/inputs/Keyboard");
var ContextMenu         = require("./contextmenu/ContextMenu");
var SelectionPopup      = require("./selectionpopup/SelectionPopup");
var PlaceItemController = require("./PlaceItemController");

var getCurrentContext = require("../libraries/Context").getCurrentContext;
var getCurrentTool    = require("./tools/Tool").getCurrent;
var render            = require("../views/Renderer").render;
//
},{"../libraries/Constants":28,"../libraries/Context":29,"../libraries/Utils":35,"../libraries/math/Vector":45,"../models/ioobjects/inputs/Keyboard":64,"../views/Renderer":77,"./PlaceItemController":6,"./contextmenu/ContextMenu":9,"./selectionpopup/SelectionPopup":22,"./tools/Tool":26}],5:[function(require,module,exports){
var ITEMNAV_WIDTH = require("../libraries/Constants").ITEMNAV_WIDTH;

var ItemNavController = (function() {
    var tab = document.getElementById("open-items-tab");
    var container = document.getElementById("items");

    tab.onclick = () => { ItemNavController.toggle(); };

    var open = function() {
        container.style.width       = ITEMNAV_WIDTH + "px";
        tab.style.marginLeft        = (ItemNavController.getTabOffset()) + "px";
        tab.style.borderColor       = "rgba(153, 153, 153, 0.0)";
        tab.style.backgroundColor   = "rgba(200, 200, 200, 0.0)";
        tab.style.fontSize          = "2.5em";
        tab.innerHTML               = "&times;";
    }
    var close = function() {
        container.style.width       = "0px";
        tab.style.marginLeft        = (ItemNavController.getTabOffset()) + "px";
        tab.style.borderColor       = "rgba(153, 153, 153, 0.7)";
        tab.style.backgroundColor   = "rgba(200, 200, 200, 0.7)";
        tab.style.fontSize          = "2em";
        tab.innerHTML               = "&#9776;";
    }

    return {
        isOpen: false,
        toggle: function() {
            if (this.isOpen) {
                this.isOpen = false;
                close();
            } else {
                this.isOpen = true;
                open();
            }

            // if (popup)
            //     popup.onMove();
        },
        getTabOffset: function() {
            return (this.isOpen ? ITEMNAV_WIDTH - tab.offsetWidth : 0);
        }
    };
})();
// ItemNavController.toggle();

module.exports = ItemNavController;
},{"../libraries/Constants":28}],6:[function(require,module,exports){
// Require all IOObjects
var SevenSegmentDisplay = require("../models/ioobjects/outputs/7SegmentDisplay");
var ConstantLow   = require("../models/ioobjects/inputs/ConstantLow");
var ConstantHigh  = require("../models/ioobjects/inputs/ConstantHigh");
var Button        = require("../models/ioobjects/inputs/Button");
var Switch        = require("../models/ioobjects/inputs/Switch");
var Clock         = require("../models/ioobjects/inputs/Clock");
var Keyboard      = require("../models/ioobjects/inputs/Keyboard");
var LED           = require("../models/ioobjects/outputs/LED");
var BUFGate       = require("../models/ioobjects/gates/BUFGate");
var ANDGate       = require("../models/ioobjects/gates/ANDGate");
var ORGate        = require("../models/ioobjects/gates/ORGate");
var XORGate       = require("../models/ioobjects/gates/XORGate");
var SRFlipFlop    = require("../models/ioobjects/flipflops/SRFlipFlop");
var Multiplexer   = require("../models/ioobjects/other/Multiplexer");
var Demultiplexer = require("../models/ioobjects/other/Demultiplexer");
var Encoder       = require("../models/ioobjects/other/Encoder");
var Decoder       = require("../models/ioobjects/other/Decoder");
var Label         = require("../models/ioobjects/other/Label");

var PlaceItemController = (function() {
    // Setup DOM elements
    function setup(id, obj, not) {
        var button = document.getElementById(id + "-button");
        var image  = document.getElementById(id + "-image");
        button.onclick  =  () => { PlaceItemController.place(new obj(), not); };
        image.ondragend = (e) => { PlaceItemController.onDragEnd(e); };
    }
    setup("constantlow", ConstantLow);
    setup("constanthigh", ConstantHigh);
    setup("button", Button);
    setup("switch", Switch);
    setup("clock", Clock);
    setup("keyboard", Keyboard);
    
    setup("led", LED);
    setup("7segmentdisplay", SevenSegmentDisplay)
    
    setup("bufgate", BUFGate);
    setup("andgate", ANDGate);
    setup("orgate", ORGate);
    setup("xorgate", XORGate);
    setup("notgate", BUFGate, true);
    setup("nandgate", ANDGate, true);
    setup("norgate", ORGate, true);
    setup("xnorgate", XORGate, true);
    
    setup("srflipflop", SRFlipFlop);
    
    setup("multiplexer", Multiplexer);
    setup("demultiplexer", Demultiplexer);
    setup("encoder", Encoder);
    setup("decoder", Decoder);
    setup("label", Label);
    
    return {
        drag: false,
        place: function(item, not) {
            if (not)
                item.not = not;
            var canvas = getCurrentContext().getRenderer().canvas;
            var rect = canvas.getBoundingClientRect();
            ItemTool.activate(item, getCurrentContext());
        },
        onDragEnd: function(event) {
            this.drag = true;
            event.srcElement.parentElement.onclick();
        }
    };
})();

// Requirements
var ItemTool = require("./tools/ItemTool");

var getCurrentContext = require("../libraries/Context").getCurrentContext;
// 
},{"../libraries/Context":29,"../models/ioobjects/flipflops/SRFlipFlop":55,"../models/ioobjects/gates/ANDGate":56,"../models/ioobjects/gates/BUFGate":57,"../models/ioobjects/gates/ORGate":58,"../models/ioobjects/gates/XORGate":59,"../models/ioobjects/inputs/Button":60,"../models/ioobjects/inputs/Clock":61,"../models/ioobjects/inputs/ConstantHigh":62,"../models/ioobjects/inputs/ConstantLow":63,"../models/ioobjects/inputs/Keyboard":64,"../models/ioobjects/inputs/Switch":65,"../models/ioobjects/other/Decoder":66,"../models/ioobjects/other/Demultiplexer":67,"../models/ioobjects/other/Encoder":68,"../models/ioobjects/other/Label":71,"../models/ioobjects/other/Multiplexer":72,"../models/ioobjects/outputs/7SegmentDisplay":73,"../models/ioobjects/outputs/LED":74,"./tools/ItemTool":24}],7:[function(require,module,exports){
var SelectionBox = (function () {
    var pos1 = undefined; // First corner
    var pos2 = undefined; // Second corner
    
    var getSelections = function() {
        var objects = getCurrentContext().getObjects();
        var selections = [];
        if (pos1 != undefined) {
            var trans = new Transform(V((pos1.x+pos2.x)/2, (pos1.y+pos2.y)/2), 
                                      V(Math.abs(pos2.x-pos1.x), Math.abs(pos2.y-pos1.y)), 
                                      0, getCurrentContext().getCamera());
            for (var i = 0; i < objects.length; i++) {
                var obj = objects[i];
                var t = (obj.selectionBoxTransform != undefined ? obj.selectionBoxTransform : obj.transform);
                if (TransformContains(t, trans)) {
                    selections.push(obj);
                } else if (obj.inputs != undefined && obj.outputs != undefined) {
                    // Check if an iport or oport is selected
                    for (var j = 0; j < obj.inputs.length; j++) {
                        var input = obj.inputs[j];
                        if (RectContains(trans, input.getPos()))
                            selections.push(input);
                    }
                    for (var j = 0; j < obj.outputs.length; j++) {
                        var output = obj.outputs[j];
                        if (RectContains(trans, output.getPos()))
                            selections.push(output);
                    }
                }
            }
        }
        return selections;
    }
    
    return {
        onMouseDown: function(somethingHappened) {
            var objects       = getCurrentContext().getObjects();
            var wires         = getCurrentContext().getWires();
            var worldMousePos = Input.getWorldMousePos();
            
            // Make sure nothing but blank canvas was clicked
            if (somethingHappened || !SelectionTool.isActive 
                || Input.getOptionKeyDown())
                return;
            for (var i = 0; i < objects.length; i++) {
                var obj = objects[i];
                if (obj.contains(worldMousePos) || obj.sContains(worldMousePos) ||
                    obj.oPortContains(worldMousePos) !== -1 || obj.iPortContains(worldMousePos) !== -1)
                    return;
            }
            for (var i = 0; i < wires.length; i++) {
                var wire = wires[i];
                if (wire.getNearestT(worldMousePos.x, worldMousePos.y) !== -1)
                    return;
            }
            
            pos1 = V(worldMousePos);
            SelectionPopup.hide();
        },
        onMouseMove: function() {
            var objects       = getCurrentContext().getObjects();
            var worldMousePos = Input.getWorldMousePos();

            if (pos1 != undefined) {
                pos2 = V(worldMousePos);
                SelectionPopup.hide();
                return true;
            }
        },
        onMouseUp: function() {
        },
        onClick: function(somethingHappened) {
            var objects       = getCurrentContext().getObjects();
            var worldMousePos = Input.getWorldMousePos();

            // Stop selection box
            if (pos1 != undefined) {
                pos2 = V(worldMousePos);
                var selections = getSelections();
                if (!Input.getShiftKeyDown())
                    SelectionTool.deselectAll(true);
                SelectionTool.select(selections, true);
                pos1 = undefined;
                pos2 = undefined;
                return true;
            }
        },
        draw(renderer) {
            var camera = renderer.getCamera();
            if (pos1 != undefined && pos2 != undefined) {
                var p1 = camera.getScreenPos(pos1);
                var p2 = camera.getScreenPos(pos2);
                var w = p2.x - p1.x, h = p2.y - p1.y;
                renderer.save();
                renderer.context.globalAlpha = 0.4;
                renderer.rect(p1.x+w/2, p1.y+h/2, w, h, '#ffffff', '#6666ff', 2 / camera.zoom);
                renderer.restore();
            }
        }
    }
})();

module.exports = SelectionBox;

// Requirements
var Vector         = require("../libraries/math/Vector");
var V              = require("../libraries/math/Vector").V;
var Transform      = require("../libraries/math/Transform");
var Input          = require("./Input");
var SelectionTool  = require("./tools/SelectionTool");
var SelectionPopup = require("./selectionpopup/SelectionPopup");

var RectContains      = require("../libraries/Utils").RectContains;
var TransformContains = require("../libraries/Utils").TransformContains;
var getCurrentContext = require("../libraries/Context").getCurrentContext;
// 
},{"../libraries/Context":29,"../libraries/Utils":35,"../libraries/math/Transform":44,"../libraries/math/Vector":45,"./Input":4,"./selectionpopup/SelectionPopup":22,"./tools/SelectionTool":25}],8:[function(require,module,exports){
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
},{"../libraries/Constants":28,"../libraries/Context":29,"../libraries/Utils":35,"../libraries/math/Vector":45,"./Input":4,"./selectionpopup/SelectionPopup":22,"./tools/SelectionTool":25}],9:[function(require,module,exports){
var Popup           = require("../../libraries/popup/Popup");
var CutModule       = require("./CutModule");
var CopyModule      = require("./CopyModule");
var PasteModule     = require("./PasteModule");
var SelectAllModule = require("./SelectAllModule");
var UndoModule      = require("./UndoModule");
var RedoModule      = require("./RedoModule");

class ContextMenu extends Popup {
    constructor() {
        super("context-menu");

        this.add(new CutModule(this, "context-menu-cut"));
        this.add(new CopyModule(this, "context-menu-copy"));
        this.add(new PasteModule(this, "context-menu-paste"));
        this.add(new SelectAllModule(this, "context-menu-select-all"))

        this.add(new UndoModule(this, "context-menu-undo"));
        this.add(new RedoModule(this, "context-menu-redo"))
    }
    onKeyDown(code) {
        if (code === ESC_KEY && !this.hidden) {
            this.hide();
            return;
        }
    }
    onShow() {
        super.onShow();

        var pos = Input.getRawMousePos();
        this.setPos(V(pos.x, pos.y));
    }
}
var contextmenu = new ContextMenu();

module.exports = contextmenu;

// Requirements
var Input = require("../Input");
// 
},{"../../libraries/popup/Popup":47,"../Input":4,"./CopyModule":10,"./CutModule":11,"./PasteModule":12,"./RedoModule":13,"./SelectAllModule":14,"./UndoModule":15}],10:[function(require,module,exports){
var Module        = require("../../libraries/popup/Module");
var SelectionTool = require("../tools/SelectionTool");

class CopyModule extends Module {
    constructor(parent, divName) {
        super(parent, divName);
    }
    onShow() {
        this.setDisabled(SelectionTool.selections.length == 0);
    }
    onClick() {
        this.parent.hide();
        document.execCommand("copy");
    }
}

module.exports = CopyModule;
},{"../../libraries/popup/Module":46,"../tools/SelectionTool":25}],11:[function(require,module,exports){
var Module        = require("../../libraries/popup/Module");
var SelectionTool = require("../tools/SelectionTool");

class CutModule extends Module {
    constructor(parent, divName) {
        super(parent, divName);
    }
    onShow() {
        this.setDisabled(SelectionTool.selections.length == 0);
    }
    onClick() {
        this.parent.hide();
        document.execCommand("cut");
    }
}

module.exports = CutModule;
},{"../../libraries/popup/Module":46,"../tools/SelectionTool":25}],12:[function(require,module,exports){
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
},{"../../libraries/popup/Module":46}],13:[function(require,module,exports){
var Module = require("../../libraries/popup/Module");

class RedoModule extends Module {
    constructor(parent, divName) {
        super(parent, divName);
    }
    onShow() {
        this.setDisabled(getCurrentContext().designer.history.redoStack.length == 0);
    }
    onClick() {
        this.parent.hide();
        getCurrentContext().designer.history.redo();
    }
}

module.exports = RedoModule;
},{"../../libraries/popup/Module":46}],14:[function(require,module,exports){
var Module        = require("../../libraries/popup/Module");
var SelectionTool = require("../tools/SelectionTool");

var render = require("../../views/Renderer").render;

class SelectAllModule extends Module {
    constructor(parent, divName) {
        super(parent, divName);
    }
    onShow() {
        this.setDisabled(false);
    }
    onClick() {
        this.parent.hide();
        SelectionTool.selectAll();
        render();
    }
}

module.exports = SelectAllModule;
},{"../../libraries/popup/Module":46,"../../views/Renderer":77,"../tools/SelectionTool":25}],15:[function(require,module,exports){
var Module = require("../../libraries/popup/Module");

class UndoModule extends Module {
    constructor(parent, divName) {
        super(parent, divName);
    }
    onShow() {
        this.setDisabled(getCurrentContext().designer.history.undoStack.length == 0);
    }
    onClick() {
        this.parent.hide();
        getCurrentContext().designer.history.undo();
    }
}

module.exports = UndoModule;
},{"../../libraries/popup/Module":46}],16:[function(require,module,exports){
var Module = require("../../libraries/popup/Module");

class BusButtonModule extends Module {
    constructor(parent, divName) {
        super(parent, divName);
    }
    onShow() {
        var iports = 0, oports = 0;
        var selections = SelectionTool.selections;
        for (var i = 0; i < selections.length; i++) {
            if (selections[i] instanceof IPort) {
                iports++;
            } else if (selections[i] instanceof OPort) {
                oports++;
            } else {
                this.setVisibility("none");
                return;
            }
        }
        this.setVisibility(iports === oports ? "inherit" : "none");
    }
    onClick() {
        this.createBus();
    }
    createBus() {
        var selections = SelectionTool.selections;
        
        var iports = [], oports = [];
        for (var i = 0; i < selections.length; i++) {
            if (selections[i] instanceof IPort)
                iports.push(selections[i]);
            else
                oports.push(selections[i]);
        }

        while (oports.length > 0) {
            var maxDist = -Infinity, maxDistIndex = -1, maxMinDistIndex = -1;
            for (var i = 0; i < oports.length; i++) {
                var oport = oports[i];
                var opos = oport.getPos();
                var minDist = Infinity, minDistIndex = -1;
                for (var j = 0; j < iports.length; j++) {
                    var iport = iports[j];
                    var dist = opos.sub(iport.getPos()).len2();
                    if (dist < minDist) {
                        minDist = dist;
                        minDistIndex = j;
                    }
                }
                if (minDist > maxDist) {
                    maxDist = minDist;
                    maxDistIndex = i;
                    maxMinDistIndex = minDistIndex;
                }
            }
            var wire = new Wire(context);
            getCurrentContext().add(wire);
            oports[maxDistIndex].connect(wire);
            wire.connect(iports[maxMinDistIndex]);
            wire.set = true;
            wire.straight = true;
            oports.splice(maxDistIndex, 1);
            iports.splice(maxMinDistIndex, 1);
        }
        render();
    }
}

module.exports = BusButtonModule;

// Requirements
var SelectionTool = require("../tools/SelectionTool");
var IPort         = require("../../models/IPort");
var OPort         = require("../../models/OPort");
var Wire          = require("../../models/Wire");

var render = require("../../views/Renderer").render;
// 
},{"../../libraries/popup/Module":46,"../../models/IPort":50,"../../models/OPort":51,"../../models/Wire":52,"../../views/Renderer":77,"../tools/SelectionTool":25}],17:[function(require,module,exports){
var Module = require("../../libraries/popup/Module");

class ColorPickerModule extends Module {
    constructor(parent, divName, divTextName) {
        super(parent, divName, divTextName);
    }
    onShow() {
        var allLEDs = true, allSame = true;
        var selections = SelectionTool.selections;
        for (var i = 0; i < selections.length; i++) {
            allLEDs = allLEDs && selections[i] instanceof LED;
            if (allLEDs)
                allSame = allSame && selections[i].color === selections[0].color;
        }
        this.setVisibility(allLEDs ? "inherit" : "none");
        this.setValue(allLEDs && allSame ? selections[0].color : '#ffffff');
    }
    onChange() {
        var selections = SelectionTool.selections;
        for (var i = 0; i < selections.length; i++)
            selections[i].color = this.getValue();
    }
    onFocus() {
        this.parent.focused = true;
    }
    onBlur() {
        this.parent.focused = false;
        this.onChange();
    }
}

module.exports = ColorPickerModule;

// Requirements
var SelectionTool = require("../tools/SelectionTool");
var LED           = require("../../models/ioobjects/outputs/LED");
// 
},{"../../libraries/popup/Module":46,"../../models/ioobjects/outputs/LED":74,"../tools/SelectionTool":25}],18:[function(require,module,exports){
var Module = require("../../libraries/popup/Module");

class ICButtonModule extends Module {
    constructor(parent, divName) {
        super(parent, divName);
    }
    onShow() {
        var count = 0;
        var selections = SelectionTool.selections;
        for (var i = 0; i < selections.length; i++) {
            if (selections[i] instanceof IOObject && !(selections[i] instanceof WirePort))
                count++;
        }
        this.setVisibility(count >= 2 ? "inherit" : "none");
    }
    onClick() {
        ICDesigner.show(SelectionTool.selections);
    }
}

module.exports = ICButtonModule;

// Requirements
var IOObject      = require("../../models/IOObject");
var WirePort      = require("../../models/WirePort");
var ICDesigner    = require("../ICDesigner");
var SelectionTool = require("../tools/SelectionTool");
// 
},{"../../libraries/popup/Module":46,"../../models/IOObject":48,"../../models/WirePort":53,"../ICDesigner":2,"../tools/SelectionTool":25}],19:[function(require,module,exports){
var Module = require("../../libraries/popup/Module");

class InputCountModule extends Module {
    constructor(parent, divName, divTextName) {
        super(parent, divName, divTextName);
    }
    onShow() {
        var allSame = true, display = true;
        var maxMinValue = 0;
        var minMaxValue = 999;
        var selections = SelectionTool.selections;
        for (var i = 0; i < selections.length; i++) {
            display = display && (selections[i].maxInputs > 1 && selections[i].noChange !== true);
            allSame = allSame && selections[i].getInputAmount() === selections[0].getInputAmount();
            maxMinValue = Math.max(selections[i].getMinInputFieldCount(), maxMinValue);
            minMaxValue = Math.min(selections[i].getMaxInputFieldCount(), minMaxValue);
        }
        this.setValue(allSame ? selections[0].getInputAmount() : "");
        this.setPlaceholder(allSame ? "" : "-");
        this.setVisibility(display ? "inherit" : "none");
        this.div.min = maxMinValue;
        this.div.max = minMaxValue;
    }
    onChange() {
        var selections = SelectionTool.selections;
        for (var i = 0; i < selections.length; i++)
            selections[i].setInputAmount(Number(this.getValue()));
    }
}

module.exports = InputCountModule;

// Requirements
var SelectionTool = require("../tools/SelectionTool");
// 
},{"../../libraries/popup/Module":46,"../tools/SelectionTool":25}],20:[function(require,module,exports){
var GRID_SIZE = require("../../libraries/Constants").GRID_SIZE;

var Module = require("../../libraries/popup/Module");

class PositionXModule extends Module {
    constructor(parent, divName) {
        super(parent, divName);
    }
    onShow() {
        var allSame = true;
        var selections = SelectionTool.selections;
        for (var i = 0; i < selections.length; i++)
            allSame = allSame && selections[i].getPos().x === selections[0].getPos().x;
        this.setValue(allSame ? +(selections[0].getPos().x/GRID_SIZE - 0.5).toFixed(3) : "");
        this.setPlaceholder(allSame ? "" : "-");
    }
    onChange() {
        var action = new GroupAction();
        var selections = SelectionTool.selections;
        for (var i = 0; i < selections.length; i++) {
            if (!selections[i].transform) {
                this.onShow(); // Update value before exiting
                return;
            }
            var origin = selections[i].transform.copy();
            selections[i].setPos(V(GRID_SIZE*(Number(this.getValue())+0.5), selections[i].transform.getPos().y));
            var target = selections[i].transform.copy();
            action.add(new TransformAction(selections[i], origin, target));
        }
        getCurrentContext().addAction(action);
    }
}

module.exports = PositionXModule;

// Requirements
var V               = require("../../libraries/math/Vector").V;
var GroupAction     = require("../../libraries/actions/GroupAction");
var TransformAction = require("../../libraries/actions/TransformAction");
var SelectionTool   = require("../tools/SelectionTool");

var getCurrentContext = require("../../libraries/Context").getCurrentContext;
// 
},{"../../libraries/Constants":28,"../../libraries/Context":29,"../../libraries/actions/GroupAction":38,"../../libraries/actions/TransformAction":41,"../../libraries/math/Vector":45,"../../libraries/popup/Module":46,"../tools/SelectionTool":25}],21:[function(require,module,exports){
var GRID_SIZE = require("../../libraries/Constants").GRID_SIZE;

var Module = require("../../libraries/popup/Module");

class PositionYModule extends Module {
    constructor(parent, divName) {
        super(parent, divName);
    }
    onShow() {
        var allSame = true;
        var selections = SelectionTool.selections;
        for (var i = 0; i < selections.length; i++)
            allSame = allSame && selections[i].getPos().y === selections[0].getPos().y;
        this.setValue(allSame ? +(selections[0].getPos().y/GRID_SIZE - 0.5).toFixed(3) : "");
        this.setPlaceholder(allSame ? "" : "-");
    }
    onChange() {
        var action = new GroupAction();
        var selections = SelectionTool.selections;
        for (var i = 0; i < selections.length; i++) {
            if (!selections[i].transform) {
                this.onShow(); // Update value before exiting
                return;
            }
            var origin = selections[i].transform.copy();
            selections[i].setPos(V(selections[i].transform.getPos().x, GRID_SIZE*(Number(this.getValue())+0.5)));
            var target = selections[i].transform.copy();
            action.add(new TransformAction(selections[i], origin, target));
        }
        getCurrentContext().addAction(action);
    }
}

module.exports = PositionYModule;

// Requirements
var V               = require("../../libraries/math/Vector").V;
var GroupAction     = require("../../libraries/actions/GroupAction");
var TransformAction = require("../../libraries/actions/TransformAction");
var SelectionTool   = require("../tools/SelectionTool");

var getCurrentContext = require("../../libraries/Context").getCurrentContext;
// 
},{"../../libraries/Constants":28,"../../libraries/Context":29,"../../libraries/actions/GroupAction":38,"../../libraries/actions/TransformAction":41,"../../libraries/math/Vector":45,"../../libraries/popup/Module":46,"../tools/SelectionTool":25}],22:[function(require,module,exports){
var DELETE_KEY = require("../../libraries/Constants").DELETE_KEY;
var ESC_KEY    = require("../../libraries/Constants").ESC_KEY;

var Popup             = require("../../libraries/popup/Popup");
var TitleModule       = require("./TitleModule");
var PositionXModule   = require("./PositionXModule");
var PositionYModule   = require("./PositionYModule");
var InputCountModule  = require("./InputCountModule");
var ColorPickerModule = require("./ColorPickerModule");
var ICButtonModule    = require("./ICButtonModule");
var BusButtonModule   = require("./BusButtonModule");

class SelectionPopup extends Popup {
    constructor() {
        super("popup");

        this.add(new TitleModule(this, "popup-name"));

        this.add(new PositionXModule(this, "popup-position-x"));
        this.add(new PositionYModule(this, "popup-position-y"));

        this.add(new InputCountModule(this, "popup-input-count", "popup-input-count-text"));

        this.add(new ColorPickerModule(this, "popup-color-picker", "popup-color-text"));

        this.add(new ICButtonModule(this, "popup-ic-button"));
        this.add(new BusButtonModule(this, "popup-bus-button"));
    }
    onKeyDown(code) {
        if (code === DELETE_KEY && !this.focused) {
            RemoveObjects(getCurrentContext(), SelectionTool.selections, true);
            return;
        }
        if (code === ESC_KEY && !this.hidden) {
            SelectionTool.deselectAll();
            render();
            return;
        }
    }
    onEnter() {
        this.blur();
    }
    update() {
        var selections = SelectionTool.selections;
        if (selections.length > 0) {
            this.show();
            this.onMove();
        } else {
            this.hide();
        }
    }
    onMove() {
        var camera = getCurrentContext().getCamera();
        if (SelectionTool.selections.length > 0) {
            SelectionTool.recalculateMidpoint();
            var pos = camera.getScreenPos(SelectionTool.midpoint);
            pos.y -= this.div.clientHeight/2;
            this.setPos(pos);
        }
    }
    onWheel() {
        this.onMove();
    }
}
var selectionpopup = new SelectionPopup();

module.exports = selectionpopup;

// Requirements
var SelectionTool = require("../tools/SelectionTool");

var RemoveObjects     = require("../../libraries/Utils").RemoveObjects;
var getCurrentContext = require("../../libraries/Context").getCurrentContext;
// 
},{"../../libraries/Constants":28,"../../libraries/Context":29,"../../libraries/Utils":35,"../../libraries/popup/Popup":47,"../tools/SelectionTool":25,"./BusButtonModule":16,"./ColorPickerModule":17,"./ICButtonModule":18,"./InputCountModule":19,"./PositionXModule":20,"./PositionYModule":21,"./TitleModule":23}],23:[function(require,module,exports){
var Module = require("../../libraries/popup/Module");

class TitleModule extends Module {
    constructor(parent, divName) {
        super(parent, divName);
    }
    onShow() {
        var allSame = true;
        var selections = SelectionTool.selections;
        for (var i = 0; i < selections.length; i++)
            allSame = allSame && selections[i].getName() === selections[0].getName();
        this.setValue(allSame ? selections[0].getName() : "<Multiple>");
    }
    onChange() {
        var selections = SelectionTool.selections;
        for (var i = 0; i < selections.length; i++)
            selections[i].setName(this.getValue());
    }
    onFocus() {
        this.parent.focused = true;
    }
    onBlur() {
        this.parent.focused = false;
        this.onChange();
    }
}

module.exports = TitleModule;

// Requirements
var SelectionTool = require("../tools/SelectionTool");
// 
},{"../../libraries/popup/Module":46,"../tools/SelectionTool":25}],24:[function(require,module,exports){
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
},{"../../libraries/Context":29,"../../libraries/actions/PlaceAction":39,"../Input":4,"./SelectionTool":25,"./Tool":26}],25:[function(require,module,exports){
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
},{"../../libraries/Constants":28,"../../libraries/Context":29,"../../libraries/actions/GroupAction":38,"../../libraries/actions/SelectAction":40,"../../libraries/math/Vector":45,"../../models/IOObject":48,"../../models/Wire":52,"../ICDesigner":2,"../Input":4,"../SelectionBox":7,"../TransformController":8,"../selectionpopup/SelectionPopup":22,"./Tool":26}],26:[function(require,module,exports){
var CurrentTool;
function setCurrentTool(tool) {
    if (CurrentTool)
        CurrentTool.deactivate();
    CurrentTool = tool;
    tool.isActive = true;
}
function getCurrentTool() {
    return CurrentTool;
}

module.exports.setCurrent = setCurrentTool;
module.exports.getCurrent = getCurrentTool;
},{}],27:[function(require,module,exports){
class Camera {
    constructor(designer, startPos, startZoom) {
        this.canvas = designer.renderer.canvas;
        this.pos = (startPos ? startPos : V(0, 0));
        this.zoom = (startZoom ? startZoom : 1);
        this.center = V(0,0);
        this.transform = new Transform(V(0,0), V(0,0), 0, this);
        this.dirty = true;
    }
    resize() {
        this.center = V(this.canvas.width, this.canvas.height).scale(0.5);
    }
    updateMatrix() {
        if (!this.dirty)
            return;
        this.dirty = false;

        this.mat = new Matrix2x3();
        this.mat.translate(this.pos);
        this.mat.scale(V(this.zoom, this.zoom));
        this.inv = this.mat.inverse();

        var p1 = this.getWorldPos(V(0, 0));
        var p2 = this.getWorldPos(V(this.canvas.width, this.canvas.height));
        this.transform.setPos(p2.add(p1).scale(0.5));
        this.transform.setSize(p2.sub(p1));
    }
    translate(dx, dy) {
        this.dirty = true;
        this.pos.x += dx;
        this.pos.y += dy;
    }
    zoomBy(s) {
        this.dirty = true;
        this.zoom *= s;
    }
    cull(transform) {
        // getCurrentContext().getRenderer().save();
        // transform.transformCtx(getCurrentContext().getRenderer().context);
        // getCurrentContext().getRenderer().rect(0, 0, transform.size.x, transform.size.y, '#ff00ff');
        // getCurrentContext().getRenderer().restore();

        return (TransformContains(transform, this.getTransform()));
    }
    getTransform() {
        this.updateMatrix();
        return this.transform;
    }
    getMatrix() {
        this.updateMatrix();
        return this.mat;
    }
    getInverseMatrix() {
        this.updateMatrix();
        return this.inv;
    }
    getScreenPos(v) {
        return this.getInverseMatrix().mul(v).add(this.center);
    }
    getWorldPos(v) {
        return this.getMatrix().mul(v.sub(this.center));
    }
}

module.exports = Camera;

// Requirements
var V         = require("./math/Vector").V;
var Matrix2x3 = require("./math/Matrix");
var Transform = require("./math/Transform");

var TransformContains = require("./Utils").TransformContains;
// 
},{"./Utils":35,"./math/Matrix":43,"./math/Transform":44,"./math/Vector":45}],28:[function(require,module,exports){
/* Should be const instead of var
   but Safari does not allow it */
var DEFAULT_SIZE = 50;
var GRID_SIZE = 50;
var DEFAULT_FILL_COLOR = "#ffffff";
var DEFAULT_BORDER_COLOR = "#000000";
var DEFAULT_ON_COLOR = "#3cacf2";

var PROPAGATION_TIME = 1;

var IO_PORT_LENGTH = 60;
var IO_PORT_RADIUS = 7;
var IO_PORT_BORDER_WIDTH = 1;
var IO_PORT_LINE_WIDTH = 2;

var WIRE_DIST_THRESHOLD = 5;
var WIRE_DIST_THRESHOLD2 = WIRE_DIST_THRESHOLD*WIRE_DIST_THRESHOLD;
var WIRE_DIST_ITERATIONS = 10;
var WIRE_NEWTON_ITERATIONS = 5;
var WIRE_SNAP_THRESHOLD = 10;

var ROTATION_CIRCLE_RADIUS = 75;
var ROTATION_CIRCLE_THICKNESS = 5;
var ROTATION_CIRCLE_THRESHOLD = 5;
var ROTATION_CIRCLE_R1 = Math.pow(ROTATION_CIRCLE_RADIUS - ROTATION_CIRCLE_THRESHOLD, 2);
var ROTATION_CIRCLE_R2 = Math.pow(ROTATION_CIRCLE_RADIUS + ROTATION_CIRCLE_THRESHOLD, 2);

var SIDENAV_WIDTH = 200;
var ITEMNAV_WIDTH = 200;

var LEFT_MOUSE_BUTTON = 0;
var RIGHT_MOUSE_BUTTON = 1;

var OPTION_KEY = 18;
var SHIFT_KEY = 16;
var DELETE_KEY = 8;
var ENTER_KEY = 13;
var ESC_KEY = 27;
var A_KEY = 65;
var C_KEY = 67;
var V_KEY = 86;
var X_KEY = 88;
var Y_KEY = 89;
var Z_KEY = 90;
var CONTROL_KEY = 17;
var COMMAND_KEY = 91;

module.exports.DEFAULT_SIZE = DEFAULT_SIZE;
module.exports.GRID_SIZE = GRID_SIZE;
module.exports.DEFAULT_FILL_COLOR = DEFAULT_FILL_COLOR;
module.exports.DEFAULT_BORDER_COLOR = DEFAULT_BORDER_COLOR;
module.exports.DEFAULT_ON_COLOR = DEFAULT_ON_COLOR;
module.exports.PROPAGATION_TIME = PROPAGATION_TIME;
module.exports.IO_PORT_LENGTH = IO_PORT_LENGTH;
module.exports.IO_PORT_RADIUS = IO_PORT_RADIUS;
module.exports.IO_PORT_BORDER_WIDTH = IO_PORT_BORDER_WIDTH;
module.exports.IO_PORT_LINE_WIDTH = IO_PORT_LINE_WIDTH;
module.exports.WIRE_DIST_THRESHOLD = WIRE_DIST_THRESHOLD;
module.exports.WIRE_DIST_THRESHOLD2 = WIRE_DIST_THRESHOLD2;
module.exports.WIRE_DIST_ITERATIONS = WIRE_DIST_ITERATIONS;
module.exports.WIRE_NEWTON_ITERATIONS = WIRE_NEWTON_ITERATIONS;
module.exports.WIRE_SNAP_THRESHOLD = WIRE_SNAP_THRESHOLD;
module.exports.ROTATION_CIRCLE_RADIUS = ROTATION_CIRCLE_RADIUS;
module.exports.ROTATION_CIRCLE_THICKNESS = ROTATION_CIRCLE_THICKNESS;
module.exports.ROTATION_CIRCLE_THRESHOLD = ROTATION_CIRCLE_THRESHOLD;
module.exports.ROTATION_CIRCLE_R1 = ROTATION_CIRCLE_R1;
module.exports.ROTATION_CIRCLE_R2 = ROTATION_CIRCLE_R2;
module.exports.SIDENAV_WIDTH = SIDENAV_WIDTH;
module.exports.ITEMNAV_WIDTH = ITEMNAV_WIDTH;
module.exports.LEFT_MOUSE_BUTTON = LEFT_MOUSE_BUTTON;
module.exports.RIGHT_MOUSE_BUTTON = RIGHT_MOUSE_BUTTON;
module.exports.OPTION_KEY = OPTION_KEY;
module.exports.SHIFT_KEY = SHIFT_KEY;
module.exports.DELETE_KEY = DELETE_KEY;
module.exports.ENTER_KEY = ENTER_KEY;
module.exports.ESC_KEY = ESC_KEY;
module.exports.A_KEY = A_KEY;
module.exports.C_KEY = C_KEY;
module.exports.V_KEY = V_KEY;
module.exports.X_KEY = X_KEY;
module.exports.Y_KEY = Y_KEY;
module.exports.Z_KEY = Z_KEY;
module.exports.CONTROL_KEY = CONTROL_KEY;
module.exports.COMMAND_KEY = COMMAND_KEY;
},{}],29:[function(require,module,exports){
class Context {
    constructor(designer) {
        this.uidmanager = new UIDManager(this);
        this.designer = designer;
    }
    reset() {
        this.designer.reset();
    }
    render() {
        this.designer.render();
    }
    propogate(sender, receiver, signal) {
        this.designer.propogate(sender, receiver, signal);
    }
    add(o) {
        if (o instanceof Wire)
            this.addWire(o);
        else
            this.addObject(o);
    }
    addObject(o) {
        this.designer.addObject(o);
        this.uidmanager.giveUIDTo(o);
    }
    addObjects(arr) {
        for (var i = 0; i < arr.length; i++)
            this.addObject(arr[i]);
    }
    addWire(w) {
        this.designer.addWire(w);
        this.uidmanager.giveUIDTo(w);
    }
    addWires(arr) {
        for (var i = 0; i < arr.length; i++)
            this.addWire(arr[i]);
    }
    addAction(action) {
        this.designer.history.add(action);
    }
    setCursor(cursor) {
        this.designer.renderer.setCursor(cursor);
    }
    remove(o) {
        var index = this.getIndexOf(o);
        if (index === -1)
            return;
        if (o instanceof Wire)
            this.designer.getWires().splice(index, 1);
        else
            this.designer.getObjects().splice(index, 1);
    }
    undo() {
        this.designer.history.undo();
    }
    redo() {
        this.designer.history.redo();
    }
    redistributeUIDs() {
        this.uidmanager.redistribute();
    }
    getDesigner() {
        return this.designer;
    }
    getRenderer() {
        return this.designer.renderer;
    }
    getCamera() {
        return this.designer.camera;
    }
    getHistoryManager() {
        return this.designer.history;
    }
    getObjects() {
        // Copy to avoid confusing bugs when
        // modifying the objects through add/remove
        // and have it edit the returned array
        return CopyArray(this.designer.objects);
    }
    getWires() {
        // Copy to avoid confusing bugs when
        // modifying the objects through add/remove
        // and have it edit the returned array
        return CopyArray(this.designer.wires);
    }
    getIndexOf(o) {
        if (o instanceof Wire)
            return this.designer.getIndexOfWire(o);
        else
            return this.designer.getIndexOfObject(o);
    }
    findByUID(uid) {
        return FindObjectByUID(uid) || FindWireByUID(uid);
    }
    findObjectByUID(uid) {
        return UIDManager.find(this.getObjects(), uid);
    }
    findWireByUID(uid) {
        return UIDManager.find(this.getWires(), uid);
    }
}

var CurrentContext;
function getCurrentContext() {
    return CurrentContext;
}
function setCurrentContext(context) {
    CurrentContext = context;
}
var MainContext;
function getMainContext() {
    return MainContext;
}
function setMainContext(context) {
    MainContext = context;
}
var Saved = true;
function setSaved(val) {
    Saved = val;
}
function isSaved() {
    return Saved;
}
function reset() {
    CurrentContext = MainContext;
    CurrentContext.reset();
}

module.exports = Context;
module.exports.setCurrentContext = setCurrentContext;
module.exports.getCurrentContext = getCurrentContext;
module.exports.setMainContext = setMainContext;
module.exports.getMainContext = getMainContext;
module.exports.setSaved = setSaved;
module.exports.isSaved = isSaved;
module.exports.reset = reset;

// Requirements
var UIDManager = require("./UIDManager");
var Wire       = require("../models/Wire");

var CopyArray       = require("./Utils").CopyArray;
var FindObjectByUID = require("./Utils").FindObjectByUID;
var FindWireByUID   = require("./Utils").FindWireByUID;
// 
},{"../models/Wire":52,"./UIDManager":34,"./Utils":35}],30:[function(require,module,exports){
function CopyGroup(objects) {
    if (objects.length === 0)
        return [];

    var copies = [];
    for (var i = 0; i < objects.length; i++) {
        if (objects[i] instanceof WirePort)
            objects.splice(i--, 1);
        else
            copies[i] = objects[i].copy();
    }

    // Copy and reconnect all wires
    var wireCopies = [];
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        for (var j = 0; j < obj.outputs.length; j++) {
            var wires = obj.outputs[j].connections;
            for (var k = 0; k < wires.length; k++) {
                // See if connection was also copied
                var ww = wires[k];
                while (ww instanceof Wire || ww instanceof WirePort)
                    ww = ww.connection;
                if (FindIPort(objects, ww, copies) == undefined)
                    break;

                var wire = wires[k].copy();
                copies[i].outputs[j].connect(wire);
                var w = wires[k];
                // Iterate through all wires connected to other wires
                while(w.connection instanceof WirePort) {
                    var port = new WirePort(obj.context);
                    wire.connect(port);
                    wireCopies.push(wire);
                    w = w.connection.connection;
                    wire = w.copy();
                    port.connect(wire);
                    copies.push(port);
                }
                var lastConnection = FindIPort(objects, w.connection, copies);
                wire.connect(lastConnection);
                wireCopies.push(wire);
            }
        }
    }
    for (var i = 0; i < objects.length; i++) {
        copies[i].isOn = objects[i].isOn;
        if (objects[i].inputs.length === 0)
            copies[i].activate(objects[i].isOn);
    }
    for (var i = 0; i < wireCopies.length; i++) {
        if (objects[i].inputs.length === 0)
            copies[i].activate(objects[i].isOn);
    }

    return {objects:copies, wires:wireCopies};
}

function FindIPort(objects, target, copies) {
    for (var i = 0; i < objects.length; i++) {
        var iports = objects[i].inputs;
        for (var j = 0; j < iports.length; j++) {
            if (iports[j] === target)
                return copies[i].inputs[j];
        }
    }
    return undefined;
}

module.exports.CopyGroup = CopyGroup;
module.exports.FindIPort = FindIPort;

// Requirements
var Wire     = require("../models/Wire");
var WirePort = require("../models/WirePort");
// 
},{"../models/Wire":52,"../models/WirePort":53}],31:[function(require,module,exports){
var Y_KEY = require("./Constants").Y_KEY;
var Z_KEY = require("./Constants").Z_KEY;

class HistoryManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
    }
    onKeyDown(code, input) {
        if (Input.getModifierKeyDown()) {
            if (code === Y_KEY || (code === Z_KEY && Input.getShiftKeyDown()))
                this.redo();
            else if (code === Z_KEY)
                this.undo();
        }
    }
    add(action) {
        // Check for empty group action
        if (action instanceof GroupAction &&
            action.actions.length == 0) {
                return;
        }

        // Check for selection and deselection action
        // Added one after another to combine
        if (action instanceof GroupAction &&
            action.actions[0] instanceof SelectAction) {
                var prev = this.undoStack[this.undoStack.length-1];
                if (this.undoStack.length > 0 &&
                    !action.actions[0].flip &&
                    prev instanceof GroupAction &&
                    prev.actions[0] instanceof SelectAction &&
                    prev.actions[0].flip) {
                        var newAction = new GroupAction();
                        newAction.add(action);
                        newAction.add(prev);
                        this.redoStack = [];
                        this.undoStack[this.undoStack.length-1] = newAction;
                        return;
                    }
        }
        this.redoStack = [];
        this.undoStack.push(action);
    }
    undo() {
        if (this.undoStack.length > 0) {
            var action = this.undoStack.pop();
            action.undo();
            this.redoStack.push(action);
            // Update popup's values
            SelectionPopup.update();
            render();
        }
    }
    redo() {
        if (this.redoStack.length > 0) {
            var action = this.redoStack.pop();
            action.redo();
            this.undoStack.push(action);
            // Update popup's values
            SelectionPopup.update();
            render();
        }
    }
}

module.exports = HistoryManager;

// Requirements
var Input          = require("../controllers/Input");
var SelectionPopup = require("../controllers/selectionpopup/SelectionPopup");
var SelectAction   = require("./actions/SelectAction");
var GroupAction    = require("./actions/GroupAction");

var render = require("../views/Renderer").render;
// 
},{"../controllers/Input":4,"../controllers/selectionpopup/SelectionPopup":22,"../views/Renderer":77,"./Constants":28,"./actions/GroupAction":38,"./actions/SelectAction":40}],32:[function(require,module,exports){
var Images = [];
Images.load = function(names, index, onFinish) {
    var img = new Image();
    img.onload = function() {
        Images[names[index]] = img;
        img.dx = 0;
        img.dy = 0;
        img.ratio = img.width / img.height;
        if (index === names.length-1)
            onFinish();
        else
            Images.load(names, index+1, onFinish);
    };
    img.src = "img/items/" + names[index];
};
module.exports = Images;
},{}],33:[function(require,module,exports){
var PROPAGATION_TIME = require("./Constants").PROPAGATION_TIME;

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

},{"./Constants":28}],34:[function(require,module,exports){
class UIDManager {
    constructor(context) {
        this.context = context;
        this.counter = 0;
    }
    giveUIDTo(obj) {
        if (!obj.uid)
            obj.uid = (this.counter++);
    }
    redistribute() {
        var things = this.context.getObjects().concat(this.context.getWires());
        this.counter = 0;
        for (var i = 0; i < things.length; i++)
            things[i].uid = (this.counter++);
    }
}

/**
 * Finds and returns the thing in the given
 * array that has the given uid (Unique Identification)
 *
 * @param  {Array} things
 *         The group of things to search
 *
 * @param  {Integer} uid
 *         The target unique identification to search for
 *
 * @return {IOObject}
 *         The object with the given uid or undefined if
 *         the object is not found
 */
UIDManager.find = function(things, target) {
    for (var i = 0; i < things.length; i++) {
        if (things[i].uid === target)
            return things[i];
    }
    return undefined;
}

module.exports = UIDManager;
},{}],35:[function(require,module,exports){

/**
 * Determines whether the given point is
 * within the rectangle defined by the
 * given transform
 *
 * @param  {Transform} transform
 *         The transform that represents the rectangle
 *
 * @param  {Vector} pos
 *         * Must be in world coordinates *
 *         The point to determine whether or not
 *         it's within the rectangle
 *
 * @return {Boolean}
 *         True if the point is within the rectangle,
 *         false otherwise
 */
var RectContains = (function() {
	return function(transform, pos) {
        var tr = transform.size.scale(0.5);
        var bl = transform.size.scale(-0.5);
        var p  = transform.toLocalSpace(pos);

        return (p.x > bl.x &&
                p.y > bl.y &&
                p.x < tr.x &&
                p.y < tr.y);
	}
})();

/**
 * Determines whether the given point
 * is within the circle defined by the
 * given transform
 *
 * @param  {Transform} transform
 *         The transform that represents the circle
 *
 * @param  {Vector} pos
 *         * Must be in world coordinates *
 *         The point to determine whether or not
 *         it's within the rectangle
 *
 * @return {Boolean}
 *          True if the point is within the rectangle,
 *          false otherwise
 */
var CircleContains = (function() {
	return function(transform, pos) {
        var v = transform.toLocalSpace(pos);
        return (v.len2() <= transform.size.x*transform.size.x/4);
	}
})();

/**
 * Compares two transforms to see if they overlap.
 * First tests it using a quick circle-circle
 * intersection using the 'radius' of the transform
 *
 * Then uses a SAT (Separating Axis Theorem) method
 * to determine whether or not the two transforms
 * are intersecting
 *
 * @param  {Transform} a
 *         The first transform
 *
 * @param  {Transform} b
 *         The second transform
 *
 * @return {Boolean}
 *         True if the two transforms are overlapping,
 *         false otherwise
 */
var TransformContains = (function() {
	return function(A, B) {
        // If both transforms are non-rotated
        if (Math.abs(A.getAngle()) <= 1e-5 && Math.abs(B.getAngle()) <= 1e-5) {
            var aPos = A.getPos(), aSize = A.getSize();
            var bPos = B.getPos(), bSize = B.getSize();
            return (Math.abs(aPos.x - bPos.x) * 2 < (aSize.x + bSize.x)) &&
                   (Math.abs(aPos.y - bPos.y) * 2 < (aSize.y + bSize.y));
        }

        // Quick check circle-circle intersection
        var r1 = A.getRadius();
        var r2 = B.getRadius();
        var sr = r1 + r2;                       // Sum of radius
        var dpos = A.getPos().sub(B.getPos());  // Delta position
        if (dpos.dot(dpos) > sr*sr)
            return false;

        /* Perform SAT */

        // Get corners in local space of transform A
        var a = A.getLocalCorners();

        // Transform B's corners into A local space
        var bworld = B.getCorners();
        var b = [];
        for (var i = 0; i < 4; i++) {
            b[i] = A.toLocalSpace(bworld[i]);

            // Offsets x and y to fix perfect lines
            // where b[0] = b[1] & b[2] = b[3]
            b[i].x += 0.0001*i;
            b[i].y += 0.0001*i;
        }

        var corners = a.concat(b);

        var minA, maxA, minB, maxB;

        // SAT w/ x-axis
        // Axis is <1, 0>
        // So dot product is just the x-value
        minA = maxA = corners[0].x;
        minB = maxB = corners[4].x;
        for (var j = 1; j < 4; j++) {
            minA = Math.min(corners[j].x, minA);
            maxA = Math.max(corners[j].x, maxA);
            minB = Math.min(corners[j+4].x, minB);
            maxB = Math.max(corners[j+4].x, maxB);
        }
        if (maxA < minB || maxB < minA)
            return false;

        // SAT w/ y-axis
        // Axis is <1, 0>
        // So dot product is just the y-value
        minA = maxA = corners[0].y;
        minB = maxB = corners[4].y;
        for (var j = 1; j < 4; j++) {
            minA = Math.min(corners[j].y, minA);
            maxA = Math.max(corners[j].y, maxA);
            minB = Math.min(corners[j+4].y, minB);
            maxB = Math.max(corners[j+4].y, maxB);
        }
        if (maxA < minB || maxB < minA)
            return false;

        // SAT w/ other two axes
        var normals = [b[3].sub(b[0]), b[3].sub(b[2])];
        for (var i = 0; i < normals.length; i++) {
            var normal = normals[i];
            var minA = undefined, maxA = undefined;
            var minB = undefined, maxB = undefined;
            for (var j = 0; j < 4; j++) {
                var s = corners[j].dot(normal);
                minA = Math.min(s, (minA ? minA :  Infinity));
                maxA = Math.max(s, (maxA ? maxA : -Infinity));
                var s2 = corners[j+4].dot(normal);
                minB = Math.min(s2, (minB ? minB :  Infinity));
                maxB = Math.max(s2, (maxB ? maxB : -Infinity));
            }
            if (maxA < minB || maxB < minA)
                return false;
        }

        return true;
	}
})();

/**
 * Returns the nearest point on the edge
 * of the given rectangle.
 *
 * @param  {Vector} bl
 *         Bottom left corner of the rectangle
 *
 * @param  {Vector} tr
 *         Top right corner of the rectangle
 *
 * @param  {Vector} pos
 *         The position to get the nearest point on
 *
 * @return {Vector}
 *         The closest position on the edge of
 *         the rectangle from 'pos'
 */
var GetNearestPointOnRect = (function() {
    var V = require("./math/Vector").V;
    
	return function(bl, tr, pos) {
        if (pos.x < bl.x)
            return V(bl.x, Clamp(pos.y, bl.y, tr.y));
        if (pos.x > tr.x)
            return V(tr.x, Clamp(pos.y, bl.y, tr.y));
        if (pos.y < bl.y)
            return V(Clamp(pos.x, bl.x, tr.x), bl.y);
        if (pos.y > tr.y)
            return V(Clamp(pos.x, bl.x, tr.x), tr.y);
        return V(0, 0);
	}
})();

// Okay, I know this is awful but it's like 5:47 am and I'm tired

/**
 * [GetAllThingsBetween description]
 * @param       {[type]} things [description]
 * @constructor
 */
var GetAllThingsBetween = (function() {
    var IOObject, Wire, WirePort, IPort, OPort;
    
	return function(things) {
        if (!Wire) {
            IOObject = require("../models/IOObject");
            Wire     = require("../models/Wire");
            WirePort = require("../models/WirePort");
            IPort    = require("../models/IPort");
            OPort    = require("../models/OPort");
        }
        
        var objects = [];
        var wiresAndPorts = [];
        for (var i = 0; i < things.length; i++) {
            if (things[i] instanceof Wire || things[i] instanceof WirePort)
                wiresAndPorts.push(things[i]);
            else if (things[i] instanceof IOObject)
                objects.push(things[i]);
        }
        var allTheThings = [];
        for (var i = 0; i < objects.length; i++) {
            allTheThings.push(objects[i]);
            for (var j = 0; j < objects[i].inputs.length; j++) {
                var iport = objects[i].inputs[j];
                obj = iport.input;
                while (obj != undefined && !(obj instanceof OPort)) {
                    if (FindByUID(allTheThings, obj.uid) == undefined) // If not added yet
                        allTheThings.push(obj);
                    obj = obj.input;
                }
            }
            for (var j = 0; j < objects[i].outputs.length; j++) {
                var oport = objects[i].outputs[j];
                for (var k = 0; k < oport.connections.length; k++) {
                    obj = oport.connections[k];
                    while (obj != undefined && !(obj instanceof IPort)) {
                        if (FindByUID(allTheThings, obj.uid) == undefined) // If not added yet
                            allTheThings.push(obj);
                        obj = obj.connection;
                    }
                }
            }
        }
        for (var i = 0; i < wiresAndPorts.length; i++) {
            allTheThings.push(wiresAndPorts[i]);
            var obj = wiresAndPorts[i].input;
            while (obj != undefined && !(obj instanceof OPort)) {
                if (FindByUID(allTheThings, obj.uid) == undefined) // If not added yet
                    allTheThings.push(obj);
                obj = obj.input;
            }
            obj = wiresAndPorts[i].connection;
            while (obj != undefined && !(obj instanceof IPort)) {
                if (FindByUID(allTheThings, obj.uid) == undefined) // If not added yet
                    allTheThings.push(obj);
                obj = obj.connection;
            }
        }
        return allTheThings;
	}
})();

/**
 * Finds and returns all the inter-connected wires
 * in a given group of objects
 *
 * @param  {Array} objects
 *         The group of objects to find the wires
 *         in between
 *
 * @return {Array}
 *         The resulting wires
 */
var GetAllWires = (function() {
    var WirePort;
    
	return function(objects) {
        if (!WirePort) {
            WirePort = require("../models/WirePort");
        }
        
        var wires = [];
        for (var i = 0; i < objects.length; i++) {
            var obj = objects[i];
            for (var j = 0; j < obj.outputs.length; j++) {
                var connections = obj.outputs[j].connections;
                for (var k = 0; k < connections.length; k++) {
                    var wire = connections[k];
                    while (wire.connection instanceof WirePort) {
                        wires.push(wire);
                        wire = wire.connection.connection;
                    }
                    wires.push(wire);
                }
            }
        }
        return wires;
	}
})();

/**
 * Removes all objects and wires+wireports
 * between them
 * 
 * @param  {Context} ctx
 *         The context which the objects are apart of
 *         
 * @param  {Array} objects
 *         The array of objects in which to remove
 *         
 * @param  {Boolean} doAction
 *         True if the action should be re/undoable,
 *         False otherwise
 */
var RemoveObjects = (function() {
    var SelectionTool, GroupAction, DeleteAction, Wire, WirePort, render;

	return function(ctx, objects, doAction) {
        if (!GroupAction) {
            SelectionTool = require("../controllers/tools/SelectionTool");
            GroupAction   = require("./actions/GroupAction");
            DeleteAction  = require("./actions/DeleteAction");
            Wire          = require("../models/Wire");
            WirePort      = require("../models/WirePort");
            
            render = require("../views/Renderer").render;
        }
        
        if (objects.length === 0)
            return;
            
        var action = new GroupAction();
        var things = GetAllThingsBetween(objects);
        for (var i = 0; i < things.length; i++) {
            if (things[i].selected)
                SelectionTool.deselect([things[i]]);
            if (things[i] instanceof Wire || things[i] instanceof WirePort) {
                var oldinput = things[i].input;
                var oldconnection = things[i].connection;
                things[i].remove();
                if (doAction)
                    action.add(new DeleteAction(things[i], oldinput, oldconnection));
            }
        }
        for (var i = 0; i < things.length; i++) {
            if (!(things[i] instanceof Wire || things[i] instanceof WirePort)) {
                things[i].remove();
                if (doAction)
                    action.add(new DeleteAction(things[i]));
            }
        }
        if (doAction)
            ctx.addAction(action);
        render();
	}
})();

/**
 * Simply copies all elements of an array into
 * another array and returns that array
 * [DOES NOT COPY EACH OBJECT IN THE ARRAY]
 * 
 * @param  {Array} arr
 *         The array to copy
 *
 * @return {Array}
 *         The copied array
 */
var CopyArray = (function() {
	return function(arr) {
        var copy = [];
        for (var i = 0; i < arr.length; i++)
            copy.push(arr[i]);
        return copy;
	}
})();

/**
 * Finds and returns the IC from a given icuid
 *
 * @param  {Integer} id
 *         The icuid of the target IC
 *         (Integrated Circuit Unique Identification)
 *
 * @return {IC}
 *         The ic with the given icuid or undefined if
 *         the IC is not found
 */
var FindIC = (function() {
	return function(id, ics) {
        for (var i = 0; i < ics.length; i++) {
            if (ics[i].icuid === id)
                return ics[i];
        }
        return undefined;
	}
})();

/**
 * [FindByUID description]
 * @param       {[type]} objects [description]
 * @param       {[type]} id      [description]
 * @constructor
 */
var FindByUID = (function() {
	return function(objects, id) {
        for (var i = 0; i < objects.length; i++) {
            if (objects[i].uid === id)
                return objects[i];
        }
        return undefined;
	}
})();

/**
 * Creates a group transform action given
 * the relevant objects and their original
 * transforms
 * 
 * @param  {Array} objects
 *         The array of objects who have been transformed
 * 
 * @param  {Array} t0
 *         The array of transforms that correspond to
 *         the original transform of the object in objects
 */
var CreateTransformAction = (function() {
    var GroupAction, TransformAction;
    
	return function(objects, t0) {
        if (!GroupAction) {
            GroupAction     = require("./actions/GroupAction");
            TransformAction = require("./actions/TransformAction");
        }
        
        var action = new GroupAction();
        for (var i = 0; i < objects.length; i++) {
            var origin = t0[i];
            var target = objects[i].transform.copy();
            if (origin.equals(target))
                continue;
            action.add(new TransformAction(objects[i], origin, target));
        }
        return action;
	}
})();

/**
 * Finds and returns the closest 't' value
 * of the parametric equation for a line.
 *
 * Parametric function defined by
 * X(t) = t(p2.x - p1.x) + p1.x
 * Y(t) = t(p2.y - p1.y) + p1.y
 *
 * Solves for 't' from root of the derivative of
 * the distance function between the line and <mx, my>
 * D(t) = sqrt((X(t) - mx)^2 + (Y(t) - my)^2)
 *
 * @param  {Vector} p1
 *         The first point of the line
 *
 * @param  {Vector} p2
 *         The second point of the line
 *
 * @param  {Number} mx
 *         The x-value of the point
 *         to determine the 't' value
 *
 * @param  {Number} my
 *         The y-value of the point
 *         to determine the 't' value
 *
 * @return {Number}
 *         The nearest 't' value of <mx, my>
 *         on the line p1->p2 or -1 if the
 *         dist < WIRE_DIST_THRESHOLD
 */
var GetNearestT = (function() {
    var WIRE_DIST_THRESHOLD2 = require("./Constants").WIRE_DIST_THRESHOLD2;
    
	return function(p1, p2, mx, my) {
        var dx = p2.x - p1.x;
        var dy = p2.y - p1.y;
        var t = (dx*(mx - p1.x) + dy*(my - p1.y))/(dx*dx + dy*dy);
        t = Clamp(t, 0, 1);
        var pos = V(dx * t + p1.x, dy * t + p1.y);
        if (pos.sub(V(mx, my)).len2() < WIRE_DIST_THRESHOLD2)
            return t;
        else
            return -1;
	}
})();

/**
 * Uses Newton's method to find the roots of
 * the function 'f' given a derivative 'df'
 *
 * @param  {Number} iterations
 *         The number of iterations to perform
 *         Newton's method with; the smaller
 *         the better but less accurate
 *
 * @param  {Number} t0
 *         The starting root value parameter
 *
 * @param  {Number} x
 *         Parameter 1 for the function
 *
 * @param  {Number} y
 *         Parameter 2 for the function
 *
 * @param  {Function} f
 *         The function to find the roots of
 *         In the form f(t, x, y) = ...
 *
 * @param  {Function} df
 *         The derivative of the function
 *         In the form of df(t, x, y)
 *
 * @return {Number}
 *         The parameter 't' that results in
 *         f(t, x, y) = 0
 */
var FindRoots = (function() {
	return function(iterations, t0, x, y, f, df) {
        var t = t0;
        do {
            var v = f(t, x, y);
            var dv = df(t, x, y);
            if (dv === 0)
                break;
            t = t - v / dv;
            t = Clamp(t, 0.01, 0.99);
        } while((iterations--) > 0);
        return t;
	}
})();

// Separates an array of objects into three sub-groups
// of input-type objects (switch and buttons),
// output-type objects (LEDs),
// and other components.
var SeparateGroup = (function() {
    var Switch, Button, Clock, LED;
	return function(group) {
        if (!Switch) {
            Switch = require("../models/ioobjects/inputs/Switch");
            Button = require("../models/ioobjects/inputs/Button");
            Clock  = require("../models/ioobjects/inputs/Clock");
            LED    = require("../models/ioobjects/outputs/LED");
        }
        
        var inputs = [];
        var components = [];
        var outputs = [];
        for (var i = 0; i < group.length; i++) {
            var object = group[i];
            if (object instanceof Switch || object instanceof Button || object instanceof Clock)
                inputs.push(object);
            else if (object instanceof LED)
                outputs.push(object);
            else
                components.push(object);
        }
        return {inputs:inputs, components:components, outputs:outputs};
	}
})();

/**
 * Clamps a number between a given min and max
 *
 * @param  {Number} x
 *         The number to Clamp
 *
 * @param  {Number} min
 *         The minimum
 *
 * @param  {Number} max
 *         The maximum
 *
 * @return {Number}
 *         The Clamped number
 */
var Clamp = (function() {
	return function(x, min, max) {
        return Math.min(Math.max(x, min), max);
	}
})();

// Code from https://stackoverflow.com/questions/5916900/how-can-you-detect-the-version-of-a-browser
var GetBrowser = (function() {
    return function() {
        if (navigator == undefined)
            return;
        var ua=navigator.userAgent,tem,M=ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
        if(/trident/i.test(M[1])) {
            tem=/\brv[ :]+(\d+)/g.exec(ua) || [];
            return {name:'IE',version:(tem[1]||'')};
        }
        if(M[1]==='Chrome') {
            tem=ua.match(/\bOPR|Edge\/(\d+)/)
            if(tem!=null)   {return {name:'Opera', version:tem[1]};}
        }
        M=M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
        if((tem=ua.match(/version\/(\d+)/i))!=null) {M.splice(1,1,tem[1]);}
        return {
          name: M[0],
          version: M[1]
        };
    }
})();

module.exports.RectContains = RectContains;
module.exports.CircleContains = CircleContains;
module.exports.TransformContains = TransformContains;
module.exports.GetNearestPointOnRect = GetNearestPointOnRect;
module.exports.GetAllThingsBetween = GetAllThingsBetween;
module.exports.GetAllWires = GetAllWires;
module.exports.RemoveObjects = RemoveObjects;
module.exports.CopyArray = CopyArray;
module.exports.FindIC = FindIC;
module.exports.FindByUID = FindByUID;
module.exports.CreateTransformAction = CreateTransformAction;
module.exports.GetNearestT = GetNearestT;
module.exports.FindRoots = FindRoots;
module.exports.SeparateGroup = SeparateGroup;
module.exports.Clamp = Clamp;
module.exports.GetBrowser = GetBrowser;

},{"../controllers/tools/SelectionTool":25,"../models/IOObject":48,"../models/IPort":50,"../models/OPort":51,"../models/Wire":52,"../models/WirePort":53,"../models/ioobjects/inputs/Button":60,"../models/ioobjects/inputs/Clock":61,"../models/ioobjects/inputs/Switch":65,"../models/ioobjects/outputs/LED":74,"../views/Renderer":77,"./Constants":28,"./actions/DeleteAction":37,"./actions/GroupAction":38,"./actions/TransformAction":41,"./math/Vector":45}],36:[function(require,module,exports){
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
},{"../Context":29}],37:[function(require,module,exports){
var Action = require("./Action");

class DeleteAction extends Action {
    constructor(obj, oldinput, oldconnection) {
        super();
        this.obj = obj;
        this.oldinput = oldinput;
        this.oldconnection = oldconnection;
    }
    undo() {
        this.context.add(this.obj);
        if (this.oldinput != undefined)
            this.oldinput.connect(this.obj);
        if (this.oldconnection != undefined)
            this.obj.connect(this.oldconnection);
    }
    redo() {
        this.obj.remove();
    }
}

module.exports = Action;
},{"./Action":36}],38:[function(require,module,exports){
var Action = require("./Action");

class GroupAction extends Action {
    constructor() {
        super();
        this.actions = [];
    }
    add(action) {
        this.actions.push(action);
    }
    undo() {
        for (var i = this.actions.length-1; i >= 0; i--)
            this.actions[i].undo();
    }
    redo() {
        for (var i = 0; i < this.actions.length; i++)
            this.actions[i].redo();
    }
}

module.exports = GroupAction;
},{"./Action":36}],39:[function(require,module,exports){
var Action = require("./Action");

class PlaceAction extends Action {
    constructor(obj) {
        super();
        this.obj = obj;
    }
    undo() {
        this.context.remove(this.obj);
    }
    redo() {
        this.context.addObject(this.obj);
    }
}

module.exports = PlaceAction;
},{"./Action":36}],40:[function(require,module,exports){
var Action = require("./Action");

class SelectAction extends Action {
    constructor(obj, flip) {
        super();
        this.obj = obj;
        this.flip = flip;
    }
    undo() {
        if (this.flip)
            this.reselect();
        else
            this.deselect();
    }
    redo() {
        if (this.flip)
            this.deselect();
        else
            this.reselect();
    }
    reselect() {
        SelectionTool.select([this.obj]);
    }
    deselect() {
        SelectionTool.deselect([this.obj]);
    }
}

module.exports = SelectAction;

// Requirements
var SelectionTool = require("../../controllers/tools/SelectionTool");
// 
},{"../../controllers/tools/SelectionTool":25,"./Action":36}],41:[function(require,module,exports){
var Action = require("./Action");

class TransformAction extends Action {
    constructor(obj, t0, t1) {
        super();
        this.obj = obj;
        this.t0 = t0;
        this.t1 = t1;
    }
    undo() {
        this.obj.setTransform(this.t0);
        this.updatePopup();
    }
    redo() {
        this.obj.setTransform(this.t1);
        this.updatePopup();
    }
    updatePopup() {
        if (this.obj.selected) {
            SelectionTool.recalculateMidpoint();
            SelectionPopup.onMove();
        }
    }
}

module.exports = TransformAction;

// Requirements
var SelectionTool  = require("../../controllers/tools/SelectionTool");
var SelectionPopup = require("../../controllers/selectionpopup/SelectionPopup");
// 
},{"../../controllers/selectionpopup/SelectionPopup":22,"../../controllers/tools/SelectionTool":25,"./Action":36}],42:[function(require,module,exports){
var WIRE_DIST_ITERATIONS   = require("../Constants").WIRE_DIST_ITERATIONS;
var WIRE_NEWTON_ITERATIONS = require("../Constants").WIRE_NEWTON_ITERATIONS;
var WIRE_DIST_THRESHOLD2   = require("../Utils").WIRE_DIST_THRESHOLD2;

class BezierCurve {
    constructor(p1, p2, c1, c2) {
        this.p1 = V(p1.x,p1.y);
        this.p2 = V(p2.x,p2.y);
        this.c1 = V(c1.x,c1.y);
        this.c2 = V(c2.x,c2.y);
        this.dirty = true;
        this.boundingBox = new Transform(0,0,0,getCurrentContext().getCamera());
    }
    update(p1, p2, c1, c2) {
        this.p1.x = p1.x;
        this.p1.y = p1.y;
        this.p2.x = p2.x;
        this.p2.y = p2.y;
        this.c1.x = c1.x;
        this.c1.y = c1.y;
        this.c2.x = c2.x;
        this.c2.y = c2.y;
    }
    updateBoundingBox() {
        if (!this.dirty)
            return;
        this.dirty = false;

        var min = V(0, 0);
        var max = V(0, 0);
        var end1 = this.getPos(0);
        var end2 = this.getPos(1);
        var a = this.c1.sub(this.c2).scale(3).add(this.p2.sub(this.p1));
        var b = this.p1.sub(this.c1.scale(2).add(this.c2)).scale(2);
        var c = this.c1.sub(this.p1);

        var discriminant1 = b.y*b.y - 4*a.y*c.y;
        discriminant1 = (discriminant1 >= 0 ? Math.sqrt(discriminant1) : -1);
        var t1 = (discriminant1 !== -1 ? Clamp((-b.y + discriminant1)/(2*a.y),0,1) : 0);
        var t2 = (discriminant1 !== -1 ? Clamp((-b.y - discriminant1)/(2*a.y),0,1) : 0);
        max.y = Math.max(this.getY(t1), this.getY(t2), end1.y, end2.y);
        min.y = Math.min(this.getY(t1), this.getY(t2), end1.y, end2.y);

        var discriminant2 = b.x*b.x - 4*a.x*c.x;
        discriminant2 = (discriminant2 >= 0 ? Math.sqrt(discriminant2) : -1);
        var t3 = (discriminant2 !== -1 ? Clamp((-b.x + discriminant2)/(2*a.x),0,1) : 0);
        var t4 = (discriminant2 !== -1 ? Clamp((-b.x - discriminant2)/(2*a.x),0,1) : 0);
        max.x = Math.max(this.getX(t1), this.getX(t2), end1.x, end2.x);
        min.x = Math.min(this.getX(t1), this.getX(t2), end1.x, end2.x);

        this.boundingBox.setSize(V(max.x - min.x, max.y - min.y));
        this.boundingBox.setPos(V((max.x - min.x)/2 + min.x, (max.y - min.y)/2 + min.y));
    }
    draw(style, size, renderer) {
        var camera = renderer.parent.camera;

        var p1 = camera.getScreenPos(this.p1);
        var p2 = camera.getScreenPos(this.p2);
        var c1 = camera.getScreenPos(this.c1);
        var c2 = camera.getScreenPos(this.c2);

        renderer.curve(p1.x, p1.y, p2.x, p2.y, c1.x, c1.y, c2.x, c2.y, style, size);
    }
    getX(t) {
        var it = 1 - t;
        return this.p1.x*it*it*it + 3*this.c1.x*t*it*it + 3*this.c2.x*t*t*it + this.p2.x*t*t*t;
    }
    getY(t) {
        var it = 1 - t;
        return this.p1.y*it*it*it + 3*this.c1.y*t*it*it + 3*this.c2.y*t*t*it + this.p2.y*t*t*t;
    }
    getPos(t) {
        return V(this.getX(t), this.getY(t));
    }
    getDX(t) {
        var it = 1 - t;
        return -3*this.p1.x*it*it + 3*this.c1.x*it*(1-3*t) + 3*this.c2.x*t*(2-3*t) + 3*this.p2.x*t*t;
    }
    getDY(t) {
        var it = 1 - t;
        return -3*this.p1.y*it*it + 3*this.c1.y*it*(1-3*t) + 3*this.c2.y*t*(2-3*t) + 3*this.p2.y*t*t;
    }
    getVel(t) {
        return V(this.getDX(t), this.getDY(t));
    }
    getDDX(t) {
        var m = -this.p1.x + 3*this.c1.x - 3*this.c2.x + this.p2.x;
        var b = this.p1.x - 2*this.c1.x + this.c2.x;
        return 6*(m * t + b);
    }
    getDDY(t) {
        var m = -this.p1.y + 3*this.c1.y - 3*this.c2.y + this.p2.y;
        var b = this.p1.y - 2*this.c1.y + this.c2.y;
        return 6*(m * t + b);
    }
    getDist(t, mx, my) {
        var dx = this.getX(t) - mx;
        var dy = this.getY(t) - my;
        return Math.sqrt(dx*dx + dy*dy);
    }
    getDist2(t, mx, my) {
        var dx = this.getX(t) - mx;
        var dy = this.getY(t) - my;
        return dx*dx + dy*dy;
    }
    getDistDenominator(t, mx, my) {
        var dx = this.getX(t) - mx;
        var dy = this.getY(t) - my;
        return dx*dx + dy*dy;
    }
    getDistDenominatorDerivative(t, mx, my) {
        return  2*(this.getX(t) - mx) * this.getDX(t) +
                2*(this.getY(t) - my) * this.getDY(t);
    }
    getDistNumerator(t, mx, my) {
        var dx = this.getX(t) - mx;
        var dy = this.getY(t) - my;
        return  this.getDX(t)*dx +
                this.getDY(t)*dy;
    }
    getDistNumeratorDerivative(t, mx, my) {
        var dx = this.getX(t) - mx;
        var dy = this.getY(t) - my;
        var dbx = this.getDX(t);
        var dby = this.getDY(t);
        return  dbx*dbx + dx*this.getDDX(t) +
                dby*dby + dy*this.getDDY(t);
    }
    getNearestT(mx, my) {
        var minDist = 1e20;
        var t0 = -1;
        for (var tt = 0; tt <= 1.0; tt += 1.0 / WIRE_DIST_ITERATIONS) {
            var dist = this.getDist(tt, mx, my);
            if (dist < minDist) {
                t0 = tt;
                minDist = dist;
            }
        }

        // Newton's method to find parameter for when slope is undefined AKA denominator function = 0
        var t1 = FindRoots(WIRE_NEWTON_ITERATIONS, t0, mx, my, (t,x,y)=>this.getDistDenominator(t,x,y), (t,x,y)=>this.getDistDenominatorDerivative(t,x,y));
        if (this.getDist2(t1, mx, my) < WIRE_DIST_THRESHOLD2)
            return t1;

        // Newton's method to find parameter for when slope is 0 AKA numerator function = 0
        var t2 = FindRoots(WIRE_NEWTON_ITERATIONS, t0, mx, my, (t,x,y)=>this.getDistNumerator(t,x,y), (t,x,y)=>this.getDistNumeratorDerivative(t,x,y));
        if (this.getDist2(t2, mx, my) < WIRE_DIST_THRESHOLD2)
            return t2;

        return -1;
    }
    getBoundingBox() {
        this.updateBoundingBox();
        return this.boundingBox;
    }
    copy() {
        return new BezierCurve(this.p1.copy(), this.p2.copy(), this.c1.copy(), this.c2.copy());
    }
    writeTo(node) {
        var bezierNode = createChildNode(node, "bezier");
        createTextElement(bezierNode, "p1x", this.p1.x);
        createTextElement(bezierNode, "p1y", this.p1.y);
        createTextElement(bezierNode, "p2x", this.p2.x);
        createTextElement(bezierNode, "p2y", this.p2.y);
        createTextElement(bezierNode, "c1x", this.c1.x);
        createTextElement(bezierNode, "c1y", this.c1.y);
        createTextElement(bezierNode, "c2x", this.c2.x);
        createTextElement(bezierNode, "c2y", this.c2.y);
    }
    load(node) {
        var p1 = V(getFloatValue(getChildNode(node, "p1x")), getFloatValue(getChildNode(node, "p1y")));
        var p2 = V(getFloatValue(getChildNode(node, "p2x")), getFloatValue(getChildNode(node, "p2y")));
        var c1 = V(getFloatValue(getChildNode(node, "c1x")), getFloatValue(getChildNode(node, "c1y")));
        var c2 = V(getFloatValue(getChildNode(node, "c2x")), getFloatValue(getChildNode(node, "c2y")));
        this.update(p1, p2, c1, c2);
    }
}

module.exports = BezierCurve;

// Requirements
var V                 = require("./Vector").V;
var Transform         = require("./Transform");

var Clamp             = require("../Utils").Clamp;
var FindRoots         = require("../Utils").FindRoots;
var getCurrentContext = require("../Context").getCurrentContext;
var getChildNode      = require("../../controllers/Importer").getChildNode;
var getFloatValue     = require("../../controllers/Importer").getFloatValue;
var createChildNode   = require("../../controllers/Exporter").createChildNode;
var createTextElement = require("../../controllers/Exporter").createTextElement;
// 
},{"../../controllers/Exporter":1,"../../controllers/Importer":3,"../Constants":28,"../Context":29,"../Utils":35,"./Transform":44,"./Vector":45}],43:[function(require,module,exports){
var V = require("./Vector").V;

class Matrix2x3 {
    constructor(other) {
        this.mat = [];
        this.identity();
        if (other instanceof Matrix2x3) {
            for (var i = 0; i < 2*3; i++)
                this.mat[i] = other.mat[i];
        }
    }
    zero() {
        for (var i = 0; i < 2*3; i++)
            this.mat[i] = 0;
        return this;
    }
    identity() {
        this.zero();

        this.mat[0] = 1.0;
        this.mat[3] = 1.0;

        return this;
    }
    mul(v) {
        var result = V(0,0);
        result.x = this.mat[0] * v.x + this.mat[2] * v.y + this.mat[4];
        result.y = this.mat[1] * v.x + this.mat[3] * v.y + this.mat[5];
        return result;
    }
    mult(m) {
        var result = new Matrix2x3();
        result.mat[0] = this.mat[0]*m.mat[0] + this.mat[2]*m.mat[1];
        result.mat[1] = this.mat[1]*m.mat[0] + this.mat[3]*m.mat[1];
        result.mat[2] = this.mat[0]*m.mat[2] + this.mat[2]*m.mat[3];
        result.mat[3] = this.mat[1]*m.mat[2] + this.mat[3]*m.mat[3];
        result.mat[4] = this.mat[0]*m.mat[4] + this.mat[2]*m.mat[5] + this.mat[4];
        result.mat[5] = this.mat[1]*m.mat[4] + this.mat[3]*m.mat[5] + this.mat[5];
        return result;
    }
    translate(v) {
        this.mat[4] += this.mat[0] * v.x + this.mat[2] * v.y;
        this.mat[5] += this.mat[1] * v.x + this.mat[3] * v.y;
    }
    rotate(theta) {
        var c = Math.cos(theta);
        var s = Math.sin(theta);
        var m11 = this.mat[0] * c + this.mat[2] * s;
        var m12 = this.mat[1] * c + this.mat[3] * s;
        var m21 = this.mat[0] * -s + this.mat[2] * c;
        var m22 = this.mat[1] * -s + this.mat[3] * c;
        this.mat[0] = m11;
        this.mat[1] = m12;
        this.mat[2] = m21;
        this.mat[3] = m22;
    }
    scale(s) {
        this.mat[0] *= s.x;
        this.mat[1] *= s.x;
        this.mat[2] *= s.y;
        this.mat[3] *= s.y;
    }
    inverse() {
        var inv = new Array(3*2);
        var det;

        inv[0] = this.mat[3];
        inv[1] = -this.mat[1];
        inv[2] = -this.mat[2];
        inv[3] = this.mat[0];
        inv[4] = this.mat[2] * this.mat[5] -
                 this.mat[4] * this.mat[3];
        inv[5] = this.mat[4] * this.mat[1] -
                 this.mat[0] * this.mat[5];

        det = this.mat[0]*this.mat[3] - this.mat[1]*this.mat[2];

        if (det == 0)
            return undefined;

        det = 1.0 / det;

        var m = new Matrix2x3();
        for (var i = 0; i < 2*3; i++)
            m.mat[i] = inv[i] * det;

        return m;
    }
    print() {
        console.log("[" + this.mat[0].toFixed(3) + ", " + this.mat[2].toFixed(3) + ", " + this.mat[4].toFixed(3) + "]\n" +
                    "[" + this.mat[1].toFixed(3) + ", " + this.mat[3].toFixed(3) + ", " + this.mat[5].toFixed(3) + "]");
    }
}

module.exports = Matrix2x3;
},{"./Vector":45}],44:[function(require,module,exports){
var V         = require("./Vector").V;
var Matrix2x3 = require("./Matrix");

class Transform {
    constructor(pos, size, angle, camera) {
        this.parent = undefined;
        this.pos = V(pos.x, pos.y);
        this.size = V(size.x, size.y);
        this.angle = angle;
        this.scale = V(1, 1);
        this.corners = [];
        this.localCorners = [];
        this.camera = camera;
        this.dirty = true;
        this.dirtySize = true;
        this.dirtyCorners = true;
        this.updateMatrix();
    }
    updateMatrix(c) {
        if (!this.dirty)
            return;
        this.dirty = false;

        this.matrix = new Matrix2x3();
        this.matrix.translate(this.pos);
        this.matrix.rotate(this.angle);
        this.matrix.scale(this.scale);

        if (this.parent != undefined)
            this.matrix = this.parent.getMatrix().mult(this.matrix);

        this.inverse = this.matrix.inverse();
    }
    updateSize() {
        if (!this.dirtySize)
            return;
        this.dirtySize = false;

        this.localCorners = [this.size.scale(V(-0.5, 0.5)), this.size.scale(V(0.5, 0.5)),
                             this.size.scale(V(0.5, -0.5)), this.size.scale(V(-0.5, -0.5))];

        this.radius = Math.sqrt(this.size.x*this.size.x + this.size.y*this.size.y)/2;
    }
    updateCorners() {
        if (!this.dirtyCorners)
            return;
        this.dirtyCorners = false;

        var corners = this.getLocalCorners();
        for (var i = 0; i < 4; i++)
            this.corners[i] = this.toWorldSpace(corners[i]);
    }
    transformCtx(ctx) {
        this.updateMatrix();
        var m = new Matrix2x3(this.matrix);
        var v = this.camera.getScreenPos(V(m.mat[4], m.mat[5]));
        m.mat[4] = v.x, m.mat[5] = v.y;
        m.scale(V(1/this.camera.zoom, 1/this.camera.zoom));
        ctx.setTransform(m.mat[0], m.mat[1], m.mat[2], m.mat[3], m.mat[4], m.mat[5]);
    }
    rotateAbout(a, c) {
        this.setAngle(a);
        this.setPos(this.pos.sub(c));
        var cos = Math.cos(a), sin = Math.sin(a);
        var xx = this.pos.x * cos - this.pos.y * sin;
        var yy = this.pos.y * cos + this.pos.x * sin;
        this.setPos(V(xx, yy).add(c));
        this.dirty = true;
        this.dirtyCorners = true;
    }
    setParent(t) {
        this.parent = t;
        this.dirty = true;
        this.dirtyCorners = true;
    }
    setCamera(c) {
        this.camera = c;
    }
    setPos(p) {
        this.pos.x = p.x;
        this.pos.y = p.y;
        this.dirty = true;
        this.dirtyCorners = true;
    }
    setAngle(a) {
        this.angle = a;
        this.dirty = true;
        this.dirtyCorners = true;
    }
    setScale(s) {
        this.scale.x = s.x;
        this.scale.y = s.y;
        this.dirty = true;
    }
    setSize(s) {
        this.size.x = s.x;
        this.size.y = s.y;
        this.dirtySize = true;
        this.dirtyCorners = true;
    }
    setWidth(w) {
        this.size.x = w;
        this.dirtySize = true;
        this.dirtyCorners = true;
    }
    setHeight(h) {
        this.size.y = h;
        this.dirtySize = true;
        this.dirtyCorners = true;
    }
    toLocalSpace(v) { // v must be in world coords
        return this.getInverseMatrix().mul(v);
    }
    toWorldSpace(v) { // v must be in local coords
        return this.getMatrix().mul(v);
    }
    getPos() {
        return V(this.pos.x, this.pos.y);
    }
    getAngle() {
        return this.angle;
    }
    getScale() {
        return V(this.scale.x, this.scale.y);
    }
    getSize() {
        return this.size;
    }
    getRadius() {
        this.updateSize();
        return this.radius;
    }
    getMatrix() {
        this.updateMatrix();
        return this.matrix;
    }
    getInverseMatrix() {
        this.updateMatrix();
        return this.inverse;
    }
    getBottomLeft() {
        this.updateCorners();
        return this.corners[0];
    }
    getBottomRight() {
        this.updateCorners();
        return this.corners[1];
    }
    getTopRight() {
        this.updateCorners();
        return this.corners[2];
    }
    getTopLeft() {
        this.updateCorners();
        return this.corners[3];
    }
    getCorners() {
        this.updateCorners();
        return this.corners;
    }
    getLocalCorners() {
        this.updateSize();
        return this.localCorners;
    }
    equals(other) {
        if (!(other instanceof Transform))
            return false;

        var m1 = this.getMatrix();
        var m2 = other.getMatrix();
        for (var i = 0; i < m1.mat.length; i++) {
            if (m1[i] !== m2[i])
                return false;
        }
        return true;
    }
    print() {
        this.updateMatrix();
        this.matrix.print();
    }
    copy() {
        var trans = new Transform(this.pos.copy(), this.size.copy(), this.angle, this.camera);
        trans.scale = this.scale.copy();
        trans.dirty = true;
        return trans;
    }
}

module.exports = Transform;
},{"./Matrix":43,"./Vector":45}],45:[function(require,module,exports){

// Utility method for a new Vector
function V(x, y) {
    return new Vector(x, y);
}

class Vector {
    constructor(x, y) {
        this.set(x, y);
    }
    set(x, y) {
        if (x instanceof Vector) {
            this.x = (x.x ? x.x : 0);
            this.y = (x.y ? x.y : 0);
        } else {
            this.x = (x ? x : 0);
            this.y = (y ? y : 0);
        }
    }
    translate(dx, dy) {
        if (dx instanceof Vector)
            this.set(this.add(dx));
        else
            this.set(this.x + dx, this.y + dy);
    }
    add(x, y) {
        if (x instanceof Vector)
            return new Vector(this.x + x.x, this.y + x.y);
        else
            return new Vector(this.x + x, this.y + y);
    }
    sub(x, y) {
        if (x instanceof Vector)
            return new Vector(this.x - x.x, this.y - x.y);
        else
            return new Vector(this.x - x, this.y - y);
    }
    scale(a) {
        if (a instanceof Vector)
            return new Vector(a.x * this.x, a.y * this.y);
        else
            return new Vector(a * this.x, a * this.y);
    }
    normalize() {
        var len = this.len();
        if (len === 0) {
            return new Vector(0, 0);
        } else {
            var invLen = 1 / len;
            return new Vector(this.x * invLen, this.y * invLen);
        }
    }
    len() {
        return Math.sqrt(this.x*this.x + this.y*this.y);
    }
    len2() {
        return this.x*this.x + this.y*this.y;
    }
    distanceTo(v) {
        return this.sub(v).len();
    }
    dot(v) {
        return this.x * v.x + this.y * v.y;
    }
    project(v) {
        return this.scale(v.dot(this) / this.len2());
    }
    copy() {
        return new Vector(this.x, this.y);
    }
}

module.exports = Vector;
module.exports.V = V;
},{}],46:[function(require,module,exports){
class Module {
    constructor(parent, divName, divTextName) {
        this.parent = parent;
        this.div = document.getElementById(divName);
        this.divtext = (divTextName ? document.getElementById(divTextName) : undefined);
        this.div.oninput = () => { render(); this.onChange(); };
        this.div.onclick = () => this.onClick();
        this.div.onfocus = () => this.onFocus();
        this.div.onblur =  () => this.onBlur();
    }
    blur() {
        this.div.blur();
    }
    onShow() {}
    setValue(val) {
        this.div.value = val;
    }
    setPlaceholder(val) {
        this.div.placeholder = val;
    }
    setVisibility(val) {
        this.div.style.display = val;
        if (this.divtext != undefined)
            this.divtext.style.display = val;
    }
    setDisabled(val) {
        this.div.disabled = val;
    }
    getValue() {
        return this.div.value;
    }
    onChange() {}
    onClick() {}
    onFocus() {
        this.parent.focused = true;
    }
    onBlur() {
        this.parent.focused = false;
    }
}

module.exports = Module;

// Requirements
var render = require("../../views/Renderer").render;
//
},{"../../views/Renderer":77}],47:[function(require,module,exports){
var ITEMNAV_WIDTH = require("../Constants").ITEMNAV_WIDTH;

class Popup {
    constructor(divName) {
        this.div = document.getElementById(divName);
        this.div.addEventListener('keydown', e => {this.onKeyDown(e.keyCode);}, false);
        this.div.addEventListener('keyup',   e => {this.onKeyUp  (e.keyCode);}, false);
        this.div.style.position = "absolute";
        this.focused = false;

        this.modules = [];

        this.setPos(V(0,0));
        this.hide();
    }
    onKeyDown(code) {
    }
    onKeyUp(code) {
    }
    add(m) {
        this.modules.push(m);
    }
    update() {
        this.onShow();
    }
    onShow() {
        for (var i = 0; i < this.modules.length; i++)
            this.modules[i].onShow();
    }
    blur() {
        for (var i = 0; i < this.modules.length; i++)
            this.modules[i].blur();
    }
    show() {
        this.hidden = false;
        this.div.style.visibility = "visible";
        this.div.focus();
        this.onShow();
    }
    hide() {
        this.hidden = true;
        this.div.style.visibility = "hidden";
        this.div.blur();
    }
    setPos(v) {
        this.pos = V(v.x, v.y);
        this.clamp();

        this.div.style.left = this.pos.x + "px";
        this.div.style.top = this.pos.y + "px";
    }
    clamp() {
        this.pos.x = Math.max(Math.min(this.pos.x, window.innerWidth -this.div.clientWidth -1), ItemNavController.isOpen ? ITEMNAV_WIDTH+5 : 5);
        this.pos.y = Math.max(Math.min(this.pos.y, window.innerHeight-this.div.clientHeight-1), (header ? header.clientHeight : 0)+5);
    }
}

module.exports = Popup;

// Requirements
var V                 = require("../math/Vector").V;
var ItemNavController = require("../../controllers/ItemNavController");
// 
},{"../../controllers/ItemNavController":5,"../Constants":28,"../math/Vector":45}],48:[function(require,module,exports){
var IO_PORT_RADIUS = require("../libraries/Constants").IO_PORT_RADIUS;

class IOObject {
    constructor(context, x, y, w, h, img, isPressable, maxInputs, maxOutputs, selectionBoxWidth, selectionBoxHeight) {
        if (context == undefined)
            context = getCurrentContext();
        this.context = context;
        x = (x == undefined ? 0 : x);
        y = (y == undefined ? 0 : y)
        this.transform = new Transform(V(x, y), V(w, h), 0, context.getCamera());
        this.cullTransform = new Transform(this.transform.getPos(), V(0,0), 0, context.getCamera());

        this.name = this.getDisplayName();
        this.img = img;
        this.isOn = false;
        this.isPressable = isPressable;
        this.maxInputs = maxInputs;
        this.maxOutputs = maxOutputs;
        this.selected = false;

        if (this.isPressable)
            this.selectionBoxTransform = new Transform(V(x, y), V(selectionBoxWidth, selectionBoxHeight), 0, context.getCamera());

        this.outputs = [];
        this.inputs = [];

        if (maxOutputs > 0)
            this.setOutputAmount(1);
    }
    setInputAmount(target) {
        target = Clamp(target, 0, this.maxInputs);
        while (this.inputs.length > target)
            this.inputs.splice(this.inputs.length-1, 1);
        while (this.inputs.length < target)
            this.inputs.push(new IPort(this));

        for (var i = 0; i < this.inputs.length; i++)
            this.inputs[i].updatePosition();
        this.onTransformChange();
    }
    setOutputAmount(target) {
        target = Clamp(target, 0, this.maxOutputs);
        while (this.outputs.length > target)
            this.outputs.splice(this.outputs.length-1, 1);
        while (this.outputs.length < target)
            this.outputs.push(new OPort(this));

        for (var i = 0; i < this.outputs.length; i++)
            this.outputs[i].updatePosition();
        this.onTransformChange();
    }
    onTransformChange() {
        if (this.isPressable && this.selectionBoxTransform != undefined) {
            this.selectionBoxTransform.setPos(this.transform.getPos());
            this.selectionBoxTransform.setAngle(this.transform.getAngle());
            this.selectionBoxTransform.setScale(this.transform.getScale());
        }
        this.updateCullTransform();
        for (var i = 0; i < this.inputs.length; i++)
            this.inputs[i].onTransformChange();
        for (var i = 0; i < this.outputs.length; i++)
            this.outputs[i].onTransformChange();
    }
    updateCullTransform() {
        // Find min/max points on the object
        var min = V(-this.transform.size.x/2, -this.transform.size.y/2);
        var max = V(this.transform.size.x/2, this.transform.size.y/2);
        if (this.selectionBoxTransform != undefined) {
            min.x = Math.min(-this.selectionBoxTransform.size.x/2, min.x);
            min.y = Math.min(-this.selectionBoxTransform.size.y/2, min.y);
            max.x = Math.max(this.selectionBoxTransform.size.x/2, max.x);
            max.y = Math.max(this.selectionBoxTransform.size.y/2, max.y);
        }
        for (var i = 0; i < this.inputs.length; i++) {
            var iport = this.inputs[i];
            min.x = Math.min(iport.target.x, min.x);
            min.y = Math.min(iport.target.y, min.y);
            max.x = Math.max(iport.target.x, max.x);
            max.y = Math.max(iport.target.y, max.y);
        }
        for (var i = 0; i < this.outputs.length; i++) {
            var oport = this.outputs[i];
            min.x = Math.min(oport.target.x, min.x);
            min.y = Math.min(oport.target.y, min.y);
            max.x = Math.max(oport.target.x, max.x);
            max.y = Math.max(oport.target.y, max.y);
        }
        this.cullTransform.setSize(V(max.x - min.x, max.y - min.y));
        var c = Math.cos(this.transform.getAngle());
        var s = Math.sin(this.transform.getAngle());
        var x = (min.x - (-this.cullTransform.size.x/2)) * c + (min.y - (-this.cullTransform.size.y/2)) * s;
        var y = (min.y - (-this.cullTransform.size.y/2)) * c + (min.x - (-this.cullTransform.size.x/2)) * s;
        this.cullTransform.setPos(this.transform.getPos().add(V(x, y)));
        this.cullTransform.setAngle(this.transform.getAngle());
        this.cullTransform.setScale(this.transform.getScale());
        this.cullTransform.setSize(this.cullTransform.size.add(V(2*IO_PORT_RADIUS, 2*IO_PORT_RADIUS)));
    }
    click() {
        // console.log(this);
    }
    press() {
    }
    release() {
    }
    activate(on, i) {
        if (i == undefined)
            i = 0;

        this.isOn = on;
        if (this.outputs[i] != undefined)
            this.outputs[i].activate(on);
    }
    localSpace() {
        var renderer = this.context.getRenderer();
        renderer.save();
        this.transform.transformCtx(renderer.context);
    }
    draw() {
        this.localSpace();
        for (var i = 0; i < this.inputs.length; i++)
            this.inputs[i].draw();

        for (var i = 0; i < this.outputs.length; i++)
            this.outputs[i].draw(i);

        var renderer = this.context.getRenderer();
        if (this.isPressable && this.selectionBoxTransform != undefined)
            renderer.rect(0, 0, this.selectionBoxTransform.size.x, this.selectionBoxTransform.size.y, this.getCol(), this.getBorderColor());

        if (this.img != undefined)
            renderer.image(this.img, 0, 0, this.transform.size.x, this.transform.size.y, this.getImageTint());
        renderer.restore();
    }
    remove() {
        this.context.remove(this);
        for (var i = 0; i < this.outputs.length; i++)
            this.outputs[i].remove();
        for (var i = 0; i < this.inputs.length; i++)
            this.inputs[i].remove();
    }
    contains(pos) {
        return RectContains(this.transform, pos);
    }
    sContains(pos) {
        return (!this.isPressable &&  this.contains(pos)) ||
                (this.isPressable && !this.contains(pos) && RectContains(this.selectionBoxTransform, pos));
    }
    iPortContains(pos) {
        for (var i = 0; i < this.inputs.length; i++) {
            if (this.inputs[i].contains(pos))
                return i;
        }
        return -1;
    }
    oPortContains(pos) {
        for (var i = 0; i < this.outputs.length; i++) {
            if (this.outputs[i].contains(pos))
                return i;
        }
        return -1;
    }
    setContext(context) {
        this.context = context;
        this.transform.setCamera(this.context.getCamera());
        if (this.selectionBoxTransform != undefined)
            this.selectionBoxTransform.setCamera(this.context.getCamera());
    }
    setTransform(t) {
        this.transform = t;
        this.onTransformChange();
    }
    setPos(v) {
        this.transform.setPos(v);
        this.onTransformChange();
    }
    setAngle(a) {
        this.transform.setAngle(a);
        this.onTransformChange();
    }
    // setRotationAbout(a, c) {
    //     this.transform.rotateAbout(a-this.getAngle(), c);
    //     this.onTransformChange();
    // }
    setRotationAbout(a, c) {
        this.transform.rotateAbout(-this.getAngle(), c);
        this.transform.rotateAbout(a, c);
        this.onTransformChange();
    }
    setName(name) {
        this.name = name;
    }
    getCullBox() {
        return this.cullTransform;
    }
    getInputAmount() {
        return this.inputs.length;
    }
    getImageTint() {
        return this.getCol();
    }
    getCol() {
        return (this.selected ? '#1cff3e' : undefined);
    }
    getBorderColor() {
        return (this.selected ? '#0d7f1f' : undefined);
    }
    getPos() {
        return this.transform.pos.copy();
    }
    getAngle() {
        return this.transform.angle;
    }
    getSize() {
        return this.transform.size;
    }
    getMaxInputFieldCount() {
        return 8;
    }
    getMinInputFieldCount() {
        return 2;
    }
    getName() {
        return this.name;
    }
    getDisplayName() {
        return "IOObject";
    }
    getRenderer() {
        return this.context.getRenderer();
    }
    copy() {
        var copy = new this.constructor(this.context);
        copy.transform = this.transform.copy();
        copy.name = this.name;
        if (this.selectionBoxTransform != undefined)
            copy.selectionBoxTransform = this.selectionBoxTransform.copy();
        for (var i = 0; i < this.inputs.length; i++) {
            copy.inputs[i] = this.inputs[i].copy();
            copy.inputs[i].parent = copy;
        }
        for (var i = 0; i < this.outputs.length; i++) {
            copy.outputs[i] = this.outputs[i].copy();
            copy.outputs[i].parent = copy;
        }
        return copy;
    }
    writeTo(node) {
        var objNode = createChildNode(node, this.constructor.getXMLName());
        createTextElement(objNode, "uid",   this.uid);
        createTextElement(objNode, "name",  this.getName());
        createTextElement(objNode, "x",     this.getPos().x);
        createTextElement(objNode, "y",     this.getPos().y);
        createTextElement(objNode, "angle", this.getAngle());
        return objNode;
    }
    load(node) {
        var uid   = getIntValue    (getChildNode(node, "uid"));
        var name  = getStringValue (getChildNode(node, "name"));
        var x     = getFloatValue  (getChildNode(node, "x"));
        var y     = getFloatValue  (getChildNode(node, "y"));
        var angle = getFloatValue  (getChildNode(node, "angle"));
        var isOn  = getBooleanValue(getChildNode(node, "isOn"), false);
        
        this.uid = uid;
        this.setName(name);
        if (isOn)
            this.click(isOn);
        this.setPos(V(x, y));
        this.setAngle(angle);
        return this;
    }
}
module.exports = IOObject;

// Requirements (at end so that declaration exported is first)
var V                 = require("../libraries/math/Vector").V;
var Transform         = require("../libraries/math/Transform");
var IPort             = require("./IPort");
var OPort             = require("./OPort");

var Clamp             = require("../libraries/Utils").Clamp;
var RectContains      = require("../libraries/Utils").RectContains;
var getCurrentContext = require("../libraries/Context").getCurrentContext;
var getChildNode      = require("../controllers/Importer").getChildNode;
var getIntValue       = require("../controllers/Importer").getIntValue;
var getStringValue    = require("../controllers/Importer").getStringValue;
var getFloatValue     = require("../controllers/Importer").getFloatValue;
var getBooleanValue   = require("../controllers/Importer").getBooleanValue;
var createChildNode   = require("../controllers/Exporter").createChildNode;
var createTextElement = require("../controllers/Exporter").createTextElement;
//
},{"../controllers/Exporter":1,"../controllers/Importer":3,"../libraries/Constants":28,"../libraries/Context":29,"../libraries/Utils":35,"../libraries/math/Transform":44,"../libraries/math/Vector":45,"./IPort":50,"./OPort":51}],49:[function(require,module,exports){
var DEFAULT_BORDER_COLOR = require("../libraries/Constants").DEFAULT_BORDER_COLOR;
var DEFAULT_FILL_COLOR   = require("../libraries/Constants").DEFAULT_FILL_COLOR;
var IO_PORT_BORDER_WIDTH = require("../libraries/Constants").IO_PORT_BORDER_WIDTH;
var IO_PORT_LINE_WIDTH   = require("../libraries/Constants").IO_PORT_LINE_WIDTH;
var IO_PORT_RADIUS       = require("../libraries/Constants").IO_PORT_RADIUS;
var IO_PORT_LENGTH       = require("../libraries/Constants").IO_PORT_LENGTH;

class IOPort {
    constructor(parent, dir) {
        this.isOn = false;
        this.parent = parent;
        this.connections = [];

        this.lineColor = DEFAULT_BORDER_COLOR;

        this.origin = V(0, 0);
        this.target = dir.scale(IO_PORT_LENGTH);
        this.dir = dir;

        this.set = false;

        if (parent != undefined)
            this.updatePosition();
    }
    getArray() {
    }
    getIndex() {
        for (var i = 0; (i < this.getArray().length) && (this.getArray()[i] !== this); i++);
        return i;
    }
    getCol() {
        return (this.parent.selected || this.selected ? '#1cff3e' : undefined);
    }
    getBorderColor() {
        return (this.parent.selected || this.selected ? '#0d7f1f' : undefined);
    }
    updatePosition() {
        var i = this.getIndex();

        var l = -this.parent.transform.size.y/2*(i - this.getArray().length/2 + 0.5);
        if (i === 0) l -= 1;
        if (i === this.getArray().length-1) l += 1;

        this.origin.y = l;
        this.target.y = l;
        this.prevParentLength = this.getArray().length;
    }
    onTransformChange() {
        if (!this.set)
            this.updatePosition();

        for (var i = 0; i < this.connections.length; i++) {
            if (this.connections[i] != undefined)
                this.connections[i].onTransformChange();
        }
    }
    activate(on) {
    }
    contains(pos) {
        var transform = new Transform(this.target, V(IO_PORT_RADIUS, IO_PORT_RADIUS).scale(2), 0, this.parent.context.getCamera());
        transform.setParent(this.parent.transform);
        return CircleContains(transform, pos);
    }
    sContains(pos) {
        if (this.origin.y !== this.target.y)
            return false;

        var w = Math.abs(this.target.x - this.origin.x);
        var pos2 = this.target.add(this.origin).scale(0.5);
        var transform = new Transform(pos2, V(w, IO_PORT_LINE_WIDTH*2), 0, this.parent.context.getCamera());
        transform.setParent(this.parent.transform);
        return RectContains(transform, pos);
    }
    draw() {
        if (!this.set && this.getArray().length !== this.prevParentLength)
            this.updatePosition();

        var o = this.origin;
        var v = this.target;
        var renderer = this.parent.getRenderer();

        var lineCol = (this.parent.getBorderColor() ? this.parent.getBorderColor() : this.lineColor);
        renderer.line(o.x, o.y, v.x, v.y, lineCol, IO_PORT_LINE_WIDTH);

        var circleFillCol = (this.getCol() ? this.getCol() : DEFAULT_FILL_COLOR);
        var circleBorderCol = (this.getBorderColor() ? this.getBorderColor() : DEFAULT_BORDER_COLOR);
        renderer.circle(v.x, v.y, IO_PORT_RADIUS, circleFillCol, circleBorderCol, IO_PORT_BORDER_WIDTH);
    }
    remove() {
    }
    setOrigin(v) {
        this.origin.x = v.x;
        this.origin.y = v.y;
        this.set = true;
        if (this.parent != undefined)
            this.parent.onTransformChange();
    }
    setTarget(v) {
        this.target.x = v.x;
        this.target.y = v.y;
        this.set = true;
        if (this.parent != undefined)
            this.parent.onTransformChange();
    }
    getPos() {
        return this.parent.transform.getMatrix().mul(this.target);
    }
    getOPos() {
        return this.parent.transform.getMatrix().mul(this.origin);
    }
    getDir() {
        return this.parent.transform.getMatrix().mul(this.dir).sub(this.parent.getPos()).normalize();
    }
    get uid() {
        return this.parent.uid;
    }
    setName(n) {
    }
    setPos() {
    }
    getInputAmount() {
        return 1;
    }
    getMaxInputFieldCount() {
        return 1;
    }
    getMinInputFieldCount() {
        return 1;
    }
    getName() {
        return this.getDisplayName();
    }
    getDisplayName() {
        return "ioport";
    }
    getXMLName() {
        return this.getDisplayName().toLowerCase().replace(/\s+/g, '');
    }
    copy() {
        var port = new this.constructor();
        port.origin = this.origin.copy();
        port.target = this.target.copy();
        port.set = this.set;
        port.lineColor = this.lineColor;
        return port;
    }
    writeTo(node) {
        var ioPortNode = createChildNode(node, this.getXMLName());
        createTextElement(ioPortNode, "originx", this.origin.x);
        createTextElement(ioPortNode, "originy", this.origin.y);
        createTextElement(ioPortNode, "targetx", this.target.x);
        createTextElement(ioPortNode, "targety", this.target.y);
    }
    load(node) {
        var originx = getFloatValue(getChildNode(node, "originx"));
        var originy = getFloatValue(getChildNode(node, "originy"));
        var targetx = getFloatValue(getChildNode(node, "targetx"));
        var targety = getFloatValue(getChildNode(node, "targety"));
        this.setOrigin(V(originx, originy));
        this.setTarget(V(targetx, targety));
        return this;
    }
}

module.exports = IOPort;

// Requirements
var V         = require("../libraries/math/Vector").V;
var Transform = require("../libraries/math/Transform");
var Importer  = require("../controllers/Importer");

var RectContains      = require("../libraries/Utils").RectContains;
var CircleContains    = require("../libraries/Utils").CircleContains;
var getFloatValue     = require("../controllers/Importer").getFloatValue;
var createChildNode   = require("../controllers/Exporter").createChildNode;
var createTextElement = require("../controllers/Exporter").createTextElement;
// 
},{"../controllers/Exporter":1,"../controllers/Importer":3,"../libraries/Constants":28,"../libraries/Utils":35,"../libraries/math/Transform":44,"../libraries/math/Vector":45}],50:[function(require,module,exports){
var IOPort = require("./IOPort");

class IPort extends IOPort {
    constructor(parent) {
        super(parent, V(-1, 0))
    }
    getArray() {
        return this.parent.inputs;
    }
    set input(obj) {
        if (obj == undefined)
            this.connections = [];
        else
            this.connections[0] = obj;
    }
    get input() {
        if (this.connections.length > 0)
            return this.connections[0];
        else
            return undefined;
    }
    activate(on) {
        if (this.isOn === on)
            return;

        this.isOn = on;
        this.parent.context.propogate(this, this.parent, this.isOn);
    }
    remove() {
        if (this.input != undefined)
            this.input.disconnect(this);
    }
    getDisplayName() {
        return "iport";
    }
}

module.exports = IPort;

// Requirements
var V = require("../libraries/math/Vector").V;
// 
},{"../libraries/math/Vector":45,"./IOPort":49}],51:[function(require,module,exports){
var IOPort = require("./IOPort");

class OPort extends IOPort {
    constructor(parent) {
        super(parent, V(1, 0));
    }
    getArray() {
        return this.parent.outputs;
    }
    activate(on) {
        if (this.isOn === on)
            return;

        this.isOn = on;
        for (var i = 0; i < this.connections.length; i++)
            this.parent.context.propogate(this, this.connections[i], this.isOn);
    }
    remove() {
        for (var i = 0; i < this.connections.length; i++)
            this.disconnect(this.connections[i]);
    }
    connect(wire) {
        this.connections.push(wire);
        wire.input = this;
        wire.onTransformChange();
        wire.activate(this.isOn);
        return true;
    }
    disconnect(obj) {
        for (var i = 0; (i < this.connections.length) && (this.connections[i] !== obj); i++);
        this.connections[i].input = undefined;
        this.connections.splice(i, 1);
    }
    getDisplayName() {
        return "oport";
    }
}

module.exports = OPort;

// Requirements
var V = require("../libraries/math/Vector").V;
// 
},{"../libraries/math/Vector":45,"./IOPort":49}],52:[function(require,module,exports){
var DEFAULT_SIZE       = require("../libraries/Constants").DEFAULT_SIZE;
var DEFAULT_FILL_COLOR = require("../libraries/Constants").DEFAULT_FILL_COLOR;

class Wire {
    constructor(context) {
        this.context = context;

        this.input = undefined;
        this.connection = undefined;

        this.curve = new BezierCurve(V(0,0),V(0,0),V(0,0),V(0,0));
        this.isOn = false;
        this.set = false; // Manually set bezier control points

        this.straight = false;
        this.dirty = true;
        this.boundingBox = new Transform(0,0,0,context.getCamera());
    }
    activate(on) {
        if (this.isOn === on)
            return;

        this.isOn = on;
        if (this.connection != undefined)
            this.connection.activate(on);
    }
    split(t) {
        var pos = this.curve.getPos(t);

        var wire = new Wire(this.context);

        var prevConnection = this.connection;
        this.disconnect();

        var port = new WirePort(this.context);
        this.connect(port);
        wire.connect(prevConnection);
        port.connect(wire);

        this.connection.setPos(pos);

        getCurrentContext().addObject(port);
        getCurrentContext().addWire(wire);
    }
    updateBoundingBox() {
        if (!this.dirty)
            return;
        this.dirty = false;

        var end1 = this.getPos(0);
        var end2 = this.getPos(1);
        var min = V(Math.min(end1.x, end2.x), Math.min(end1.y, end2.y));
        var max = V(Math.max(end1.x, end2.x), Math.max(end1.y, end2.y));
        this.boundingBox.setSize(V(max.x - min.x + 2, max.y - min.y + 2));
        this.boundingBox.setPos(V((max.x - min.x)/2 + min.x, (max.y - min.y)/2 + min.y));
    }
    onTransformChange() {
        if (this.input != undefined) {
            var pos = this.input.getPos();
            if (this.set) {
                this.curve.c1.x += pos.x - this.curve.p1.x;
                this.curve.c1.y += pos.y - this.curve.p1.y;
            } else {
                var dir = (this.input instanceof WirePort ? this.input.getODir() : this.input.getDir());
                var c = dir.scale(DEFAULT_SIZE).add(pos);
                this.curve.c1.x = c.x;
                this.curve.c1.y = c.y;
            }
            this.curve.p1.x = pos.x;
            this.curve.p1.y = pos.y;
            this.curve.dirty = true;
            this.dirty = true;
        }
        if (this.connection != undefined) {
            var pos = this.connection.getPos();
            if (this.set) {
                this.curve.c2.x += pos.x - this.curve.p2.x;
                this.curve.c2.y += pos.y - this.curve.p2.y;
            } else {
                var dir = this.connection.getDir();
                var c = dir.scale(DEFAULT_SIZE).add(pos);
                this.curve.c2.x = c.x;
                this.curve.c2.y = c.y;
            }
            this.curve.p2.x = pos.x;
            this.curve.p2.y = pos.y;
            this.curve.dirty = true;
            this.dirty = true;
        }
    }
    connect(obj) {
        if (this.connection != undefined || obj.input != undefined)
            return false;

        this.connection = obj;
        obj.input = this;
        this.onTransformChange();
        obj.activate(this.isOn);

        return true;
    }
    disconnect() {
        if (this.connection == undefined)
            return false;

        this.connection.input = undefined;
        this.connection.activate(false);
        this.connection = undefined;
    }
    draw() {
        var renderer = this.context.getRenderer();
        var camera = this.context.getCamera();

        var color = (this.isOn ? '#3cacf2' : (this.selected ? '#1cff3e' : DEFAULT_FILL_COLOR));
        if (this.straight) {
            var p1 = camera.getScreenPos(this.curve.p1);
            var p2 = camera.getScreenPos(this.curve.p2);
            renderer.line(p1.x, p1.y, p2.x, p2.y, color, 7 / camera.zoom);
        } else {
            this.curve.draw(color, 7 / camera.zoom, renderer);
        }
    }
    remove() {
        this.context.remove(this);
        if (this.input != undefined)
            this.input.disconnect(this);
        if (this.connection != undefined)
            this.disconnect(this.connection);
    }
    contains(pos) {
        return this.curve.getNearestT(pos.x, pos.y) !== -1;
    }
    setName(n) {
    }
    setPos() {
    }
    getPos(t) {
        if (t == undefined)
            t = 0.5;
        return this.curve.getPos(t);
    }
    getNearestT(mx, my) {
        return (this.straight) ? (getNearestT(this.curve.p1, this.curve.p2, mx, my)) : (this.curve.getNearestT(mx, my));
    }
    getCullBox() {
        return (this.straight) ? (this.getBoundingBox()) : (this.curve.getBoundingBox());
    }
    getBoundingBox() {
        if (!this.straight)
            return undefined;

        this.updateBoundingBox();
        return this.boundingBox;
    }
    getInputAmount() {
        return 1;
    }
    getMaxInputFieldCount() {
        return 1;
    }
    getMinInputFieldCount() {
        return 1;
    }
    getName() {
        return this.getDisplayName();
    }
    getDisplayName() {
        return "Wire";
    }
    copy() {
        var copy = new Wire(this.context);
        copy.curve = this.curve.copy();
        copy.straight = this.straight;
        return copy;
    }
    writeTo(node, objects, wires) {
        var wireNode = createChildNode(node, "wire");

        createTextElement(wireNode, "uid", this.uid);

        var inputNode = createChildNode(wireNode, "input");
        createTextElement(inputNode, "uid", this.input.uid);
        createTextElement(inputNode, "index", this.input.getIndex());

        var connectionNode = createChildNode(wireNode, "connection");
        createTextElement(connectionNode, "uid", this.connection.uid);
        createTextElement(connectionNode, "index", this.connection.getIndex());

        this.curve.writeTo(wireNode);

        createTextElement(wireNode, "straight", this.straight);
    }
    load(node) {
        var objects = this.context.getObjects();
        var wires = this.context.getWires();

        var uid = getIntValue(getChildNode(node, "uid"));
        this.uid = uid;

        var bezier = getChildNode(node, "bezier");
        this.curve.load(bezier);

        var straight = getBooleanValue(getChildNode(node, "straight"));
        this.straight = straight;

        return this;
    }
    loadConnections(node, objects) {
        var inputNode = getChildNode(node, "input");
        var sourceUID = getIntValue(getChildNode(inputNode, "uid"));
        var sourceIndx = getIntValue(getChildNode(inputNode, "index"));
        var source = FindByUID(objects, sourceUID);
        source = (source instanceof WirePort ? source : source.outputs[sourceIndx]);

        var connectionNode = getChildNode(node, "connection");
        var targetUID = getIntValue(getChildNode(connectionNode, "uid"));
        var targetIndx = getIntValue(getChildNode(connectionNode, "index"));
        var target = FindByUID(objects, targetUID);
        console.log(targetUID);
        console.log(targetIndx);
        console.log(target);
        target = (target instanceof WirePort ? target : target.inputs[targetIndx]);

        source.connect(this);
        this.connect(target);
    }
}

module.exports = Wire;

// Requirements
var V           = require("../libraries/math/Vector").V;
var Transform   = require("../libraries/math/Transform");
var BezierCurve = require("../libraries/math/Bezier");
var WirePort    = require("./WirePort");

var FindByUID = require("../libraries/Utils").FindByUID;

var getChildNode      = require("../controllers/Importer").getChildNode;
var getIntValue       = require("../controllers/Importer").getIntValue;
var getStringValue    = require("../controllers/Importer").getStringValue;
var getFloatValue     = require("../controllers/Importer").getFloatValue;
var getBooleanValue   = require("../controllers/Importer").getBooleanValue;

var createChildNode   = require("../controllers/Exporter").createChildNode;
var createTextElement = require("../controllers/Exporter").createTextElement;
// 
},{"../controllers/Exporter":1,"../controllers/Importer":3,"../libraries/Constants":28,"../libraries/Utils":35,"../libraries/math/Bezier":42,"../libraries/math/Transform":44,"../libraries/math/Vector":45,"./WirePort":53}],53:[function(require,module,exports){
var IO_PORT_RADIUS       = require("../libraries/Constants").DEFAULT_BORDER_COLOR;
var WIRE_SNAP_THRESHOLD       = require("../libraries/Constants").WIRE_SNAP_THRESHOLD;

var IOObject = require("./IOObject");

class WirePort extends IOObject {
    constructor(context) {
        super(context, 0, 0, 2*IO_PORT_RADIUS, 2*IO_PORT_RADIUS);
        this._input = undefined;
        this.connection = undefined;
        this.isOn = false;
        this.selected = false;
        this.hasSetTransform = false;
    }
    set input(input) {
        this._input = input;
        if (!this.hasSetTransform) {
            this.hasSetTransform = true;
            this.transform = new Transform(input.curve.p2.copy(), V(15,15), 0, this.context.getCamera());
        }
    }
    get input() {
        return this._input;
    }
    activate(on) {
        if (this.isOn === on)
            return;

        this.isOn = on;
        if (this.connection != undefined)
            this.connection.activate(on);
    }
    remove() {
        this.context.remove(this);
        if (this.input != undefined)
            this.input.disconnect(this);
        if (this.connection != undefined)
            this.disconnect(this.connection);
    }
    onTransformChange() {
        if (this.input != undefined)
            this.input.onTransformChange();
        if (this.connection != undefined)
            this.connection.onTransformChange();
    }
    connect(wire) {
        if (this.connection != undefined)
            return false;

        this.connection = wire;
        wire.input = this;
        wire.onTransformChange();
        wire.activate(this.isOn);

        return true;
    }
    disconnect() {
        if (this.connection == undefined)
            return;

        this.connection.input = undefined;
        this.connection = undefined;
    }
    draw() {
        var renderer = this.context.getRenderer();
        var camera = this.context.getCamera();

        var v = camera.getScreenPos(this.getPos());
        renderer.circle(v.x, v.y, 7 / camera.zoom, (this.selected ? '#1cff3e' : '#ffffff'), (this.selected ? '#0d7f1f' : '#000000'), 1 / camera.zoom);
    }
    contains(pos) {
        return CircleContains(this.transform, pos);
    }
    sContains(pos) {
        return this.contains(pos);
    }
    setPos(v) {
        if (this.input != undefined && this.connection != undefined) {
            // Snap to end points of wires
            this.input.straight = false;
            this.connection.straight = false;
            v.x = snap(this.input, v.x, this.input.curve.p1.x);
            v.y = snap(this.input, v.y, this.input.curve.p1.y);
            v.x = snap(this.connection, v.x, this.connection.curve.p2.x);
            v.y = snap(this.connection, v.y, this.connection.curve.p2.y);
        }

        super.setPos(v);
    }
    getIndex() {
        return 0;
    }
    getDir() {
        return this.transform.getMatrix().mul(V(-1, 0)).sub(this.transform.pos).normalize();
    }
    getODir() {
        return this.transform.getMatrix().mul(V(1, 0)).sub(this.transform.pos).normalize();
    }
    getCullBox() {
        return this.transform;
    }
    getInputAmount() {
        return 1;
    }
    getName() {
        return this.getDisplayName();
    }
    getDisplayName() {
        return "Port";
    }
}
WirePort.getXMLName = function() { return "port"; }

function snap(wire, x, c) {
    if (Math.abs(x - c) <= WIRE_SNAP_THRESHOLD) {
        wire.straight = true;
        return c;
    }
    return x;
}

module.exports = WirePort;

// Requirements
var V         = require("../libraries/math/Vector").V;
var Transform = require("../libraries/math/Transform");
var Importer  = require("../controllers/Importer");

var CircleContains    = require("../libraries/Utils").CircleContains;
// 

Importer.types.push(WirePort);
},{"../controllers/Importer":3,"../libraries/Constants":28,"../libraries/Utils":35,"../libraries/math/Transform":44,"../libraries/math/Vector":45,"./IOObject":48}],54:[function(require,module,exports){
var DEFAULT_SIZE   = require("../../libraries/Constants").DEFAULT_SIZE;

var IOObject = require("../IOObject");

class Gate extends IOObject {
    constructor(context, not, x, y, img) {
        super(context, x, y, DEFAULT_SIZE*(img != undefined ? img.ratio : 1), DEFAULT_SIZE, img, false, 512, 512);
        this._not = (not ? true : false);
        this.name = this.getDisplayName();

        this.setInputAmount(2);
    }
    set not(value) {
        this._not = value;
        if (value)
            this.outputs[0].isOn = !this.isOn;
    }
    get not() {
        return this._not;
    }
    activate(on, i) {
        super.activate((this.not ? !on : on), i);
    }
    draw() {
        super.draw();

        var renderer = this.context.getRenderer();

        this.localSpace();
        if (this.not) {
            var l = this.transform.size.x/2+5;
            renderer.circle(l, 0, 5, (this.getCol() == undefined ? '#fff' : this.getCol()), this.getBorderColor(), 2);
        }
        renderer.restore();
    }
    getDisplayName() {
        return "Gate";
    }
    copy() {
        var copy = super.copy();
        copy.not = this.not;
        return copy;
    }
    writeTo(node) {
        var gateNode = super.writeTo(node);
        createTextElement(gateNode, "not", this.not);
        createTextElement(gateNode, "inputcount", this.getInputAmount());
        return gateNode;
    }
    load(node) {
        super.load(node);
        var not = getBooleanValue(getChildNode(node, "not"));
        var inputCount = getIntValue(getChildNode(node, "inputcount"), 1);
        this.not = not;
        this.setInputAmount(inputCount);
        return this;
    }
}

module.exports = Gate;

// Requirements
var Images   = require("../../libraries/Images");
var Importer = require("../../controllers/Importer");

var getIntValue       = require("../../controllers/Importer").getIntValue;
var getBooleanValue   = require("../../controllers/Importer").getBooleanValue;
var getChildNode      = require("../../controllers/Importer").getChildNode;
var createTextElement = require("../../controllers/Exporter").createTextElement;
// 
},{"../../controllers/Exporter":1,"../../controllers/Importer":3,"../../libraries/Constants":28,"../../libraries/Images":32,"../IOObject":48}],55:[function(require,module,exports){
var DEFAULT_SIZE = require("../../../libraries/Constants").DEFAULT_SIZE;

var Gate = require("../Gate");

class SRFlipFlop extends Gate {
    constructor(context, x, y) {
        super(context, false, x, y, undefined);
        this.noChange = true;
        this.setInputAmount(3);
        this.setOutputAmount(2);
        this.transform.setSize(this.transform.size.scale(1.5));
    }
    onTransformChange() {
        this.transform.setSize(V(DEFAULT_SIZE, DEFAULT_SIZE));
        super.onTransformChange();
        this.transform.setSize(V(DEFAULT_SIZE*1.5, DEFAULT_SIZE*1.5));
    }
    activate(x) {
        var on    = this.outputs[0].isOn;
        var set   = this.inputs[0].isOn;
        var clock = this.inputs[1].isOn;
        var reset = this.inputs[2].isOn;
        if (clock) {
            if (set && reset) {
                // undefined behavior
            } else if (set) {
                on = true;
            } else if (reset) {
                on = false;
            }
        }

        super.activate(on, 0);
        super.activate(!on, 1);
    }
    draw() {
        super.draw();

        var renderer = this.context.getRenderer();
        this.localSpace();
        renderer.rect(0, 0, this.transform.size.x, this.transform.size.y, this.getCol(), this.getBorderColor());
        renderer.restore();
    }
    getDisplayName() { 
        return "SR Flip Flop"; 
    }
}
SRFlipFlop.getXMLName = function() { return "srff"; }

module.exports = SRFlipFlop;

// Requirements
var V        = require("../../../libraries/math/Vector").V;
var Importer = require("../../../controllers/Importer");
// 

Importer.types.push(SRFlipFlop);
},{"../../../controllers/Importer":3,"../../../libraries/Constants":28,"../../../libraries/math/Vector":45,"../Gate":54}],56:[function(require,module,exports){
var Gate = require("../Gate");

class ANDGate extends Gate {
    constructor(context, not, x, y) {
        super(context, not, x, y, Images["and.svg"]);
    }
    setInputAmount(target) {
        super.setInputAmount(target);

        for (var i = 0; i < this.inputs.length; i++) {
            var input = this.inputs[i];
            input.origin = V(-(this.transform.size.x-2)/2, input.origin.y);
        }
    }
    activate(x) {
        var on = true;
        for (var i = 0; i < this.inputs.length; i++)
            on = (on && this.inputs[i].isOn);
        super.activate(on);
    }
    draw() {
        var renderer = this.context.getRenderer();

        this.localSpace();
        var l1 = -(this.transform.size.y/2)*(0.5-this.inputs.length/2);
        var l2 = -(this.transform.size.y/2)*(this.inputs.length/2-0.5);

        var s = (this.transform.size.x-2)/2;
        var p1 = V(-s, l1);
        var p2 = V(-s, l2);

        renderer.line(p1.x, p1.y, p2.x, p2.y, this.getBorderColor(), 2);
        renderer.restore();

        super.draw();

    }
    getDisplayName() {
        return this.not ? "NAND Gate" : "AND Gate";
    }
}
ANDGate.getXMLName = function() { return "andgate"; }

module.exports = ANDGate;

// Requirements
var V        = require("../../../libraries/math/Vector").V;
var Images   = require("../../../libraries/Images");
var Importer = require("../../../controllers/Importer");
// 

Importer.types.push(ANDGate);
},{"../../../controllers/Importer":3,"../../../libraries/Images":32,"../../../libraries/math/Vector":45,"../Gate":54}],57:[function(require,module,exports){
var Gate = require("../Gate");

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

// Requirements
var Images   = require("../../../libraries/Images");
var Importer = require("../../../controllers/Importer");
// 

Importer.types.push(BUFGate);
},{"../../../controllers/Importer":3,"../../../libraries/Images":32,"../Gate":54}],58:[function(require,module,exports){
var Gate = require("../Gate");

class ORGate extends Gate {
    constructor(context, not, x, y) {
        super(context, not, x, y, Images["or.svg"]);
    }
    quadCurveXAt(t) {
        var s = this.transform.size.x/2 - 2;
        var l = this.transform.size.x/5 - 2;
        var t2 = 1 - t;
        return (t2*t2)*(-s) + 2*t*(t2)*(-l) + (t*t)*(-s);
    }
    setInputAmount(target) {
        super.setInputAmount(target);

        for (var i = 0; i < this.inputs.length; i++) {
            var input = this.inputs[i];
            var t = ((input.origin.y) / this.transform.size.y + 0.5) % 1.0;
            if (t < 0)
                t += 1.0;
            var x = this.quadCurveXAt(t);
            input.origin = V(x, input.origin.y);
        }
    }
    activate(x) {
        var on = false;
        for (var i = 0; i < this.inputs.length; i++)
            on = (on || this.inputs[i].isOn);
        super.activate(on);
    }
    draw() {
        var renderer = this.context.getRenderer();

        this.localSpace();
        var amt = 2 * Math.floor(this.inputs.length / 4) + 1;
        for (var i = 0; i < amt; i++) {
            var d = (i - Math.floor(amt/2)) * this.transform.size.y;
            var h = 2;
            var l1 = -this.transform.size.y/2;
            var l2 = +this.transform.size.y/2;

            var s = this.transform.size.x/2 - h;
            var l = this.transform.size.x/5 - h;

            var p1 = V(-s, l1 + d);
            var p2 = V(-s, l2 + d);
            var c  = V(-l, d);

            renderer.quadCurve(p1.x, p1.y, p2.x, p2.y, c.x, c.y, this.getBorderColor(), 2);
        }
        renderer.restore();

        super.draw();
    }
    getDisplayName() {
        return this.not ? "NOR Gate" : "OR Gate";
    }
}
ORGate.getXMLName = function() { return "orgate"; }

module.exports = ORGate;

// Requirements
var V        = require("../../../libraries/math/Vector").V;
var Images   = require("../../../libraries/Images");
var Importer = require("../../../controllers/Importer");
// 

Importer.types.push(ORGate);
},{"../../../controllers/Importer":3,"../../../libraries/Images":32,"../../../libraries/math/Vector":45,"../Gate":54}],59:[function(require,module,exports){
var Gate = require("../Gate");

class XORGate extends Gate {
    constructor(context, not, x, y) {
        super(context, not, x, y, Images["or.svg"]);
    }
    quadCurveXAt(t) {
        var s = this.transform.size.x/2 - 2;
        var l = this.transform.size.x/5 - 2;
        var t2 = 1 - t;
        return (t2*t2)*(-s) + 2*t*(t2)*(-l) + (t*t)*(-s);
    }
    setInputAmount(target) {
        super.setInputAmount(target);

        for (var i = 0; i < this.inputs.length; i++) {
            var input = this.inputs[i];
            var t = ((input.origin.y) / this.transform.size.y + 0.5) % 1.0;
            if (t < 0)
                t += 1.0;
            var x = this.quadCurveXAt(t);
            input.origin = V(x, input.origin.y);
        }
    }
    activate(x) {
        var on = false;
        for (var i = 0; i < this.inputs.length; i++)
            on = (on !== this.inputs[i].isOn);
        super.activate(on);
    }
    draw() {
        super.draw();

        var renderer = this.context.getRenderer();

        this.localSpace();
        var amt = 2 * Math.floor(this.inputs.length / 4) + 1;
        for (var i = 0; i < amt; i++) {
            var d = (i - Math.floor(amt/2)) * this.transform.size.y;
            var h = 2;
            var x = 12;
            var l1 = -this.transform.size.y/2;
            var l2 = +this.transform.size.y/2;

            var s = this.transform.size.x/2 - h;
            var l = this.transform.size.x/5 - h;

            var p1 = V(-s, l1 + d);
            var p2 = V(-s, l2 + d);
            var c  = V(-l, d);

            renderer.quadCurve(p1.x, p1.y, p2.x, p2.y, c.x, c.y, this.getBorderColor(), 2);
            renderer.quadCurve(p1.x - x, p1.y, p2.x - x, p2.y, c.x - x, c.y, this.getBorderColor(), 2);
        }

        renderer.restore();
    }
    getDisplayName() {
        return this.not ? "XNOR Gate" : "XOR Gate";
    }
    getXMLName() {
        return "xorgate";
    }
}
XORGate.getXMLName = function() { return "xorgate"; }

module.exports = XORGate;

// Requirements
var V        = require("../../../libraries/math/Vector").V;
var Images   = require("../../../libraries/Images");
var Importer = require("../../../controllers/Importer");
// 

Importer.types.push(XORGate);
},{"../../../controllers/Importer":3,"../../../libraries/Images":32,"../../../libraries/math/Vector":45,"../Gate":54}],60:[function(require,module,exports){
// key board input inputs
var DEFAULT_SIZE = require("../../../libraries/Constants").DEFAULT_SIZE;

var IOObject = require("../../IOObject");

class Button extends IOObject {
    constructor(context, x, y) {
        super(context, x, y, DEFAULT_SIZE, DEFAULT_SIZE, Images["buttonUp.svg"], true, 0, 1, 60, 60);
    }
    press() {
        super.activate(true);
        this.img = Images["buttonDown.svg"];
    }
    release() {
        super.activate(false);
        this.img = Images["buttonUp.svg"];
    }
    contains(pos) {
        return CircleContains(this.transform, pos);
    }
    getDisplayName() {
        return "Button";
    }
}
Button.getXMLName = function() { return "button"; }

module.exports = Button;

// Requirements
var Images   = require("../../../libraries/Images");
var Importer = require("../../../controllers/Importer");

var CircleContains = require("../../../libraries/Utils").CircleContains;
// 

Importer.types.push(Button);
},{"../../../controllers/Importer":3,"../../../libraries/Constants":28,"../../../libraries/Images":32,"../../../libraries/Utils":35,"../../IOObject":48}],61:[function(require,module,exports){
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
var Importer = require("../../../controllers/Importer");
// 

Importer.types.push(Clock);
},{"../../../controllers/Importer":3,"../../../libraries/Images":32,"../../IOObject":48}],62:[function(require,module,exports){
var DEFAULT_SIZE = require("../../../libraries/Constants").DEFAULT_SIZE;

var IOObject = require("../../IOObject");

class ConstantHigh extends IOObject {
    constructor(context, x, y) {
        super(context, x, y, DEFAULT_SIZE, DEFAULT_SIZE, Images["constHigh.svg"], false, 0, 1);
        super.activate(true);
    }
    getDisplayName() {
        return "Constant High";
    }
}
ConstantHigh.getXMLName = function() { return "consthigh"; }

module.exports = ConstantHigh;

// Requirements
var Images   = require("../../../libraries/Images");
var Importer = require("../../../controllers/Importer");
// 

Importer.types.push(ConstantHigh);
},{"../../../controllers/Importer":3,"../../../libraries/Constants":28,"../../../libraries/Images":32,"../../IOObject":48}],63:[function(require,module,exports){
var DEFAULT_SIZE = require("../../../libraries/Constants").DEFAULT_SIZE;

var IOObject = require("../../IOObject");

class ConstantLow extends IOObject {
    constructor(context, x, y) {
        super(context, x, y, DEFAULT_SIZE, DEFAULT_SIZE, Images["constLow.svg"], false, 0, 1);
        super.activate(false);
    }
    getDisplayName() {
        return "Constant Low";
    }
}
ConstantLow.getXMLName = function() { return "constlow"; }

module.exports = ConstantLow;

// Requirements
var Images   = require("../../../libraries/Images");
var Importer = require("../../../controllers/Importer");
// 

Importer.types.push(ConstantLow);
},{"../../../controllers/Importer":3,"../../../libraries/Constants":28,"../../../libraries/Images":32,"../../IOObject":48}],64:[function(require,module,exports){
var DEFAULT_SIZE = require("../../../libraries/Constants").DEFAULT_SIZE;

var IOObject = require("../../IOObject");

class Keyboard extends IOObject {
    constructor(context, x, y) {
        super(context, x, y, 3.5*DEFAULT_SIZE, 3.5*DEFAULT_SIZE/Images["keyboard.svg"].ratio, Images["keyboard.svg"], false, 0, 7);

        this.setOutputAmount(7);
        for (var i = 0; i < 7; i++) {
            var output = this.outputs[i];

            var l = -DEFAULT_SIZE/2*(i - 7/2 + 0.5);
            if (i === 0) l -= 1;
            if (i === 7-1) l += 1;

            output.setOrigin(V(l, 0));
            output.setTarget(V(l, -IO_PORT_LENGTH-(this.transform.size.y-DEFAULT_SIZE)/2));
            output.dir = V(0, -1);
        }
    }
    onKeyDown(code) {
        var code = Keyboard.codeMap[code];
        if (code == undefined)
            return;

        // Down bit
        this.activate(true, this.outputs.length-1);

        for (var i = this.outputs.length-2; i >= 0; i--) {
            var num = 1 << i;
            if (num > code) {
                this.outputs[i].activate(false);
            } else {
                this.outputs[i].activate(true);
                code -= num;
            }
        }
    }
    onKeyUp(code) {
        var code = Keyboard.codeMap[code];
        if (code == undefined)
            return;

        // Up bit
        this.activate(false, this.outputs.length-1);

        for (var i = this.outputs.length-2; i >= 0; i--) {
            this.outputs[i].activate(false);
            // var num = 1 << i;
            // if (num > code) {
            //     this.outputs[i].activate(false);
            // } else {
            //     this.outputs[i].activate(true);
            //     code -= num;
            // }
        }
    }
    getDisplayName() {
        return "Keyboard";
    }
}
Keyboard.getXMLName = function() { return "keyboard"; }

Keyboard.codeMap = [];
Keyboard.codeCount = 0;

Keyboard.addKey = function(code) {
    Keyboard.codeMap[code] = (++Keyboard.codeCount);
}

// Add numbers 0-9
for (var code = 48; code <= 57; code++)
    Keyboard.addKey(code);

// Add letters a-z
for (var code = 65; code <= 90; code++)
    Keyboard.addKey(code);

Keyboard.addKey(32); // Space
Keyboard.addKey(13); // Enter
Keyboard.addKey(8); // Delete
Keyboard.addKey(9); // Tab
Keyboard.addKey(16); // LShift
Keyboard.addKey(17); // LCtrl
Keyboard.addKey(18); // LOption
Keyboard.addKey(91); // LCommand
Keyboard.addKey(20); // Caps lock
Keyboard.addKey(27); // Escape
Keyboard.addKey(192); // Tilda
Keyboard.addKey(189); // Minus
Keyboard.addKey(187); // Plus
Keyboard.addKey(219); // LBracket
Keyboard.addKey(221); // RBracket
Keyboard.addKey(220); // Backslash
Keyboard.addKey(186); // Semicolon
Keyboard.addKey(222); // Quote
Keyboard.addKey(188); // Comma
Keyboard.addKey(190); // Period
Keyboard.addKey(191); // Forwardslash
Keyboard.addKey(37); // Left
Keyboard.addKey(38); // Up
Keyboard.addKey(39); // Right
Keyboard.addKey(40); // Down
Keyboard.addKey(112); // F1
Keyboard.addKey(112); // F2

module.exports = Keyboard;

// Requirements
var V        = require("../../../libraries/math/Vector").V;
var Images   = require("../../../libraries/Images");
var Importer = require("../../../controllers/Importer");
// 

Importer.types.push(Keyboard);
},{"../../../controllers/Importer":3,"../../../libraries/Constants":28,"../../../libraries/Images":32,"../../../libraries/math/Vector":45,"../../IOObject":48}],65:[function(require,module,exports){
var DEFAULT_SIZE = require("../../../libraries/Constants").DEFAULT_SIZE;

var IOObject = require("../../IOObject");

class Switch extends IOObject {
    constructor(context, x, y) {
        super(context, x, y, 60*Images["switchUp.svg"].ratio, 60, Images["switchUp.svg"], true, 0, 1, 77*Images["switchUp.svg"].ratio, 77);
    }
    activate(on) {
        super.activate(on);
        this.img = Images[this.isOn ? "switchDown.svg" : "switchUp.svg"];
    }
    click() {
        super.click();
        this.activate(!this.isOn);
    }
    getDisplayName() {
        return "Switch";
    }
    writeTo(node) {
        var switchNode = super.writeTo(node);
        createTextElement(switchNode, "isOn", this.outputs[0].isOn);
        return switchNode;
    }
}
Switch.getXMLName = function() { return "switch"; }

module.exports = Switch;

// Requirements
var Images   = require("../../../libraries/Images");
var Importer = require("../../../controllers/Importer");

var createTextElement = require("../../../controllers/Exporter").createTextElement;
// 

Importer.types.push(Switch);
},{"../../../controllers/Exporter":1,"../../../controllers/Importer":3,"../../../libraries/Constants":28,"../../../libraries/Images":32,"../../IOObject":48}],66:[function(require,module,exports){
var DEFAULT_SIZE = require("../../../libraries/Constants").DEFAULT_SIZE;

var Gate = require("../Gate");

class Decoder extends Gate {
    constructor(context, x, y) {
        super(context, false, x, y, undefined);
    }
    onTransformChange() {
        this.transform.setSize(V(DEFAULT_SIZE, DEFAULT_SIZE));
        super.onTransformChange();
        this.transform.setSize(V(DEFAULT_SIZE, DEFAULT_SIZE/2*(2 << (this.inputs.length-1))));
    }
    setInputAmount(target) {
        target = Clamp(target, 0, 8);
        super.setInputAmount(target);
        super.setOutputAmount(2 << (target-1));
    }
    getInputAmount() {
        return this.inputs.length;
    }
    activate(x) {
        var num = 0;
        for (var i = 0; i < this.inputs.length; i++)
            num = num | ((this.inputs[i].isOn ? 1 : 0) << i);
        for (var i = 0; i < this.outputs.length; i++)
            this.outputs[i].activate(i === num, i);
    }
    draw() {
        super.draw();

        var renderer = this.context.getRenderer();
        this.localSpace();
        renderer.rect(0, 0, this.transform.size.x, this.transform.size.y, this.getCol(), this.getBorderColor());
        renderer.restore();
    }
    getMinInputFieldCount() {
        return 1;
    }
    getDisplayName() {
        return "Decoder";
    }
}
Decoder.getXMLName = function() { return "decoder"; }

module.exports = Decoder;

// Requirements
var V        = require("../../../libraries/math/Vector").V;
var Importer = require("../../../controllers/Importer");

var Clamp = require("../../../libraries/Utils").Clamp;
// 

Importer.types.push(Decoder);
},{"../../../controllers/Importer":3,"../../../libraries/Constants":28,"../../../libraries/Utils":35,"../../../libraries/math/Vector":45,"../Gate":54}],67:[function(require,module,exports){
var DEFAULT_SIZE   = require("../../../libraries/Constants").DEFAULT_SIZE;
var IO_PORT_LENGTH = require("../../../libraries/Constants").IO_PORT_LENGTH;

var Gate = require("../Gate");

class Demultiplexer extends Gate {
    constructor(context, x, y) {
        super(context, false, x, y, undefined);
    }
    setInputAmount(target) {
        super.setInputAmount(target + 1);
        super.setOutputAmount(2 << (target-1));

        var width = Math.max(DEFAULT_SIZE/2*(target-1), DEFAULT_SIZE);
        var height = DEFAULT_SIZE/2*(2 << (target-1));
        this.transform.setSize(V(width+10, height));

        this.selectLines = [];
        for (var i = 0; i < target; i++) {
            var input = this.inputs[i];
            this.selectLines.push(input);

            var l = -DEFAULT_SIZE/2*(i - target/2 + 0.5);
            if (i === 0) l -= 1;
            if (i === target-1) l += 1;

            input.setOrigin(V(l, 0));
            input.setTarget(V(l, IO_PORT_LENGTH+height/2-DEFAULT_SIZE/2));
        }
        for (var i = 0; i < this.outputs.length; i++) {
            var output = this.outputs[i];

            var l = -DEFAULT_SIZE/2*(i - (this.outputs.length)/2 + 0.5);
            if (i === 0) l -= 1;
            if (i === this.outputs.length-1) l += 1;

            output.setOrigin(V(0, l));
            output.setTarget(V(IO_PORT_LENGTH+(width/2-DEFAULT_SIZE/2), l));
        }
        var input = this.inputs[this.inputs.length-1];
        input.setOrigin(V(0, 0));
        input.setTarget(V(-IO_PORT_LENGTH-(width/2-DEFAULT_SIZE/2), 0));
    }
    getInputAmount() {
        return this.selectLines.length;
    }
    activate(x) {
        var num = 0;
        for (var i = 0; i < this.selectLines.length; i++) {
            num = num | ((this.selectLines[i].isOn ? 1 : 0) << i);
        }
        super.activate(this.inputs[this.inputs.length-1].isOn, num);
        // var num = 0;
        // for (var i = 0; i < this.selectLines.length; i++)
        //     num = num | ((this.selectLines[i].isOn ? 1 : 0) << i);
        // super.activate(this.inputs[num + this.selectLines.length].isOn);
    }
    draw() {
        super.draw();

        var renderer = this.context.getRenderer();
        this.localSpace();

        var p1 = V(this.transform.size.x/2, this.transform.size.y/2);
        var p2 = V(this.transform.size.x/2, -this.transform.size.y/2);
        var p3 = V(-this.transform.size.x/2, -this.transform.size.y/2+20);
        var p4 = V(-this.transform.size.x/2, this.transform.size.y/2-20);

        renderer.shape([p1, p2, p3, p4], this.getCol(), this.getBorderColor(), 2);

        renderer.restore();
    }
    getMinInputFieldCount() {
        return 1;
    }
    getDisplayName() {
        return "Demultiplexer";
    }
}
Demultiplexer.getXMLName = function() { return "demux"; }

module.exports = Demultiplexer;

// Requirements
var V        = require("../../../libraries/math/Vector").V;
var Importer = require("../../../controllers/Importer");
// 

Importer.types.push(Demultiplexer);
},{"../../../controllers/Importer":3,"../../../libraries/Constants":28,"../../../libraries/math/Vector":45,"../Gate":54}],68:[function(require,module,exports){
var DEFAULT_SIZE = require("../../../libraries/Constants").DEFAULT_SIZE;

var Gate = require("../Gate");

class Encoder extends Gate {
    constructor(context, x, y) {
        super(context, false, x, y, undefined);
    }
    onTransformChange() {
        this.transform.setSize(V(DEFAULT_SIZE, DEFAULT_SIZE));
        super.onTransformChange();
        this.transform.setSize(V(DEFAULT_SIZE, DEFAULT_SIZE/2*(2 << (this.outputs.length-1))));
    }
    setInputAmount(target) {
        target = Clamp(target, 0, 8);
        super.setInputAmount(2 << (target-1));
        super.setOutputAmount(target);
    }
    getInputAmount() {
        return this.outputs.length;
    }
    activate(x) {
        var indx = -1;
        for (var i = 0; i < this.inputs.length; i++) {
            if (this.inputs[i].isOn) {
                if (indx !== -1)
                    return; // undefined behavior
                indx = i;
            }
        }
        if (indx === -1)
            return; // undefined behavior
        for (var i = this.outputs.length-1; i >= 0; i--) {
            var num = 1 << i;
            if (num > indx) {
                this.outputs[i].activate(false);
            } else {
                this.outputs[i].activate(true);
                indx -= num;
            }
        }
    }
    draw() {
        super.draw();

        var renderer = this.context.getRenderer();
        this.localSpace();
        renderer.rect(0, 0, this.transform.size.x, this.transform.size.y, this.getCol(), this.getBorderColor());
        renderer.restore();
    }
    getMinInputFieldCount() {
        return 1;
    }
    getDisplayName() {
        return "Encoder";
    }
}
Encoder.getXMLName = function() { return "encoder"; }

module.exports = Encoder;

// Requirements
var V        = require("../../../libraries/math/Vector").V;
var Importer = require("../../../controllers/Importer");

var Clamp = require("../../../libraries/Utils").Clamp;
// 

Importer.types.push(Encoder);
},{"../../../controllers/Importer":3,"../../../libraries/Constants":28,"../../../libraries/Utils":35,"../../../libraries/math/Vector":45,"../Gate":54}],69:[function(require,module,exports){
var DEFAULT_SIZE = require("../../../libraries/Constants").DEFAULT_SIZE;

var IOObject = require("../../IOObject");

class IC extends IOObject {
    constructor(context, data, x, y) {
        super(context, x, y, 50, 50, undefined, false, 999, 999);
        this.data = data;
        this.setup();
    }
    setup() {
        if (this.data == undefined)
            return;

        // Setup input and outputs
        this.setInputAmount(this.data.getInputAmount());
        this.setOutputAmount(this.data.getOutputAmount());

        // Copy object references
        var copy = this.data.copy();
        this.inputObjects = copy.inputs;
        this.outputObjects = copy.outputs;
        this.components = copy.components;
        for (var i = 0; i < this.outputObjects.length; i++) {
            var ii = i;
            var port = this.outputs[i];
            this.outputObjects[i].activate = function(on) {
                port.activate(on);
            }
        }
        this.noChange = true;

        this.update();
    }
    update() {
        if (this.data == undefined)
            return;

        // Update size
        this.transform.setWidth(this.data.getWidth());
        this.transform.setHeight(this.data.getHeight());

        // Update port positions
        for (var i = 0; i < this.inputs.length; i++) {
            this.inputs[i].setOrigin(this.data.iports[i].origin);
            this.inputs[i].setTarget(this.data.iports[i].target);
        }
        for (var i = 0; i < this.outputs.length; i++) {
            this.outputs[i].setOrigin(this.data.oports[i].origin);
            this.outputs[i].setTarget(this.data.oports[i].target);
        }

        this.activate();
    }
    activate() {
        for (var i = 0; i < this.inputs.length; i++) {
            this.inputObjects[i].activate(this.inputs[i].isOn);
        }
    }
    draw() {
        var renderer = this.context.getRenderer();

        super.draw();

        this.localSpace();

        var size = this.transform.size;
        renderer.rect(0, 0, size.x, size.y, this.getCol(), '#000000', 1);

        for (var i = 0; i < this.inputs.length; i++) {
            var name = this.inputObjects[i].getName();
            var pos1 = this.transform.toLocalSpace(this.inputs[i].getPos());
            var align = "center";
            var padding = 8;
            var ww = renderer.getTextWidth(name)/2;
            var pos = getNearestPointOnRect(V(-size.x/2, -size.y/2), V(size.x/2, size.y/2), pos1);
            pos = pos.sub(pos1).normalize().scale(padding).add(pos);
            pos.x = Clamp(pos.x, -size.x/2+padding+ww, size.x/2-padding-ww);
            pos.y = Clamp(pos.y, -size.y/2+14, size.y/2-14);
            renderer.text(name, pos.x, pos.y, 0, 0, align);
        }
        for (var i = 0; i < this.outputs.length; i++) {
            var name = this.outputObjects[i].getName();
            var pos1 = this.transform.toLocalSpace(this.outputs[i].getPos());
            var align = "center";
            var padding = 8;
            var ww = renderer.getTextWidth(name)/2;
            var pos = getNearestPointOnRect(V(-size.x/2, -size.y/2), V(size.x/2, size.y/2), pos1);
            pos = pos.sub(pos1).normalize().scale(padding).add(pos);
            pos.x = Clamp(pos.x, -size.x/2+padding+ww, size.x/2-padding-ww);
            pos.y = Clamp(pos.y, -size.y/2+14, size.y/2-14);
            renderer.text(name, pos.x, pos.y, 0, 0, align);
        }

        renderer.restore();
    }
    getDisplayName() {
        return "IC";
    }
    copy() {
        return new IC(this.context, this.data, this.transform.pos.x, this.transform.pos.y);
    }
    writeTo(node) {
        var ICNode = super.writeTo(node);
        createTextElement(ICNode, "icuid", this.data.getUID());
        return ICNode;
    }
    load(node, ics) {
        super.load(node);
        var icuid = getIntValue(getChildNode(node, "icuid"));
        var data = FindIC(icuid, ics);
        this.data = data;
        this.setup();
        return this;
    }
}
IC.getXMLName = function() { return "ic"; }

module.exports = IC;

// Requirements
var Importer = require("../../../controllers/Importer");

var Clamp             = require("../../../libraries/Utils").Clamp;
var FindIC            = require("../../../libraries/Utils").FindIC;
var createTextElement = require("../../../controllers/Exporter").createTextElement;
var getIntValue       = require("../../../controllers/Importer").getIntValue;
var getChildNode      = require("../../../controllers/Importer").getChildNode;
// 

Importer.types.push(IC);
},{"../../../controllers/Exporter":1,"../../../controllers/Importer":3,"../../../libraries/Constants":28,"../../../libraries/Utils":35,"../../IOObject":48}],70:[function(require,module,exports){
var DEFAULT_SIZE = require("../../../libraries/Constants").DEFAULT_SIZE;
var IO_PORT_LENGTH = require("../../../libraries/Constants").IO_PORT_LENGTH;

var IOObject = require("../../IOObject");

class ICData {
    constructor(inputs, outputs, components) {
        this.transform = new Transform(V(0,0),V(0,0),0);
        this.inputs = inputs;
        this.outputs = outputs;
        this.components = components;
        this.wires = GetAllWires(this.getObjects());

        this.uidmanager = new UIDManager(this);

        // Give everything a uid
        var objects = this.getObjects();
        for (var i = 0; i < objects.length; i++)
            this.uidmanager.giveUIDTo(objects[i]);
        for (var i = 0; i < this.wires.length; i++)
            this.uidmanager.giveUIDTo(this.wires[i]);

        // Set start size based on length of names and amount of ports
        var longestName = 0;
        for (var i = 0; i < this.inputs.length; i++)
            longestName = Math.max(this.inputs[i].getName().length, longestName);
        for (var i = 0; i < this.outputs.length; i++)
            longestName = Math.max(this.outputs[i].getName().length, longestName);
        var w = DEFAULT_SIZE + 20*longestName;
        var h = DEFAULT_SIZE/2*(Math.max(this.inputs.length, this.outputs.length));
        this.transform.setSize(V(w, h));

        // Create and position ioports
        this.iports = [];
        this.oports = [];
        for (var i = 0; i < this.inputs.length; i++) {
            this.iports[i] = new IPort();

            var l = -DEFAULT_SIZE/2*(i - (this.inputs.length)/2 + 0.5);
            if (i === 0) l -= 1;
            if (i === this.inputs.length-1) l += 1;

            this.iports[i].setOrigin(V(0, l));
            this.iports[i].setTarget(V(-IO_PORT_LENGTH-(w/2-DEFAULT_SIZE/2), l));
        }
        for (var i = 0; i < this.outputs.length; i++) {
            this.oports[i] = new OPort();

            var l = -DEFAULT_SIZE/2*(i - (this.outputs.length)/2 + 0.5);
            if (i === 0) l -= 1;
            if (i === this.outputs.length-1) l += 1;

            this.oports[i].setOrigin(V(0, l));
            this.oports[i].setTarget(V(IO_PORT_LENGTH+(w/2-DEFAULT_SIZE/2), l));
        }

        this.recalculatePorts();
    }
    recalculatePorts() {
        var size = this.transform.size;

        var inputs = this.iports;
        for (var i = 0; i < inputs.length; i++) {
            var inp = inputs[i];
            // Scale by large number to make sure that the target pos is not in the IC
            var targ = this.transform.getMatrix().mul(inp.target);
            var orig = this.transform.getMatrix().mul(inp.origin);
            var pos = targ.add(targ.sub(orig).normalize().scale(10000));
            var p = GetNearestPointOnRect(V(-size.x/2, -size.y/2), V(size.x/2, size.y/2), pos);
            var v1 = p.sub(pos).normalize().scale(size.scale(0.5)).add(p);
            var v2 = p.sub(pos).normalize().scale(size.scale(0.5).sub(V(IO_PORT_LENGTH+size.x/2-25, IO_PORT_LENGTH+size.y/2-25))).add(p);
            inp.setOrigin(v1);
            inp.setTarget(v2);
        }
        var outputs = this.oports;
        for (var i = 0; i < outputs.length; i++) {
            var out = outputs[i];
            // Scale by large number to make sure that the target pos is not in the IC
            var targ = this.transform.getMatrix().mul(out.target);
            var orig = this.transform.getMatrix().mul(out.origin);
            var pos = targ.add(targ.sub(orig).normalize().scale(10000));
            var p = GetNearestPointOnRect(V(-size.x/2, -size.y/2), V(size.x/2, size.y/2), pos);
            var v1 = p.sub(pos).normalize().scale(size.scale(0.5)).add(p);
            var v2 = p.sub(pos).normalize().scale(size.scale(0.5).sub(V(IO_PORT_LENGTH+size.x/2-25, IO_PORT_LENGTH+size.y/2-25))).add(p);
            out.setOrigin(v1);
            out.setTarget(v2);
        }
    }
    getInputAmount() {
        return this.inputs.length;
    }
    getOutputAmount() {
        return this.outputs.length;
    }
    copy() {
        return SeparateGroup(CopyGroup(this.getObjects()).objects);
    }
    getUID() {
        return this.icuid;
    }
    getObjects() {
        return this.inputs.concat(this.components, this.outputs);
    }
    getWires() {
        return this.wires;
    }
    getWidth() {
        return this.transform.getSize().x;
    }
    getHeight() {
        return this.transform.getSize().y;
    }
}
ICData.create = function(objects) {
    objects = CopyGroup(objects).objects;
    var separate = SeparateGroup(objects);
    for (var i = 0; i < separate.inputs.length; i++) {
        var input = separate.inputs[i];
        if (input instanceof Clock && input.getName() === input.getDisplayName())
            input.setName(">");
    }
    return new ICData(separate.inputs, separate.outputs, separate.components);
}
ICData.add = function(data) {
    data.icuid = ICData.ICs.length;
    ICData.ICs.push(data);
}
ICData.redistributeUIDs = function() {
    var ics = [];
    for (var i = 0; i < ICData.ICs.length; i++)
        ics[i] = ICData.ICs[i];
    ICData.ICs = [];
    for (var i = 0; i < ics.length; i++) {
        ics[i].icuid = i;
        ICData.ICs[i] = ics[i];
    }
}
ICData.ICs = [];

module.exports = ICData;

// Requirements
var V         = require("../../../libraries/math/Vector").V;
var Transform = require("../../../libraries/math/Transform");
var Importer  = require("../../../controllers/Importer");
var IPort     = require("../../IPort");
var OPort     = require("../../OPort");
// var Clock = require("../inputs/Clock");

var FindIC                = require("../../../libraries/Utils").FindIC;
var GetAllWires           = require("../../../libraries/Utils").GetAllWires;
var GetNearestPointOnRect = require("../../../libraries/Utils").GetNearestPointOnRect;
var SeparateGroup         = require("../../../libraries/Utils").SeparateGroup;
var CopyGroup             = require("../../../libraries/CopyUtils").CopyGroup;
var UIDManager            = require("../../../libraries/UIDManager").GetAllWires;
var createTextElement     = require("../../../controllers/Exporter").createTextElement;
var getIntValue           = require("../../../controllers/Importer").getIntValue;
var getChildNode          = require("../../../controllers/Importer").getChildNode;
// 
},{"../../../controllers/Exporter":1,"../../../controllers/Importer":3,"../../../libraries/Constants":28,"../../../libraries/CopyUtils":30,"../../../libraries/UIDManager":34,"../../../libraries/Utils":35,"../../../libraries/math/Transform":44,"../../../libraries/math/Vector":45,"../../IOObject":48,"../../IPort":50,"../../OPort":51}],71:[function(require,module,exports){
var IOObject = require("../../IOObject");

class Label extends IOObject {
    constructor(context, x, y) {
        super(context, x, y, 0, 0, undefined, true, 0, 0, 60, 30);
        this.setName("LABEL");

        this.setInputAmount(0);
        this.setOutputAmount(0);
    }
    activate(x) {
    }
    draw() {
        super.draw();

        var renderer = this.context.getRenderer();

        this.localSpace();

        var align = "center";
        var padding = 8;
        var ww = renderer.getTextWidth(this.text)/2;
        var pos = V(0, 0);
        renderer.text(this.name, pos.x, pos.y, 0, 0, align);

        renderer.restore();
    }
    setName(name) {
        super.setName(name);
        var renderer = this.context.getRenderer();
        var width = renderer.getTextWidth(this.name) + 20;
        this.selectionBoxTransform.setSize(V(width, this.selectionBoxTransform.size.y));
        this.onTransformChange();
        render();
    }
    getDisplayName() {
        return this.name;
    }
}
Label.getXMLName = function() { return "label"; }

module.exports = Label;

// Requirements
var V        = require("../../../libraries/math/Vector").V;
var Importer = require("../../../controllers/Importer");

var render = require("../../../views/Renderer").render;
// 

Importer.types.push(Label);
},{"../../../controllers/Importer":3,"../../../libraries/math/Vector":45,"../../../views/Renderer":77,"../../IOObject":48}],72:[function(require,module,exports){
var DEFAULT_SIZE   = require("../../../libraries/Constants").DEFAULT_SIZE;
var IO_PORT_LENGTH = require("../../../libraries/Constants").IO_PORT_LENGTH;

var Gate = require("../Gate");

class Multiplexer extends Gate {
    constructor(context, x, y) {
        super(context, false, x, y, undefined);
    }
    setInputAmount(target) {
        super.setInputAmount(target + (2 << (target-1)));

        var width = Math.max(DEFAULT_SIZE/2*(target-1), DEFAULT_SIZE);
        var height = DEFAULT_SIZE/2*(2 << (target-1));
        this.transform.setSize(V(width+10, height));

        this.selectLines = [];
        for (var i = 0; i < target; i++) {
            var input = this.inputs[i];
            this.selectLines.push(input);

            var l = -DEFAULT_SIZE/2*(i - target/2 + 0.5);
            if (i === 0) l -= 1;
            if (i === target-1) l += 1;

            input.setOrigin(V(l, 0));
            input.setTarget(V(l, IO_PORT_LENGTH+height/2-DEFAULT_SIZE/2));
        }
        for (var ii = target; ii < this.inputs.length; ii++) {
            var input = this.inputs[ii];

            var i = ii - target;

            var l = -DEFAULT_SIZE/2*(i - (this.inputs.length-target)/2 + 0.5);
            if (i === 0) l -= 1;
            if (i === this.inputs.length-target-1) l += 1;

            input.setOrigin(V(0, l));
            input.setTarget(V(-IO_PORT_LENGTH-(width/2-DEFAULT_SIZE/2), l));
        }
        var output = this.outputs[0];
        output.target = V(IO_PORT_LENGTH+(width/2-DEFAULT_SIZE/2), output.target.y);
    }
    getInputAmount() {
        return this.selectLines.length;
    }
    activate(x) {
        var num = 0;
        for (var i = 0; i < this.selectLines.length; i++)
            num = num | ((this.selectLines[i].isOn ? 1 : 0) << i);
        super.activate(this.inputs[num + this.selectLines.length].isOn);
    }
    draw() {
        super.draw();

        var renderer = this.context.getRenderer();
        this.localSpace();

        var p1 = V(-this.transform.size.x/2, this.transform.size.y/2);
        var p2 = V(-this.transform.size.x/2, -this.transform.size.y/2);
        var p3 = V(this.transform.size.x/2, -this.transform.size.y/2+20);
        var p4 = V(this.transform.size.x/2, this.transform.size.y/2-20);

        renderer.shape([p1, p2, p3, p4], this.getCol(), this.getBorderColor(), 2);

        renderer.restore();
    }
    getMinInputFieldCount() {
        return 1;
    }
    getDisplayName() {
        return "Multiplexer";
    }
    getXMLName() {
        return "mux";
    }
}
Multiplexer.getXMLName = function() { return "mux"; }

module.exports = Multiplexer;

// Requirements
var V        = require("../../../libraries/math/Vector").V;
var Importer = require("../../../controllers/Importer");
// 

Importer.types.push(Multiplexer);
},{"../../../controllers/Importer":3,"../../../libraries/Constants":28,"../../../libraries/math/Vector":45,"../Gate":54}],73:[function(require,module,exports){
var IOObject = require("../../IOObject");

class SevenSegmentDisplay extends IOObject {
    constructor(context, x, y) {
        super(context, x, y, 100*7/10, 100, undefined, false, 7, 0);
        this.setInputAmount(7);
        this.noChange = true;
        this.segmentWidth = 45;
        this.segmentHeight = 10;

        for (var ii = 0; ii < 7; ii++) {
            var iport = this.inputs[ii];
            var i = iport.getIndex();

            var l = -15*(i - iport.getArray().length/2.0 + 0.5);

            iport.setOrigin(V(iport.origin.x, l));
            iport.setTarget(V(iport.target.x, l));
        }
        var w = this.transform.size.x;
        var h = this.transform.size.y;

        var padding = 15;

        var sw = this.segmentWidth;
        var sh = this.segmentHeight;

        this.segmentPositions = [V(0, -sw+sh),
                                 V(sw/2-sh/2, (-sw+sh)/2),
                                 V(sw/2-sh/2, (+sw-sh)/2),
                                 V(0, sw-sh),
                                 V(-sw/2+sh/2, (+sw-sh)/2),
                                 V(-sw/2+sh/2, (-sw+sh)/2),
                                 V(0, 0)];
        this.segmentSizes = [V(sw,sh), V(sh,sw), V(sh, sw), V(sw, sh), V(sh, sw), V(sh, sw), V(sw, sh)];
        this.segmentImages = [Images["segment1.svg"], Images["segment2.svg"], Images["segment2.svg"], Images["segment1.svg"], Images["segment2.svg"], Images["segment2.svg"], Images["segment1.svg"]];
        this.segmentOnImages = [Images["segment3.svg"], Images["segment4.svg"], Images["segment4.svg"], Images["segment3.svg"], Images["segment4.svg"], Images["segment4.svg"], Images["segment3.svg"]];
    }
    draw() {
        super.draw();

        this.localSpace();
        var renderer = this.context.getRenderer();
        renderer.rect(0, 0, this.transform.size.x, this.transform.size.y, this.getCol(), this.getBorderColor());

        for (var i = 0; i < 7; i++) {
            var pos = this.segmentPositions[i];
            var size = this.segmentSizes[i];
            var on = this.inputs[i].isOn;
            var img = (on ? this.segmentOnImages[i] : this.segmentImages[i]);

            renderer.image(img, pos.x, pos.y, size.x, size.y, undefined);
        }

        renderer.restore();
    }
    getDisplayName() {
        return "7 Segment Display";
    }
    getXMLName() {
        return "sevensegmentdisplay";
    }
}
SevenSegmentDisplay.getXMLName = function() { return "sevensegmentdisplay"; }

module.exports = SevenSegmentDisplay;

// Requirements
var V        = require("../../../libraries/math/Vector").V;
var Images   = require("../../../libraries/Images");
var Importer = require("../../../controllers/Importer");
// 

Importer.types.push(SevenSegmentDisplay);
},{"../../../controllers/Importer":3,"../../../libraries/Images":32,"../../../libraries/math/Vector":45,"../../IOObject":48}],74:[function(require,module,exports){
var DEFAULT_SIZE   = require("../../../libraries/Constants").DEFAULT_SIZE;

var IOObject = require("../../IOObject");

class LED extends IOObject {
    constructor(context, x, y, color) {
        super(context, x, y, DEFAULT_SIZE, DEFAULT_SIZE, Images["led.svg"], false, 1, 0);
        this.transform.setPos(V(this.transform.pos.x, this.transform.pos.y - 2*this.transform.size.y));
        this.color = (color == undefined) ? ("#ffffff") : (color);
        this.connectorWidth = 5;

        this.setInputAmount(1);
        this.inputs[0].setOrigin(V(0, 0));
        this.inputs[0].setTarget(V(0, 2*this.transform.size.y));
        this.inputs[0].lineColor = '#ffffff';
        this.inputs[0].dir = V(0, 1);
    }
    updateCullTransform() {
        super.updateCullTransform();
        if (this.isOn) {
            this.cullTransform.setSize(V(3*this.transform.size.x, 4*this.transform.size.y));
            this.cullTransform.setPos(this.transform.pos.add(V(0, (this.inputs[0].target.y - this.transform.size.y*3/2)/2)));
        }
    }
    activate(on, i) {
        super.activate(on, i);
        this.updateCullTransform();
    }
    getImageTint() {
        return this.color;
    }
    draw() {
        super.draw();

        var renderer = this.context.getRenderer();

        this.localSpace();
        if (this.isOn)
            renderer.image(Images["ledLight.svg"], 0, 0, 3*this.transform.size.x, 3*this.transform.size.y, this.color);
        renderer.restore();
    }
    getDisplayName() {
        return "LED";
    }
    copy() {
        var copy = super.copy();
        copy.color = this.color;
        copy.connectorWidth = this.connectorWidth;
        return copy;
    }
    writeTo(node) {
        var LEDNode = super.writeTo(node);
        createTextElement(LEDNode, "color", this.color);
        return LEDNode;
    }
    load(node) {
        super.load(node);
        var color = getStringValue(getChildNode(node, "color"));
        this.color = color;
        return this;
    }
}
LED.getXMLName = function() { return "led"; }

module.exports = LED;

// Requirements
var V        = require("../../../libraries/math/Vector").V;
var Images   = require("../../../libraries/Images");
var Importer = require("../../../controllers/Importer");

var getStringValue    = require("../../../controllers/Importer").getStringValue;
var getChildNode      = require("../../../controllers/Importer").getChildNode;
var createTextElement = require("../../../controllers/Exporter").createTextElement;
// 

Importer.types.push(LED);
},{"../../../controllers/Exporter":1,"../../../controllers/Importer":3,"../../../libraries/Constants":28,"../../../libraries/Images":32,"../../../libraries/math/Vector":45,"../../IOObject":48}],75:[function(require,module,exports){
var PROPAGATION_TIME = require("../libraries/Constants").PROPAGATION_TIME;
var GRID_SIZE        = require("../libraries/Constants").GRID_SIZE;

class CircuitDesigner {
    constructor(canvas, vw, vh) {
        this.renderer = new Renderer(this, canvas, vw, vh);
        this.camera = new Camera(this);
        this.history = new HistoryManager();

        this.wires = [];
        this.objects = [];

        this.updateRequests = 0;
        this.propagationQueue = [];

        window.addEventListener('resize', e => this.resize(), false);

        this.resize();
    }
    reset() {
        for (var i = 0; i < this.objects.length; i++)
            this.objects[i].remove();
        for (var i = 0; i < this.wires.length; i++)
            this.wires[i].remove();
        this.objects = [];
        this.wires = [];
        this.propagationQueue = [];
    }
    propogate(sender, receiver, signal) {
        this.propagationQueue.push(new Propagation(this, sender, receiver, signal, () => this.update(sender, receiver)));//() => this.update()));
    }
    update(sender, receiver) {
        var tempQueue = [];
        while (this.propagationQueue.length > 0)
            tempQueue.push(this.propagationQueue.pop());

        while (tempQueue.length > 0)
            tempQueue.pop().send();

        if (this.propagationQueue.length > 0)
            this.updateRequests++;

        this.updateRequests--;

        console.log("update");

        // See if the sender/receiver is a wire in the scene (not in an IC) to render
        var inScene = false;
        if (sender instanceof Wire || receiver instanceof Wire) {
            for (var i = 0; i < this.wires.length; i++) {
                if (this.wires[i] === sender || this.wires[i] === receiver) {
                    inScene = true;
                    break;
                }
            }
        } else {
            render();
        }

        if (inScene)
            render();

        if (this.updateRequests > 0) {
            setTimeout(() => this.update(sender, receiver), PROPAGATION_TIME);
        }
    }
    render() {
        // console.log("RENDER");

        this.renderer.clear();

        var step = GRID_SIZE/this.camera.zoom;

        var cpos = V(this.camera.pos.x/this.camera.zoom - this.renderer.canvas.width/2, this.camera.pos.y/this.camera.zoom - this.renderer.canvas.height/2);

        var cpx = cpos.x - Math.floor(cpos.x / step) * step;
        if (cpx < 0) cpx += step;
        var cpy = cpos.y - Math.floor(cpos.y / step) * step;
        if (cpy < 0) cpy += step;

        // Batch-render the lines = uglier code + way better performance
        this.renderer.save();
        this.renderer.setStyles(undefined, '#999', 1 / this.camera.zoom);
        this.renderer.context.beginPath();
        for (var x = -cpx; x <= this.renderer.canvas.width-cpx+step; x += step) {
            this.renderer._line(x, 0, x, this.renderer.canvas.height);
        }
        for (var y = -cpy; y <= this.renderer.canvas.height-cpy+step; y += step) {
            this.renderer._line(0, y, this.renderer.canvas.width, y);
        }
        this.renderer.context.closePath();
        this.renderer.context.stroke();
        this.renderer.restore();

        // Cull objects/wires if they aren't on the screen
        for (var i = 0; i < this.wires.length; i++) {
            if (this.camera.cull(this.wires[i].getCullBox()))
                this.wires[i].draw();
        }
        for (var i = 0; i < this.objects.length; i++) {
            if (this.camera.cull(this.objects[i].getCullBox()))
                this.objects[i].draw();
        }

        getCurrentTool().draw(this.renderer);
    }
    resize() {
        this.renderer.resize();
        this.camera.resize();

        render();
    }
    addObject(o) {
        if (this.getIndexOfObject(o) === -1)
            this.objects.push(o);
        else
            console.error("Attempted to add an object that already existed!");
    }
    addWire(w) {
        if (this.getIndexOfWire(w) === -1)
            this.wires.push(w);
        else
            console.error("Attempted to add a wire that already existed!");
    }
    getRenderer() {
        return this.renderer;
    }
    getObjects() {
        return this.objects;
    }
    getWires() {
        return this.wires;
    }
    getIndexOfObject(obj) {
        for (var i = 0; i < this.objects.length; i++) {
            if (obj === this.objects[i])
                return i;
        }
        return -1;
    }
    getIndexOfWire(wire) {
        for (var i = 0; i < this.wires.length; i++) {
            if (wire === this.wires[i])
                return i;
        }
        return -1;
    }
}

module.exports = CircuitDesigner;

// Requirements
var V              = require("../libraries/math/Vector").V;
var Camera         = require("../libraries/Camera");
var HistoryManager = require("../libraries/HistoryManager");
var Propagation    = require("../libraries/Propagation");
var Wire           = require("../models/Wire");
var Renderer       = require("./Renderer");

var render         = require("./Renderer").render;
var getCurrentTool = require("../controllers/tools/Tool").getCurrent;
// 
},{"../controllers/tools/Tool":26,"../libraries/Camera":27,"../libraries/Constants":28,"../libraries/HistoryManager":31,"../libraries/Propagation":33,"../libraries/math/Vector":45,"../models/Wire":52,"./Renderer":77}],76:[function(require,module,exports){
// var Utils           = require("../libraries/Utils")
var Images              = require("../libraries/Images");
var Context             = require("../libraries/Context");
// var ICDesigner          = require("../controllers/ICDesigner");
// var SelectionPopup      = require("../controllers/selectionpopup/SelectionPopup");
// var ContextMenu         = require("../controllers/contextmenu/ContextMenu");
// var SelectionTool       = require("../controllers/tools/SelectionTool");
// var Input               = require("../controllers/Input");
// var TransformController = require("../controllers/TransformController");
// var WireController      = require("../controllers/WireController");
// var SelectionBox        = require("../controllers/SelectionBox");
// var IOObject            = require("../models/IOObject");
// var CircuitDesigner     = require("./CircuitDesigner");
// 
// var render = require("./Renderer").render;

// var Popup;

// Prompt for exit
// window.onbeforeunload = function(e) {
//     if (!saved) {
//         var dialogText = "You have unsaved changes.";
//         e.returnValue = dialogText;
//         return dialogText;
//     }
// };

function Start() {
    var designer = new CircuitDesigner(document.getElementById("canvas"));
    // MainContext = new Context(designer);
    // CurrentContext = Context;
    Context.setMainContext(new Context(designer));
    Context.setCurrentContext(Context.getMainContext());

    // popup = new SelectionPopup();
    // icdesigner = new ICDesigner();
    // contextmenu = new ContextMenu();
    
    Input.registerContext(Context.getMainContext());
    Input.registerContext(ICDesigner.context);
    
    Input.addMouseListener(TransformController);
    Input.addMouseListener(WireController);
    Input.addMouseListener(SelectionBox);
    
    Input.addMouseListener(ICDesigner);
    
    SelectionTool.activate();

    Images.load(["constLow.svg", "constHigh.svg",
                 "buttonUp.svg", "buttonDown.svg",
                 "switchUp.svg", "switchDown.svg",
                 "led.svg"     , "ledLight.svg",
                 "buffer.svg"  , "and.svg",
                 "or.svg"      , "xor.svg",
                 "segment1.svg", "segment2.svg",
                 "segment3.svg", "segment4.svg",
                 "clock.svg"   , "clockOn.svg",
                 "keyboard.svg", "base.svg"], 0, OnFinishLoading);
}

function OnFinishLoading() {
    render();
}

// document.body.onload = Start;

},{"../libraries/Context":29,"../libraries/Images":32}],77:[function(require,module,exports){
var Browser = require("../libraries/Utils").GetBrowser();

class Renderer {
    constructor(parent, canvas, vw, vh) {
        this.parent = parent;
        this.canvas = canvas;
        this.tintCanvas = document.createElement("canvas");
        this.vw = (vw == undefined ? 1 : vw);
        this.vh = (vh == undefined ? 1 : vh);

        this.context = this.canvas.getContext("2d");

        this.tintCanvas.width = 100;
        this.tintCanvas.height = 100;
        this.tintContext = this.tintCanvas.getContext("2d");
    }
    getCamera() {
        return this.parent.camera;
    }
    setCursor(cursor) {
        this.canvas.style.cursor = cursor;
    }
    resize() {
        this.canvas.width = window.innerWidth * this.vw;
        this.canvas.height = window.innerHeight * this.vh;
    }
    clear() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    save() {
        this.context.save();
    }
    restore() {
        this.context.restore();
    }
    translate(v) {
        this.context.translate(v.x, v.y);
    }
    scale(s) {
        this.context.scale(s.x, s.y);
    }
    rotate(a) {
        this.context.rotate(a);
    }
    rect(x, y, w, h, fillStyle, borderStyle, borderSize, alpha) {
        this.save();
        this.setStyles(fillStyle, borderStyle, borderSize, alpha);
        this.context.beginPath();
        this.context.rect(x - w/2, y - h/2, w, h);
        this.context.fill();
        if (borderSize > 0 || borderSize == undefined)
            this.context.stroke();
        this.context.closePath();
        this.restore();
    }
    circle(x, y, r, fillStyle, borderStyle, borderSize, alpha) {
        this.save();
        this.setStyles(fillStyle, borderStyle, borderSize, alpha);
        this.context.beginPath();
        this.context.arc(x, y, r, 0, 2*Math.PI);
        if (fillStyle != undefined)
            this.context.fill();
        if (borderSize > 0 || borderSize == undefined)
            this.context.stroke();
        this.context.closePath();
        this.restore();
    }
    image(img, x, y, w, h, tint) {
        this.context.drawImage(img, x - w/2, y - h/2, w, h);
        if (tint != undefined)
            this.tintImage(img, x, y, w, h, tint);
    }
    tintImage(img, x, y, w, h, tint) {
        this.tintContext.clearRect(0, 0, this.tintCanvas.width, this.tintCanvas.height);
        this.tintContext.fillStyle = tint;
        this.tintContext.fillRect(0, 0, this.tintCanvas.width, this.tintCanvas.height);
        if (Browser.name !== "Firefox")
            this.tintContext.globalCompositeOperation = "destination-atop";
        else
            this.tintContext.globalCompositeOperation = "source-atop";
        this.tintContext.drawImage(img, 0, 0, this.tintCanvas.width, this.tintCanvas.height);

        this.context.globalAlpha = 0.5;
        this.context.drawImage(this.tintCanvas, x - w/2, y - h/2, w, h);
        this.context.globalAlpha = 1.0;
    }
    text(txt, x, y, w, h, textAlign) {
        this.save();
        this.context.font = "lighter 15px arial";
        this.context.fillStyle = '#000';
        this.context.textAlign = textAlign;
        this.context.textBaseline = "middle";
        this.context.fillText(txt, x, y);
        this.restore();
    }
    getTextWidth(txt) {
        var width = 0;
        this.save();
        this.context.font = "lighter 15px arial";
        this.context.fillStyle = '#000';
        this.context.textBaseline = "middle";
        width = this.context.measureText(txt).width;
        this.restore();
        return width;
    }
    line(x1, y1, x2, y2, style, size) {
        this.save();
        this.setStyles(undefined, style, size);
        this.context.beginPath();
        this.context.moveTo(x1, y1);
        this.context.lineTo(x2, y2);
        this.context.stroke();
        this.context.closePath();
        this.restore();
    }
    _line(x1, y1, x2, y2) {
        this.context.moveTo(x1, y1);
        this.context.lineTo(x2, y2);
    }
    curve(x1, y1, x2, y2, cx1, cy1, cx2, cy2, style, size) {
        this.save();
        this.setStyles(undefined, style, size);
        this.context.beginPath();
        this.context.moveTo(x1, y1);
        this.context.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2);
        this.context.stroke();
        this.context.closePath();
        this.restore();
    }
    quadCurve(x1, y1, x2, y2, cx, cy, style, size) {
        this.save();
        this.setStyles(undefined, style, size);
        this.context.beginPath();
        this.context.moveTo(x1, y1);
        this.context.quadraticCurveTo(cx, cy, x2, y2);
        this.context.stroke();
        this.context.closePath();
        this.restore();
    }
    shape(points, fillStyle, borderStyle, borderSize) {
        this.save();
        this.setStyles(fillStyle, borderStyle, borderSize);
        this.context.beginPath();
        this.context.moveTo(points[0].x, points[0].y);
        for (var i = 1; i < points.length; i++)
            this.context.lineTo(points[i].x, points[i].y);
        this.context.lineTo(points[0].x, points[0].y);
        this.context.fill();
        this.context.closePath();
        if (borderSize > 0)
            this.context.stroke();
        this.restore();
    }
    setStyles(fillStyle, borderStyle, borderSize, alpha) {
        if (alpha != undefined && alpha !== this.context.globalAlpha)
            this.context.globalAlpha = alpha;

        fillStyle = (fillStyle == undefined) ? ('#ffffff') : (fillStyle);
        if (fillStyle != undefined && fillStyle !== this.context.fillStyle)
            this.context.fillStyle = fillStyle;

        borderStyle = (borderStyle == undefined) ? ('#000000') : (borderStyle);
        if (borderStyle != undefined && borderStyle !== this.context.strokeStyle)
            this.context.strokeStyle = borderStyle;

        borderSize = (borderSize == undefined) ? (2) : (borderSize);
        if (borderSize != undefined && borderSize !== this.context.lineWidth)
            this.context.lineWidth = borderSize;
    }
}

var getCurrentContext = require("../libraries/Context").getCurrentContext;

var render = (function() {
    var renderQueue = 0;
    return {
        render: function() {
            // if (__TESTING__) // Never render while unit testing
            //     return;
                
            if (renderQueue === 0) {
                requestAnimationFrame(function() {
                    renderQueue = 0;
                    getCurrentContext().render();
                });
            }
            
            renderQueue++;
        }
    }
})();

module.exports = Renderer;
module.exports.render = render.render;
},{"../libraries/Context":29,"../libraries/Utils":35}]},{},[76]);
