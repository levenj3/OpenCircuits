var Utils           = require("../libraries/Utils")
var Images              = require("../libraries/Images");
var Context             = require("../libraries/Context");
var ICDesigner          = require("../controllers/ICDesigner");
var SelectionPopup      = require("../controllers/selectionpopup/SelectionPopup");
var ContextMenu         = require("../controllers/contextmenu/ContextMenu");
var SelectionTool       = require("../controllers/tools/SelectionTool");
var Input               = require("../controllers/Input");
var TransformController = require("../controllers/TransformController");
var WireController      = require("../controllers/WireController");
var SelectionBox        = require("../controllers/SelectionBox");
var IOObject            = require("../models/IOObject");
var CircuitDesigner     = require("./CircuitDesigner");

var render = require("./Renderer").render;

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
    ICDesigner.setup();
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

document.body.onload = Start;
