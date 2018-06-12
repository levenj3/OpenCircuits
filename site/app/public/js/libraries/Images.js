var Images = [];
Images.load = function(names, index, onFinish) {
    var img = new Image();
    img.onload = function() {
        Images[names[index]] = img;
        img.dx = 0;
        img.dy = 0;
        img.ratio = img.width / img.height;
        if (index === names.length-1)
            onFinish();
        else
            Images.load(names, index+1, onFinish);
    };
    img.src = "img/items/" + names[index];
};

module.exports = Images;