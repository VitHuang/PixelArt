var gl;
var time = 0.0;
var fps = 0;
var lastTime = Date.now();
var basicShader;
var textureShader;
var phongShader;
var pixelShader;
var normalShader;
var depthShader;
var outlineShader;
var ciede2000Shader;
var originalPhongShader;
var conversionFramebuffer;
var phongTexture;
var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var normalMatrix = mat3.create();
var mesh = new Object;
var screenFramebuffer;
var normalTexture;
var depthTexture;
var edgeTexture;
var screenTexture;
var ciede2000Texture;
var rectBuffer;
var loadedShaders = false;
var loadedPalette = false;
var stereoscopic = false;
var drawOutlines = true;
var generatePalette = false;
var transVal = 2.0;
var paletteSize = 15;
var shadingLevels = 1;
var paletteBufferSize = 64;
var shades = [0.25, 0.4, 0.8, 1.0];

var modelArgs = {
	teapot : ["teapot2.ply", "texture3.png", "palette3.png", 25, 300.0, 500.0, -40.0, -400.0],
	scolipede1 : ["scolipede3.ply", "scolipede2.png", "scolipedepalette.png", 25, 30.0, 55.0, -6.0, -42.0],
	scolipede2 : ["scolipede3.ply", "sscolipede2.png", "sscolipedepalette.png", 10, 99.0, 119.0, -6.0, -109.0],
	dragon : ["dragon3.ply", "texture4.png", "palette2.png", 30, 1.0, 10.0, 0.0, -2.0],
	eevee : ["eevee2.ply", "eevee.png", "eeveepalette.png", 30, 15.0, 25.0, -3.0, -20.0],
	pikachu : ["pikachu2.ply", "pikachu.png", "pikachupalette.png", 30, 19.0, 29.0, -3.0, -24.0]
};

var currentModel = "scolipede2";

rgbConversionMatrix = [0.4124, 0.3576, 0.1805, 0.2126, 0.7152, 0.0722, 0.0193, 0.1192, 0.9505];

var PI = 3.141592653589793238462643383279

function screenBufferWidth() {
	return 128;
}

function screenBufferHeight() {
	return 128;
}

function areShadersLoaded() {
	return basicShader.loaded && textureShader.loaded && phongShader.loaded && pixelShader.loaded && depthShader.loaded && normalShader.loaded && outlineShader.loaded && ciede2000Shader.loaded && originalPhongShader.loaded;
}

function initGL(canvas) {
	try {
		gl = canvas.getContext("webgl", {preserveDrawingBuffer: true} );
		if (stereoscopic) {
			gl.viewportWidth = canvas.width / 2;
		} else {
			gl.viewportWidth = canvas.width;
		}
		gl.viewportHeight = canvas.height;
	} catch (e) {
	}
	if (!gl) {
		alert("Failed to initialise WebGL");
	}
}

function createShaderFromFiles(vertexFile, fragmentFile) {
	var program = gl.createProgram();
	program.loaded = false;
	program.loadedVertex = false;
	program.loadedFragment = false;
	program.onLoad = function() {
		gl.attachShader(program, program.vertexShader);
		gl.attachShader(program, program.fragmentShader);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			alert("Could not initialise shaders");
		} else {
			program.onLink();
		}
	}
	program.onLoadVertex = function() { program.loadedVertex = true; if (program.loadedFragment) { program.onLoad(); }; };
	program.onLoadFragment = function() { program.loadedFragment = true; if (program.loadedVertex) { program.onLoad(); }; };
	program.vertexShader = gl.createShader(gl.VERTEX_SHADER);
	program.vertexShader.onLoad = program.onLoadVertex;
	loadShaderFromFile(gl, vertexFile, program.vertexShader);
	program.fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	program.fragmentShader.onLoad = program.onLoadFragment;
	loadShaderFromFile(gl, fragmentFile, program.fragmentShader);
	return program;
}

function loadShaderFromFile(gl, filename, shader) {
	var request = new XMLHttpRequest();
	request.overrideMimeType('text/plain');
	request.open("GET", filename);
	request.onreadystatechange = function() {
		if (request.readyState == 4) {
			gl.shaderSource(shader, request.responseText);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				alert(gl.getShaderInfoLog(shader));
				return null;
			}
			shader.onLoad();
		}
	}
	request.send();
}

function getShaderFromDocument(gl, name) {
	var script = document.getElementById(name);
	if (!script) {
		alert("couldn't find script " + name);
		return null;
	}
	var str = "";
	var s = script.firstChild;
	while (s) {
		if (s.nodeType == 3) {
			str += s.textContent;
		}
		s = s.nextSibling;
	}
	var shader;
	if (script.type == "x-shader/x-fragment") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (script.type == "x-shader/x-vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		alert("unrecognised shader type " + script.type);
		return null;
	}
	gl.shaderSource(shader, str);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	}
	return shader;
}

