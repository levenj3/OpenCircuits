// Requirements
var IOObject = require("../models/IOObject");
var Wire     = require("../models/Wire");
var WirePort = require("../models/WirePort");
var IPort    = require("../models/IPort");
var OPort    = require("../models/OPort");
var Switch   = require("../models/ioobjects/inputs/Switch");
var Button   = require("../models/ioobjects/inputs/Button");
var Clock    = require("../models/ioobjects/inputs/Clock");
var LED      = require("../models/ioobjects/outputs/LED");
// 


// Okay, I know this is awful but it's like 5:47 am and I'm tired
function GetAllThingsBetween(things) {
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
function GetAllWires(objects) {
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

// Separates an array of objects into three sub-groups
// of input-type objects (switch and buttons),
// output-type objects (LEDs),
// and other components.
function SeparateGroup(group) {
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
function FindIC(id, ics) {
    for (var i = 0; i < ics.length; i++) {
        if (ics[i].icuid === id)
            return ics[i];
    }
    return undefined;
}

module.exports.GetAllThingsBetween = GetAllThingsBetween;
module.exports.GetAllWires = GetAllWires;
module.exports.FindIC = FindIC;
module.exports.SeparateGroup = SeparateGroup;