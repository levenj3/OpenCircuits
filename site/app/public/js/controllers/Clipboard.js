// Requirements
var SelectionTool = require("./tools/SelectionTool");
var Importer      = require("./Importer");
var Exporter      = require("./Exporter");
var PlaceAction   = require("../libraries/actions/PlaceAction");
var GroupAction   = require("../libraries/actions/GroupAction");

var GetAllThingsBetween = require("../libraries/Utils").GetAllThingsBetween;
var getCurrentContext   = require("../libraries/Context").getCurrentContext;
var render              = require("../libraries/RenderUtils").render;
// 

var Clipboard = (function() {
    document.addEventListener('copy',  e => {this.copy(e)},  false);
    document.addEventListener('cut',   e => {this.cut(e)},   false);
    document.addEventListener('paste', e => {this.paste(e)}, false);
    
    return {
        copy: function(e) {
            var selections = SelectionTool.selections;
            var things = GetAllThingsBetween(selections);
            var objects = [];
            var wires = [];
            for (var i = 0; i < things.length; i++) {
                if (things[i] instanceof Wire)
                    wires.push(things[i]);
                else
                    objects.push(things[i]);
            }
            var ctx = {getObjects: function() {return objects;}, getWires: function() {return wires;}};
            var data = Exporter.write(ctx);
            e.clipboardData.setData("text/plain", data);
            e.preventDefault();
        },
        cut: function(e) {
            this.copy(e);
            SelectionTool.removeSelections(true);
            e.preventDefault();
        },
        paste: function(e) {
            console.log("ASd");
            var group = Importer.load(e.clipboardData.getData("text/plain"), getCurrentContext());
            var objects = group.objects;
            var wires = group.wires;

            var action = new GroupAction();

            for (var i = 0; i < objects.length; i++) {
                objects[i].setPos(objects[i].getPos().add(V(5, 5)));
                action.add(new PlaceAction(objects[i]));
            }

            getCurrentContext().addAction(action);

            SelectionTool.deselectAll();
            SelectionTool.select(objects);

            render();
            e.preventDefault();
        }
    }
})();

module.exports = Clipboard;