function filter_cellshade(canvas, rgbaColor) {
	var context = canvas.getContext("2d");
    var width = canvas.width;
    var height = canvas.heigth;
	var imageData = context.getImageData(0, 0, width, height);
	var data = imageData.data;
	var target = context.createImageDate(width, height);
    var targetData = target.data;

	for (var i = 0, l = data.length; i < l; i += 4) {
        var previous = i - 4;
        var next = i + 4;
        var top = i - width;
        var down = i + width;
        
	}

	// reapply on canvas
	context.putImageData(0, 0, imageData);
}