function createShader(vertex, fragment) {
	var program = gl.createProgram();
	gl.attachShader(program, vertex);
	gl.attachShader(program, fragment);
	gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		alert("Could not initialise shaders");
	}
	return program
}

function initRectBuffer() {
	var rectCoords = [0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0];
	rectBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, rectBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rectCoords), gl.STATIC_DRAW);
}

function initPhongShader() {
	phongShader = createShaderFromFiles("phong.vs", "phong.fs");
	phongShader.onLink = function() {
		gl.useProgram(phongShader);
		phongShader.vertexPosition = gl.getAttribLocation(phongShader, "vertexPosition");
		phongShader.vertexNormal = gl.getAttribLocation(phongShader, "vertexNormal");
		phongShader.texCoord = gl.getAttribLocation(phongShader, "texCoord");
		phongShader.featureSize = gl.getAttribLocation(phongShader, "featureSize");
		phongShader.texture = gl.getUniformLocation(phongShader, "texture");
		phongShader.pMatrix = gl.getUniformLocation(phongShader, "pMatrix");
		phongShader.mvMatrix = gl.getUniformLocation(phongShader, "mvMatrix");
		phongShader.nMatrix = gl.getUniformLocation(phongShader, "nMatrix");
		phongShader.viewportSize = gl.getUniformLocation(phongShader, "viewportSize");
		phongShader.loaded = true;
	}
}

function initOriginalPhongShader() {
	originalPhongShader = createShaderFromFiles("phongoriginal.vs", "phongoriginal.fs");
	originalPhongShader.onLink = function() {
		gl.useProgram(originalPhongShader);
		originalPhongShader.vertexPosition = gl.getAttribLocation(originalPhongShader, "vertexPosition");
		originalPhongShader.vertexNormal = gl.getAttribLocation(originalPhongShader, "vertexNormal");
		originalPhongShader.texCoord = gl.getAttribLocation(originalPhongShader, "texCoord");
		originalPhongShader.texture = gl.getUniformLocation(originalPhongShader, "texture");
		originalPhongShader.pMatrix = gl.getUniformLocation(originalPhongShader, "pMatrix");
		originalPhongShader.mvMatrix = gl.getUniformLocation(originalPhongShader, "mvMatrix");
		originalPhongShader.nMatrix = gl.getUniformLocation(originalPhongShader, "nMatrix");
		originalPhongShader.viewportSize = gl.getUniformLocation(originalPhongShader, "viewportSize");
		originalPhongShader.loaded = true;
	}
}

function initPixelShader() {
	pixelShader = createShaderFromFiles("pixel.vs", "pixel.fs");
	pixelShader.onLink = function() {
		gl.useProgram(pixelShader);
		pixelShader.vertexPosition = gl.getAttribLocation(pixelShader, "vertexPosition");
		pixelShader.texCoord = gl.getAttribLocation(pixelShader, "texCoord");
		pixelShader.pMatrix = gl.getUniformLocation(pixelShader, "pMatrix");
		pixelShader.mvMatrix = gl.getUniformLocation(pixelShader, "mvMatrix");
		pixelShader.phongTexture = gl.getUniformLocation(pixelShader, "phongTexture");
		pixelShader.edgeTexture = gl.getUniformLocation(pixelShader, "edgeTexture");
		pixelShader.depthTexture = gl.getUniformLocation(pixelShader, "depthTexture");
		pixelShader.conversionTexture = gl.getUniformLocation(pixelShader, "conversionTexture");
		pixelShader.textureSize = gl.getUniformLocation(pixelShader, "textureSize");
		pixelShader.palette = gl.getUniformLocation(pixelShader, "palette");
		pixelShader.rgbConversion = gl.getUniformLocation(pixelShader, "rgbConversion");
		pixelShader.rgbConversionMatrix = mat3.create(rgbConversionMatrix);
		gl.uniformMatrix3fv(pixelShader.rgbConversion, false, pixelShader.rgbConversionMatrix);
		pixelShader.loaded = true;
	}
}

function initBasicShader() {
	basicShader = createShaderFromFiles("basic.vs", "basic.fs");
	basicShader.onLink = function() {
		gl.useProgram(basicShader);
		basicShader.vertexPosition = gl.getAttribLocation(basicShader, "vertexPosition");
		basicShader.pMatrix = gl.getUniformLocation(basicShader, "pMatrix");
		basicShader.mvMatrix = gl.getUniformLocation(basicShader, "mvMatrix");
		basicShader.loaded = true;
	}
}

function initTextureShader() {
	textureShader = createShaderFromFiles("texture.vs", "texture.fs");
	textureShader.onLink = function() {
		gl.useProgram(textureShader);
		textureShader.vertexPosition = gl.getAttribLocation(textureShader, "vertexPosition");
		textureShader.texCoord = gl.getAttribLocation(textureShader, "texCoord");
		textureShader.pMatrix = gl.getUniformLocation(textureShader, "pMatrix");
		textureShader.mvMatrix = gl.getUniformLocation(textureShader, "mvMatrix");
		textureShader.texture = gl.getUniformLocation(textureShader, "texture");
		textureShader.loaded = true;
	}
}

