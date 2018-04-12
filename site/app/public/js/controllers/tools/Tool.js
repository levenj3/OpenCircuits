var CurrentTool;
function setCurrentTool(tool) {
    if (CurrentTool)
        CurrentTool.deactivate();
    CurrentTool = tool;
    tool.isActive = true;
}
function getCurrentTool() {
    return CurrentTool;
}

module.exports.setCurrent = setCurrentTool;
module.exports.getCurrent = getCurrentTool;