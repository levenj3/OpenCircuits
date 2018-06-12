var { expect } = require('chai');

var V         = require('../../../../../site/app/public/js/libraries/math/Vector').V;
var MathUtils = require('../../../../../site/app/public/js/libraries/math/MathUtils');
var Transform = require('../../../../../site/app/public/js/libraries/math/Transform');

describe("MathUtils", () => {
    it("RectContains", () => {
        var t1 = new Transform(V(0, 0), V(10, 10), 0);
        expect(MathUtils.RectContains(t1, V(0, 0))).to.eql(true);
        expect(MathUtils.RectContains(t1, V(5, 5))).to.eql(true);
        expect(MathUtils.RectContains(t1, V(-5, -5))).to.eql(true);
        expect(MathUtils.RectContains(t1, V(-5, 5))).to.eql(true);
        expect(MathUtils.RectContains(t1, V(5, -5))).to.eql(true);
        
        expect(MathUtils.RectContains(t1, V(6, 6))).to.eql(false);
        expect(MathUtils.RectContains(t1, V(-6, -6))).to.eql(false);
    });
    it("CircleContains", () => {
        var t1 = new Transform(V(0, 0), V(10, 10), 0);
        expect(MathUtils.CircleContains(t1, V(0, 0))).to.eql(true);
        expect(MathUtils.CircleContains(t1, V(5, 0))).to.eql(true);
        expect(MathUtils.CircleContains(t1, V(-5, 0))).to.eql(true);
        expect(MathUtils.CircleContains(t1, V(0, 5))).to.eql(true);
        expect(MathUtils.CircleContains(t1, V(0, -5))).to.eql(true);
        
        expect(MathUtils.CircleContains(t1, V(5, 5))).to.eql(false);
        expect(MathUtils.CircleContains(t1, V(-5, -5))).to.eql(false);
    });
    it("TransformContains", () => {
        
    });
    it("GetNearestPointOnRect", () => {
        
    });
    it("FindRoots", () => {
        
    });
    it("GetNearestT", () => {
        
    });
    it("Clamp", () => {
        expect(MathUtils.Clamp(-5, 0, 5)).to.eql(0);
        expect(MathUtils.Clamp(10, 0, 5)).to.eql(5);
        expect(MathUtils.Clamp( 3, 0, 5)).to.eql(3);
    });
    
    
    it("GetAllThingsBetween", () => {
        
    });
    it("GetAllWires", () => {
        
    });
    it("FindIC", () => {
        
    });
    it("FindByUID", () => {
        
    });
    it("SeparateGroup", () => {
        // var input1 = new Switch();
        // var input2 = new Switch();
        // var comp1 = new BUFGate();
        // var comp2 = new ANDGate();
        // var output1 = new LED();
        // var output2 = new LED();
        // 
        // var separate = Utils.SeparateGroup([input1, comp1, output1, input2, comp2, output2]);
        // 
        // expect(separate.inputs).toEqual([input1, input2]);
        // expect(separate.components).toEqual([comp1, comp2]);
        // expect(separate.outputs).toEqual([output1, output2]);
    });
});