function initNormalShader() {
	normalShader = createShaderFromFiles("directednormal.vs", "directednormal.fs");
	normalShader.onLink = function() {
		gl.useProgram(normalShader);
		normalShader.vertexPosition = gl.getAttribLocation(normalShader, "vertexPosition");
		normalShader.vertexNormal = gl.getAttribLocation(normalShader, "vertexNormal");
		normalShader.pMatrix = gl.getUniformLocation(normalShader, "pMatrix");
		normalShader.mvMatrix = gl.getUniformLocation(normalShader, "mvMatrix");
		normalShader.nMatrix = gl.getUniformLocation(normalShader, "nMatrix");
		normalShader.loaded = true;
	}
}

function initDepthShader() {
	depthShader = createShaderFromFiles("depth.vs", "depth.fs");
	depthShader.onLink = function() {
		gl.useProgram(depthShader);
		depthShader.vertexPosition = gl.getAttribLocation(depthShader, "vertexPosition");
		depthShader.vertexNormal = gl.getAttribLocation(depthShader, "vertexNormal");
		depthShader.pMatrix = gl.getUniformLocation(depthShader, "pMatrix");
		depthShader.mvMatrix = gl.getUniformLocation(depthShader, "mvMatrix");
		depthShader.zNear = gl.getUniformLocation(depthShader, "zNear");
		depthShader.zFar = gl.getUniformLocation(depthShader, "zFar");
		depthShader.nMatrix = gl.getUniformLocation(depthShader, "nMatrix");
		depthShader.loaded = true;
	}
}

function initOutlineShader() {
	outlineShader = createShaderFromFiles("outline.vs", "outline.fs");
	outlineShader.onLink = function() {
		gl.useProgram(outlineShader);
		outlineShader.vertexPosition = gl.getAttribLocation(outlineShader, "vertexPosition");
		outlineShader.texCoord = gl.getAttribLocation(outlineShader, "texCoord");
		outlineShader.pMatrix = gl.getUniformLocation(outlineShader, "pMatrix");
		outlineShader.mvMatrix = gl.getUniformLocation(outlineShader, "mvMatrix");
		outlineShader.depthTexture = gl.getUniformLocation(outlineShader, "depthTexture");
		outlineShader.normalTexture = gl.getUniformLocation(outlineShader, "normalTexture");
		outlineShader.textureSize = gl.getUniformLocation(outlineShader, "textureSize");
		outlineShader.loaded = true;
	}
}

function initCiede2000Shader() {
	ciede2000Shader = createShaderFromFiles("ciede2000.vs", "ciede2000.fs");
	ciede2000Shader.onLink = function() {
		gl.useProgram(ciede2000Shader);
		ciede2000Shader.vertexPosition = gl.getAttribLocation(ciede2000Shader, "vertexPosition");
		ciede2000Shader.texCoord = gl.getAttribLocation(ciede2000Shader, "texCoord");
		ciede2000Shader.pMatrix = gl.getUniformLocation(ciede2000Shader, "pMatrix");
		ciede2000Shader.mvMatrix = gl.getUniformLocation(ciede2000Shader, "mvMatrix");
		ciede2000Shader.palette = gl.getUniformLocation(ciede2000Shader, "palette");
		ciede2000Shader.rgbConversion = gl.getUniformLocation(ciede2000Shader, "rgbConversion");
		ciede2000Shader.paletteSize = gl.getUniformLocation(ciede2000Shader, "paletteSize");
		ciede2000Shader.rgbConversionMatrix = mat3.create(rgbConversionMatrix);
		gl.uniformMatrix3fv(ciede2000Shader.rgbConversion, false, ciede2000Shader.rgbConversionMatrix);
		gl.uniform1i(ciede2000Shader.paletteSize, paletteSize);
		ciede2000Shader.loaded = true;
	}
}

function initScreenFramebuffer() {
	screenFramebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, screenFramebuffer);
	var renderbuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, screenBufferWidth(), screenBufferHeight());
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);
}

function setupScreenTexture(scale) {
	if (typeof scale == "undefined") {
		scale = 1;
	}
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, screenBufferWidth() * scale, screenBufferHeight() * scale, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.bindTexture(gl.TEXTURE_2D, null);
	return texture;
}

