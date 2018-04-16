function getChildNode(parent, name) {
    for (var i = 0; i < parent.childNodes.length; i++) {
        if (parent.childNodes[i].nodeName === name)
            return parent.childNodes[i];
    }
    return undefined;
}

function getChildrenByTagName(parent, name) {
    var children = [];
    for (var i = 0; i < parent.childNodes.length; i++) {
        if (parent.childNodes[i].nodeName === name)
            children.push(parent.childNodes[i]);
    }
    return children;
}

function getBooleanValue(node, def) {
    if (node == undefined)
        return def;
    return node.childNodes[0].nodeValue === "true" ? true : false;
}

function getIntValue(node, def) {
    if (node == undefined)
        return def;
    return parseInt(node.childNodes[0].nodeValue);
}

function getFloatValue(node, def) {
    if (node == undefined)
        return def;
    return parseFloat(node.childNodes[0].nodeValue);
}

function getStringValue(node, def) {
    if (node == undefined)
        return def;
    return node.childNodes[0].nodeValue;
}

module.exports.getChildNode = getChildNode;
module.exports.getChildrenByTagName = getChildrenByTagName;
module.exports.getBooleanValue = getBooleanValue;
module.exports.getIntValue = getIntValue;
module.exports.getFloatValue = getFloatValue;
module.exports.getStringValue = getStringValue;