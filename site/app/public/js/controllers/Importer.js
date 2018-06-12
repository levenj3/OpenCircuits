// var SevenSegmentDisplay = require("../models/ioobjects/outputs/7SegmentDisplay");
// var ConstantLow   = require("../models/ioobjects/inputs/ConstantLow");
// var ConstantHigh  = require("../models/ioobjects/inputs/ConstantHigh");
// var Button        = require("../models/ioobjects/inputs/Button");
// var Switch        = require("../models/ioobjects/inputs/Switch");
// var Clock         = require("../models/ioobjects/inputs/Clock");
// var Keyboard      = require("../models/ioobjects/inputs/Keyboard");
// var LED           = require("../models/ioobjects/outputs/LED");
// var BUFGate       = require("../models/ioobjects/gates/BUFGate");
// var ANDGate       = require("../models/ioobjects/gates/ANDGate");
// var ORGate        = require("../models/ioobjects/gates/ORGate");
// var XORGate       = require("../models/ioobjects/gates/XORGate");
// var SRFlipFlop    = require("../models/ioobjects/flipflops/SRFlipFlop");
// var Multiplexer   = require("../models/ioobjects/other/Multiplexer");
// var Demultiplexer = require("../models/ioobjects/other/Demultiplexer");
// var Encoder       = require("../models/ioobjects/other/Encoder");
// var Decoder       = require("../models/ioobjects/other/Decoder");
// var Label         = require("../models/ioobjects/other/Label");

var Importer = (function() {   
    var fileInput = document.getElementById('file-input');
    
    if (fileInput)
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

module.exports = Importer;


// Requirements
var ICData = require("../models/ioobjects/other/ICData");
var Wire   = require("../models/Wire");
var IPort  = require("../models/IPort");

var getCurrentContext    = require("../libraries/Context").getCurrentContext;
var reset                = require("../libraries/Context").reset;
var getChildNode         = require("../libraries/ImportUtils").getChildNode;
var getChildrenByTagName = require("../libraries/ImportUtils").getChildrenByTagName;
var getBooleanValue      = require("../libraries/ImportUtils").getBooleanValue;
var getIntValue          = require("../libraries/ImportUtils").getIntValue;
var getFloatValue        = require("../libraries/ImportUtils").getFloatValue;
var getStringValue       = require("../libraries/ImportUtils").getStringValue;
var render               = require("../libraries/RenderUtils").render;
//