function findCorners(block) {
	block.minCorner = [255, 255, 255];
	block.maxCorner = [0, 0, 0];
	for (var i = 0; i < block.length; i++) {
		var colour = block[i];
		block.minCorner[0] = Math.min(block.minCorner[0], colour[0]);
		block.minCorner[1] = Math.min(block.minCorner[1], colour[1]);
		block.minCorner[2] = Math.min(block.minCorner[2], colour[2]);
		block.maxCorner[0] = Math.max(block.maxCorner[0], colour[0]);
		block.maxCorner[1] = Math.max(block.maxCorner[1], colour[1]);
		block.maxCorner[2] = Math.max(block.maxCorner[2], colour[2]);
	}
	block.longestSide = 0;
	block.longestSideLength = block.maxCorner[0] - block.minCorner[0];
	if (block.maxCorner[1] - block.minCorner[1] > block.longestSideLength) {
		block.longestSide = 1;
		block.longestSideLength = block.maxCorner[1] - block.minCorner[1];
	}
	if (block.maxCorner[2] - block.minCorner[2] > block.longestSideLength) {
		block.longestSide = 2;
		block.longestSideLength = block.maxCorner[2] - block.minCorner[2];
	}
}

function rgbSquaredDistance(colourA, colourB) {
	var dr = colourA[0] - colourB[0];
	var dg = colourA[1] - colourB[1];
	var db = colourA[2] - colourB[2];
	return dr * dr + dg * dg + db * db;
}

function linearise( c) {
	if (c <= 0.04045) {
		return (c / 12.92);
	} else {
		return Math.pow((c + 0.055) / 1.055, 2.4);
	}
}

function labf(c) {
	if (c > 0.008856) {
		return Math.pow(c, 1.0/3.0);
	} else {
		return 7.787 * c + 0.1379;
	}
}

function dsin(degrees) {
	return Math.sin(degrees / 180.0 * PI);
}

function dcos(degrees) {
	return Math.cos(degrees / 180.0 * PI);
}

function datan(y, x) {
	return Math.atan(y, x) / PI * 180.0;
}

function ciede2000(lab1, lab2) {
	var cavg = (Math.sqrt(lab1[1] * lab1[1] + lab1[2] * lab1[2]) + Math.sqrt(lab2[1] * lab2[1] + lab2[2] * lab2[2])) / 2.0;
	var cavg7 = cavg * cavg * cavg * cavg * cavg * cavg * cavg;
	var g = 0.5 * (1.0 - Math.sqrt(cavg7 / (cavg7 + 6103515625.0)));
	var ap1 = (1.0 + g) * lab1[1];
	var ap2 = (1.0 + g) * lab2[1];
	var cp1 = Math.sqrt(ap1 * ap1 + lab1[2] * lab1[2]);
	var cp2 = Math.sqrt(ap2 * ap2 + lab2[2] * lab2[2]);
	var h1 = 0.0;
	if (lab1[2] != 0.0 || ap1 != 0.0) {
		h1 = datan(lab1[2], ap1);
		if (h1 < 0.0) {
			h1 += 360.0;
		}
	}
	var h2 = 0.0;
	if (lab2[2] != 0.0 || ap2 != 0.0) {
		h2 = datan(lab2[2], ap2);
		if (h2 < 0.0) {
			h2 += 360.0;
		}
	}
	var dl = lab2[0] - lab1[0];
	var dc = cp2 - cp1;
	var dh = 0.0;
	if (cp1 != 0.0 && cp2 != 0.0) {
		dh = h2 - h1;
		if (dh < -180.0) {
			dh += 360.0;
		} else if (dh > 180.0) {
			dh -= 360.0;
		}
	}
	var dch = 2.0 * Math.sqrt(cp1 * cp2) * dsin(dh / 2.0);
	var lavg = (lab1[0] + lab2[0]) / 2.0;
	var cpavg = (cp1 + cp2) / 2.0;
	var havg = h1 + h2;
	if (cp1 != 0.0 && cp2 != 0.0) {
		if (Math.abs(h1 - h2) < 180.0) {
			havg = (h1 + h2) / 2.0;
		} else {
			if (h1 + h2 < 360.0) {
				havg = (h1 + h2 + 360.0) / 2.0;
			} else {
				havg = (h1 + h2 - 360.0) / 2.0;
			}
		}
	}
	var t = 1.0 - 0.17 * dcos(havg - 30.0) + 0.24 * dcos(2.0 * havg) + 0.32 * dcos(3.0 * havg + 6.0) - 0.2 * dcos(4.0 * havg - 63.0);
	var sqterm = ((havg - 275.0) / 25.0);
	var dtheta = 30.0 * Math.exp(-(sqterm * sqterm));
	var cpavg7 = cpavg * cpavg * cpavg * cpavg * cpavg * cpavg * cpavg;
	var rc = 2.0 * Math.sqrt(cpavg7 / (cpavg7 + 6103515625.0));
	var lavgp = (lavg - 50.0) * (lavg - 50.0);
	var sl = 1.0 + (0.015 * lavgp) / Math.sqrt(20.0 + lavgp);
	var sc = 1.0 + 0.045 * cpavg;
	var sh = 1.0 + 0.015 * cpavg * t;
	var rt = -dsin(2.0 * dtheta) * rc;
	var de = Math.sqrt((dl / sl) * (dl / sl) + (dc / sc) * (dc / sc) + (dch / sh) * (dch / sh) + rt * (dc / sc) * (dch / sh));
	return de;
}

