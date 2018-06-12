/**
 * Simply copies all elements of an array into
 * another array and returns that array
 * [DOES NOT COPY EACH OBJECT IN THE ARRAY]
 * 
 * @param  {Array} arr
 *         The array to copy
 *
 * @return {Array}
 *         The copied array
 */
function CopyArray(arr) {
    var copy = [];
    for (var i = 0; i < arr.length; i++)
        copy.push(arr[i]);
    return copy;
}

// Code from https://stackoverflow.com/questions/5916900/how-can-you-detect-the-version-of-a-browser
function GetBrowser() {
    if (navigator == undefined)
        return;
    var ua=navigator.userAgent,tem,M=ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if(/trident/i.test(M[1])) {
        tem=/\brv[ :]+(\d+)/g.exec(ua) || [];
        return {name:'IE',version:(tem[1]||'')};
    }
    if(M[1]==='Chrome') {
        tem=ua.match(/\bOPR|Edge\/(\d+)/)
        if(tem!=null)   {return {name:'Opera', version:tem[1]};}
    }
    M=M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
    if((tem=ua.match(/version\/(\d+)/i))!=null) {M.splice(1,1,tem[1]);}
    return {
      name: M[0],
      version: M[1]
    };
}

module.exports.CopyArray = CopyArray;
module.exports.GetBrowser = GetBrowser;