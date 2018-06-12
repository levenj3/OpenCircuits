var { expect } = require('chai');

var Utils = require('../../../../../site/app/public/js/libraries/Utils');

describe("Utils", () => {
    it("CopyArray", () => {
        var arr1 = [1,2,3];
        var arr2 = Utils.CopyArray(arr1);
        expect(arr1).to.eql(arr2).but.not.equal(arr2);
    });
});