function srgbToCiexyz(srgb) {
	var lr = linearise(srgb[0]);
	var lg = linearise(srgb[1]);
	var lb = linearise(srgb[2]);
	return [rgbConversionMatrix[0] * lr + rgbConversionMatrix[1] * lg + rgbConversionMatrix[2] * lb,
			rgbConversionMatrix[3] * lr + rgbConversionMatrix[4] * lg + rgbConversionMatrix[5] * lb,
			rgbConversionMatrix[6] * lr + rgbConversionMatrix[7] * lg + rgbConversionMatrix[8] * lb];
}

function srgbToCielab(srgb) {
	var ciexyz = srgbToCiexyz(srgb);
	var fX = labf(ciexyz[0] / 0.95047);
	var fY = labf(ciexyz[1]);
	var fZ = labf(ciexyz[2] / 1.08883);
	var l = 116.0 * fY - 16.0;
	if (l < 0.0) {
		l = 0.0;
	}
	var cielab = [l, 500.0 * (fX - fY), 200.0 * (fY - fZ)];
	return cielab;
}

function ciede2000Distance(colourA, colourB) {
	return ciede2000(srgbToCielab([colourA[0] / 255.0, colourA[1] / 255.0, colourA[2] / 255.0]), srgbToCielab([colourB[0] / 255.0, colourB[1] / 255.0, colourB[2] / 255.0]));
}

function estimateTotalSquaredDistance(colours, palette) {
	console.log("colours: " + colours);
	var totalDist = 0;
	var cache = {};
	for (var i = 0; i < colours.length; i++) {
		var colour = colours[i];
		var name = colour[0].toString() + "," + colour[1].toString() + "," + colour[2].toString();
		var minDist = cache[name];
		if (!minDist) {
			minDist = ciede2000Distance(colours[i], [palette[0], palette[1], palette[2], palette[3]]);
			for (var j = 1; j < palette.length / 4; j++) {
				var dist = ciede2000Distance(colour, [palette[j * 4], palette[j * 4 + 1], palette[j * 4 + 2], palette[j * 4 + 3]]);
				dist = dist * dist;
				if (dist < minDist) {
					minDist = dist;
				}
			}
			cache[name] = minDist;
		}
		totalDist += minDist;
	}
	return totalDist;
}

function getShade(colour, shade) {
	if (shade < 1.0) {
		return [colour[0] * shade, colour[1] * shade, colour[2] * shade];
	} else {
		colour = [colour[0] + shade - 1.0, colour[1] + shade - 1.0, colour[2] + shade - 1.0];
		if (colour[0] > 255) {
			colour[0] = 255;
		}
		if (colour[1] > 255) {
			colour[1] = 255;
		}
		if (colour[2] > 255) {
			colour[2] = 255;
		}
		return colour;
	}
}

function uniqueColours(colours) {
	var unique = [];
	var seen = {};
	var numColours = colours.length;
	// only add unique colours to result array
	for (var i = 0; i < numColours; i++) {
		var colour = colours[i];
		var name = colour[0].toString() + "," + colour[1].toString() + "," + colour[2].toString();
		if (!seen[name]) {
			unique.push(colour);
			seen[name] = 1;
		}
	}
	return unique;
}


function processPalette(data) {
	var colours = [];
	for (var i = 0; i < data.length / 4; i++) {
		colours.push([data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]);
	}
	var numColours = colours.length;
	for (var i = 0; i < numColours; i++) {
		for (var j = 0; j < shades.length; j++) {
			colours.push(getShade(colours[i], shades[j]));
		}
	}
	return colours;
}

function blockAverages(blocks) {
	var palette = [];
	for (var i = 0; i < blocks.length; i++) {
		var bl = blocks[i];
		console.log(bl);
		if (bl) {
			var mean = [0, 0, 0, 255];
			for (var j = 0; j < bl.length; j++) {
				var colour = bl[j];
				mean[0] += colour[0];
				mean[1] += colour[1];
				mean[2] += colour[2];
			}
			mean[0] /= bl.length;
			mean[1] /= bl.length;
			mean[2] /= bl.length;
			palette = palette.concat(mean);
		} else {
			palette = palette.concat([0, 0, 0, 255]);
		}
	}
	return palette;
}

function medianCut(data) {
	var block = data;
	findCorners(block);
	var blocks = [block];
	while (blocks.length < paletteSize) {
		blocks.sort(function(a, b) { return a.longestSideLength - b.longestSideLength; });
		var bl = blocks.pop();
		bl.sort(function(a, b) { return a[bl.longestSide] - b[bl.longestSide]; });
		var index = bl.length / 2;
		var front = bl.slice(0, index);
		findCorners(front);
		blocks.push(front);
		var back = bl.slice(index, bl.length);
		findCorners(back);
		blocks.push(back);
	}
	return blockAverages(blocks);
}

