var ROOT = undefined;

function generateRoot() {
    ROOT = new window.DOMParser().parseFromString("<?xml version=\"1.0\" encoding=\"UTF-8\"?><project></project>", "text/xml");
    return ROOT;
}

function getRoot() {
    return ROOT;
}

function createChildNode(parent, tag) {
    var child = ROOT.createElement(tag);
    parent.appendChild(child);
    return child;
}

function createTextElement(node, tag, text) {
    var a = ROOT.createElement(tag);
    var b = ROOT.createTextNode(text);
    a.appendChild(b);
    node.appendChild(a);
}

module.exports.generateRoot = generateRoot;
module.exports.getRoot = getRoot;
module.exports.createChildNode = createChildNode;
module.exports.createTextElement = createTextElement;