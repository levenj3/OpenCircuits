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
        
        if (button)
            button.onclick  =  () => { PlaceItemController.place(new obj(), not); };
        if (image)
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

module.exports = PlaceItemController;

// Requirements
var ItemTool = require("./tools/ItemTool");

var getCurrentContext = require("../libraries/Context").getCurrentContext;
// 