function kMeansPalette(data, colours) {
	var blocks = clusterfck.kmeans(data, paletteSize);
	return blockAverages(blocks);
}

function kMedoidsPalette(data) {
	var blocks = kMedoids(data, paletteSize);
	return blockAverages(blocks);
}

function createPalette(texture) {

	
	
	var paletteTexture = gl.createTexture();
	var paletteFramebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, conversionFramebuffer);
	gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, paletteBufferSize, paletteBufferSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, paletteFramebuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, paletteTexture, 0);
	gl.viewport(0, 0, paletteBufferSize, paletteBufferSize);
	
	gl.bindTexture(gl.TEXTURE_2D, texture);
	drawRectangle(textureShader);
	
	
	var data = new Uint8Array(paletteBufferSize * paletteBufferSize * 4);
	gl.readPixels(0, 0, paletteBufferSize, paletteBufferSize, gl.RGBA, gl.UNSIGNED_BYTE, data);
	
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.deleteFramebuffer(paletteFramebuffer);
	gl.deleteTexture(paletteTexture);
	var colours = processPalette(data);
	var unique = uniqueColours(colours);
	var bestPalette = kMeansPalette(colours);
	var bestDist = estimateTotalSquaredDistance(unique, bestPalette);
	for (var i = 0; i < 20; i++) {
		var palette = kMeansPalette(colours);
		var dist = estimateTotalSquaredDistance(unique, palette);
		if (dist < bestDist) {
			bestDist = dist;
			bestPalette = palette;
		}
	}
	bestPalette = bestPalette.concat([255, 255, 255, 0]);
	console.log("goodness: " + bestDist);
	return bestPalette;
}

function createConversionTextures(palette) {
	ciede2000Texture = gl.createTexture();
	conversionFramebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, conversionFramebuffer);
	gl.bindTexture(gl.TEXTURE_2D, ciede2000Texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 4096, 4096, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	conversionFramebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, conversionFramebuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, ciede2000Texture, 0);
	gl.viewport(0, 0, 4096, 4096);
	gl.bindTexture(gl.TEXTURE_2D, palette);
	gl.activeTexture(gl.TEXTURE0);
	gl.useProgram(ciede2000Shader);
	gl.uniform1i(ciede2000Shader.palette, 0);
	drawRectangle(ciede2000Shader);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.deleteFramebuffer(conversionFramebuffer);
}


function handleLoadModel(data, model) {
	var lines = data.split("\n");
	var currentVertex = 0;
	var vertexCount = 0;
	var currentFace = 0;
	var faceCount = 0;
	var vertices = [];
	var normals = [];
	var texCoords = [];
	var featureSize = [];
	var faces = [];
	var inHeader = true;
	var match;
	var largestIndex = 0;
	for (var i in lines) {
		if (lines[i].match(/end_header/)) {
			inHeader = false;
		}
		if (inHeader) {
			match = lines[i].match(/element vertex (\d+)/);
			if (match) {
				vertexCount = parseInt(match[1]);
			}
			match = lines[i].match(/element face (\d+)/);
			if (match) {
				faceCount = parseInt(match[1]);
			}
		}
		if (!inHeader) {
			var split = lines[i].replace(/^\s+/, "").split(/\s+/);
			if (split.length >= 10 && currentVertex < vertexCount) {
				vertices.push(parseFloat(split[0]));
				vertices.push(parseFloat(split[1]));
				vertices.push(parseFloat(split[2]));
				normals.push(parseFloat(split[3]));
				normals.push(parseFloat(split[4]));
				normals.push(parseFloat(split[5]));
				texCoords.push(parseFloat(split[6]));
				texCoords.push(parseFloat(split[7]));
				featureSize.push(parseFloat(split[8]));
				featureSize.push(parseFloat(split[9]));
				currentVertex += 1;
			} else {
				if (split.length >= 4 && currentVertex >= vertexCount && currentFace < faceCount) {
					// assume split[0] = 3, i.e. triangles
					faces.push(parseInt(split[1]));
					faces.push(parseInt(split[2]));
					faces.push(parseInt(split[3]));
					currentFace += 1
				}
			}
		}
	}
	model.vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
	var vertexArray = new Float32Array(vertices);
	console.log(vertexArray.length);
	gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);
	model.vertexBuffer.itemSize = 3;
	model.vertexBuffer.numItems = vertexCount;
	model.normalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
	model.normalBuffer.itemSize = 3;
	model.normalBuffer.numItems = vertexCount;
	model.texCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, model.texCoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
	model.texCoordBuffer.itemSize = 2;
	model.texCoordBuffer.numItems = vertexCount;
	model.featureSizeBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, model.featureSizeBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(featureSize), gl.STATIC_DRAW);
	model.featureSizeBuffer.itemSize = 2;
	model.featureSizeBuffer.numItems = vertexCount;
	model.indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(faces), gl.STATIC_DRAW);
	model.indexBuffer.itemSize = 1;
	model.indexBuffer.numItems = faceCount * 3;
}

