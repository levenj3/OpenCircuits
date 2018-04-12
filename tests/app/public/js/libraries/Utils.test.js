var Utils = require('../../../../../site/app/public/js/libraries/Utils');

var IOObject = require('../../../../../site/app/public/js/models/IOOBject');
var Switch = require('../../../../../site/app/public/js/models/ioobjects/inputs/Switch');
var BUFGate = require('../../../../../site/app/public/js/models/ioobjects/gates/BUFGate');
var ANDGate = require('../../../../../site/app/public/js/models/ioobjects/gates/ANDGate');
var LED = require('../../../../../site/app/public/js/models/ioobjects/outputs/LED');

describe("Utils", () => {
    it("rectContains", () => {
        
    });
    it("circleContains", () => {
        
    });
    it("transformContains", () => {
        
    });
    it("getNearestPointOnRect", () => {
        
    });
    it("getAllThingsBetween", () => {
        
    });
    it("rectContains", () => {
        
    });
    it("getAllWires", () => {
        
    });
    it("findIC", () => {
        
    });
    it("findByUID", () => {
        
    });
    it("getNearestT", () => {
        
    });
    it("FindRoots", () => {
        
    });
    it("SeparateGroup", () => {
        var input1 = new Switch();
        var input2 = new Switch();
        var comp1 = new BUFGate();
        var comp2 = new ANDGate();
        var output1 = new LED();
        var output2 = new LED();
        
        var separate = Utils.SeparateGroup([input1, comp1, output1, input2, comp2, output2]);
        
        expect(separate.inputs).toEqual([input1, input2]);
        expect(separate.components).toEqual([comp1, comp2]);
        expect(separate.outputs).toEqual([output1, output2]);
    });
    it("Clamp", () => {
        {
            var x = -5;
            var min = 0;
            var max = 5;
            expect(Utils.Clamp(x, min, max)).toBe(0);
        }
        {
            var x = 10;
            var min = 0;
            var max = 5;
            expect(Utils.Clamp(x, min, max)).toBe(5);
        }
        {
            var x = 3;
            var min = 0;
            var max = 5;
            expect(Utils.Clamp(x, min, max)).toBe(3);
        }
    });
});