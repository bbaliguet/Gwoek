function filterCellShade(canvas, rgbaColor) {
	var context = canvas.getContext("2d");
	var width = canvas.width;
	var height = canvas.height;
	var imageData = context.getImageData(0, 0, width, height);
	var data = imageData.data;
	var target = context.createImageData(width, height);
	var targetData = target.data;

	for (var i = 0, l = data.length; i < l; i += 4) {
		var previousAlpha = i - 1;
		var nextAlpha = i + 7;
		var topAlpha = i - width * 4 + 3;
		var downAlpha = i + width * 4 + 3;
		var alpha = 0;
		if (!data[i + 3]) {
			if (data[previousAlpha] > 0) {
				alpha = 64;
			}
			if (data[nextAlpha] > 0) {
				alpha += 64;
			}
			if (data[topAlpha] > 0) {
				alpha += 64;
			}
			if (data[downAlpha] > 0) {
				alpha += 64;
			}
		}
		targetData[i] = alpha ? rgbaColor[0] : data[i];
		targetData[i + 1] = alpha ? rgbaColor[1] : data[i + 1];
		targetData[i + 2] = alpha ? rgbaColor[2] : data[i + 2];
		targetData[i + 3] = alpha ? Math.floor(rgbaColor[3] * alpha / 256) : data[i + 3];
	}

	// reapply on canvas
	context.putImageData(target, 0, 0);
}