function generatePaletteTexture() {
	var palette = createPalette(mesh.texture);
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, palette.length / 4, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(palette));
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.bindTexture(gl.TEXTURE_2D, null);
	return texture;
}

function handleLoadedTexture(model) {
console.log("handling loaded texture");
	gl.bindTexture(gl.TEXTURE_2D, model.texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, model.texture.image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.generateMipmap(gl.TEXTURE_2D);
	if (generatePalette) {
		model.palette = generatePaletteTexture();
	}
	loadedPalette = true;
}

function loadModel(filename, model) {
	var request = new XMLHttpRequest();
	request.overrideMimeType('text/plain');
	request.open("GET", filename);
	request.onreadystatechange = function() {
		if (request.readyState == 4) {
			handleLoadModel(request.responseText, model);
		}
	}
	request.send();
}

function loadTexture(filename, model, palette) {
	model.texture = gl.createTexture();
	model.texture.image = new Image();
	model.texture.image.onload = function() {
		handleLoadedTexture(model);
	}
	model.texture.image.src = filename;
	
	if (!generatePalette) {
		model.palette = gl.createTexture();
		model.paletteImage = new Image();
		model.paletteImage.onload = function() {
			gl.bindTexture(gl.TEXTURE_2D, model.palette);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, model.paletteImage);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.bindTexture(gl.TEXTURE_2D, null);
			loadedPalette = true;
		}
		model.paletteImage.src = modelArgs[currentModel][2];
	}
}

function renderOutline(model) {
	// render to a framebuffer rather than to the screen
	gl.bindFramebuffer(gl.FRAMEBUFFER, screenFramebuffer);
	
	// render normals to a texture
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, normalTexture, 0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	drawModel(normalShader, model);
	
	// render depth to a texture
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, depthTexture, 0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.useProgram(depthShader);
	drawModel(depthShader, model);
	
	// set up outline shader uniforms
	gl.useProgram(outlineShader);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, depthTexture);
	gl.uniform1i(outlineShader.depthTexture, 0);
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, normalTexture);
	gl.uniform1i(outlineShader.normalTexture, 1);
	gl.uniform2i(outlineShader.textureSize, screenBufferWidth(), screenBufferHeight());
	
	//render outlines to a texture
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, edgeTexture, 0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	drawRectangle(outlineShader);
	
	// unbind framebuffer and render to the screen again
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, screenTexture, 0);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function drawRectangle(shader) {
	var projection = mat4.create();
	mat4.ortho(0.0, 1.0, 0.0, 1.0, -10.0, 10.0, projection);
	var modelView = mat4.create();
	mat4.identity(modelView);
	gl.useProgram(shader);
	gl.uniformMatrix4fv(shader.pMatrix, false, projection);
	gl.uniformMatrix4fv(shader.mvMatrix, false, modelView);
	gl.bindBuffer(gl.ARRAY_BUFFER, rectBuffer);
	gl.enableVertexAttribArray(shader.vertexPosition);
	gl.vertexAttribPointer(shader.vertexPosition, 2, gl.FLOAT, false, 0, 0);
	if (typeof shader.texCoord != "undefined" && shader.texCoord >= 0) {
		gl.enableVertexAttribArray(shader.texCoord);
		gl.vertexAttribPointer(shader.texCoord, 2, gl.FLOAT, false, 0, 0);
	}
	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}

function drawOriginal() {
	if (!loadedShaders) {
		if (areShadersLoaded()) {
			loadedShaders = true;
		} else {
			return;
		}
	}
	if (mesh.vertexBuffer == null) {
		return;
	}
	gl.viewport(0, 0, screenBufferWidth(), screenBufferHeight());
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	drawModel(originalPhongShader, mesh);
}

