// Requirements
var getCurrentContext = require("../libraries/Context").getCurrentContext;
//

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

module.exports.render = render.render;