function drawModel(shader, model) {

	mat4.perspective(modelArgs[currentModel][3], screenBufferWidth() / screenBufferHeight(),
		modelArgs[currentModel][4], modelArgs[currentModel][5], pMatrix);
	mat4.identity(mvMatrix);

	mat4.translate(mvMatrix, [0.0, modelArgs[currentModel][6], modelArgs[currentModel][7]]);
	
	if (stereoscopic) {
		mat4.translate(mvMatrix, [transVal, 0.0, 0.0]);
	}
	mat4.rotate(mvMatrix, 0.1, [1.0, 0.0, 0.0]);
	mat4.rotate(mvMatrix, time, [0.0, 1.0, 0.0]);

	mat4.toInverseMat3(mvMatrix, normalMatrix);
	mat3.transpose(normalMatrix);
	
	gl.useProgram(shader);
	gl.uniformMatrix4fv(shader.pMatrix, false, pMatrix);
	gl.uniformMatrix4fv(shader.mvMatrix, false, mvMatrix);
	
	if (typeof shader.vertexNormal != "undefined") {
		gl.uniformMatrix3fv(shader.nMatrix, false, normalMatrix);
		gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
		gl.vertexAttribPointer(shader.vertexNormal, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(shader.vertexNormal);
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
	gl.vertexAttribPointer(shader.vertexPosition, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(shader.vertexPosition);
	if (typeof shader.texCoord != "undefined") {
		gl.bindBuffer(gl.ARRAY_BUFFER, model.texCoordBuffer);
		gl.enableVertexAttribArray(shader.texCoord);
		gl.vertexAttribPointer(shader.texCoord, 2, gl.FLOAT, false, 0, 0);
		
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, model.texture);
		gl.uniform1i(shader.texture, 0);
	}
	if (typeof shader.featureSize != "undefined") {
		gl.uniform2i(shader.viewportSize, screenBufferWidth(), screenBufferHeight());
		gl.bindBuffer(gl.ARRAY_BUFFER, model.featureSizeBuffer);
		gl.enableVertexAttribArray(shader.featureSize);
		gl.vertexAttribPointer(shader.featureSize, 2, gl.FLOAT, false, 0, 0);
	}
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
	gl.drawElements(gl.TRIANGLES, model.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	gl.disableVertexAttribArray(shader.vertexPosition);
	gl.disableVertexAttribArray(shader.vertexNormal);
	if (typeof shader.featureSize != "undefined") {
		gl.disableVertexAttribArray(shader.featureSize);
	}
	gl.activeTexture(gl.TEXTURE0);
}

function draw() {
	if (!loadedShaders) {
		if (areShadersLoaded()) {
			loadedShaders = true;
		} else {
			return;
		}
	}
	if (mesh.vertexBuffer == null) {
		return;
	}
	gl.viewport(0, 0, screenBufferWidth(), screenBufferHeight());
	if (drawOutlines) {
		renderOutline(mesh);
	}
	gl.bindFramebuffer(gl.FRAMEBUFFER, screenFramebuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, phongTexture, 0);
	
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	drawModel(phongShader, mesh);
	
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, screenTexture, 0);
	
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.useProgram(pixelShader);
	gl.uniform2i(pixelShader.textureSize, screenBufferWidth(), screenBufferHeight());
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, phongTexture);
	gl.uniform1i(pixelShader.phongTexture, 0);
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, edgeTexture);
	gl.uniform1i(pixelShader.edgeTexture, 1);
	gl.activeTexture(gl.TEXTURE2);
	gl.bindTexture(gl.TEXTURE_2D, depthTexture);
	gl.uniform1i(pixelShader.depthTexture, 2);
	gl.activeTexture(gl.TEXTURE3);
	gl.bindTexture(gl.TEXTURE_2D, ciede2000Texture);
	gl.uniform1i(pixelShader.conversionTexture, 3);
	gl.activeTexture(gl.TEXTURE4);
	gl.bindTexture(gl.TEXTURE_2D, mesh.palette);
	gl.uniform1i(pixelShader.palette, 4);
	
	drawRectangle(pixelShader);
	gl.activeTexture(gl.TEXTURE0);
	
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport((stereoscopic && transVal < 0) ? gl.viewportWidth : 0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.bindTexture(gl.TEXTURE_2D, screenTexture);
	drawRectangle(textureShader);
}

function testOutline() {
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.BACK);
	drawModel(shader, mesh);
	gl.disable(gl.CULL_FACE);
	gl.disable(gl.DEPTH_TEST);
	drawBuffers(basicShader, mesh);
	gl.enable(gl.DEPTH_TEST);
}

function tick() {
	if (!ciede2000Texture && ciede2000Shader.loaded && loadedPalette) {
		createConversionTextures(mesh.palette);
	}
	requestAnimFrame(tick);
	if (true) {
		draw();
	} else {
		drawOriginal();
	}
	if (stereoscopic) {
		transVal = -transVal;
		draw();
	}
	time += 0.01;
	// compute FPS
	fps += 1;
	var newTime = Date.now();
	if ((newTime - lastTime) > 1000) {
		console.log(fps);
		lastTime += 1000;
		fps = 0;
	}
}

function loadShaders() {
	initPhongShader();
	initPixelShader();
	initBasicShader();
	initDepthShader();
	initNormalShader();
	initOutlineShader();
	initTextureShader();
	initCiede2000Shader();
	initOriginalPhongShader();
}

function start() {
	var canvas = document.getElementById("glcanvas");
	initGL(canvas);
	initRectBuffer();
	loadShaders();
	normalTexture = setupScreenTexture();
	normalSobelTexture = setupScreenTexture();
	depthSobelTexture = setupScreenTexture();
	edgeTexture = setupScreenTexture();
	screenTexture = setupScreenTexture();
	depthTexture = setupScreenTexture();
	phongTexture = setupScreenTexture();
	initScreenFramebuffer();
	loadModel(modelArgs[currentModel][0], mesh);
	loadTexture(modelArgs[currentModel][1], mesh);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	tick();
}