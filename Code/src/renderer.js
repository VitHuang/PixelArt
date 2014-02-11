var gl;
var time = 0.0;
var basicShader;
var textureShader;
var phongShader;
var pixelShader;
var normalShader;
var depthShader;
var outlineShader;
var ciede2000Shader;
var rgbToLabShader;
var conversionFramebuffer;
var phongTexture;
var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var normalMatrix = mat3.create();
var teapotModel = new Object;
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
var transVal = 12.0;
var paletteSize = 16;
var shadingLevels = 1;
var paletteBufferSize = 64;
var shades = [0.2, 0.5, 0.8, 1.0];

function screenBufferWidth() {
	return 128;
}

function screenBufferHeight() {
	return 128;
}

function areShadersLoaded() {
	return basicShader.loaded && textureShader.loaded && phongShader.loaded && pixelShader.loaded && depthShader.loaded && normalShader.loaded && outlineShader.loaded && ciede2000Shader.loaded;
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
		phongShader.texture = gl.getUniformLocation(phongShader, "texture");
		phongShader.pMatrix = gl.getUniformLocation(phongShader, "pMatrix");
		phongShader.mvMatrix = gl.getUniformLocation(phongShader, "mvMatrix");
		phongShader.nMatrix = gl.getUniformLocation(phongShader, "nMatrix");
		phongShader.loaded = true;
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
		pixelShader.rgbConversionMatrix = mat3.create([0.4124, 0.3576, 0.1805, 0.2126, 0.7152, 0.0722, 0.0193, 0.1192, 0.9505]);
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
		outlineShader.directedNormalTexture = gl.getUniformLocation(outlineShader, "directedNormalTexture");
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
		ciede2000Shader.rgbConversionMatrix = mat3.create([0.4124, 0.3576, 0.1805, 0.2126, 0.7152, 0.0722, 0.0193, 0.1192, 0.9505]);
		gl.uniformMatrix3fv(ciede2000Shader.rgbConversion, false, ciede2000Shader.rgbConversionMatrix);
		ciede2000Shader.loaded = true;
	}
}

function initRgbToLabShader() {
	rgbToLabShader = createShaderFromFiles("rgbtolab.vs", "rgbtolab.fs");
	rgbToLabShader.onLink = function() {
		gl.useProgram(rgbToLabShader);
		rgbToLabShader.vertexPosition = gl.getAttribLocation(rgbToLabShader, "vertexPosition");
		rgbToLabShader.texCoord = gl.getAttribLocation(rgbToLabShader, "texCoord");
		rgbToLabShader.pMatrix = gl.getUniformLocation(rgbToLabShader, "pMatrix");
		rgbToLabShader.mvMatrix = gl.getUniformLocation(rgbToLabShader, "mvMatrix");
		rgbToLabShader.texture = gl.getUniformLocation(rgbToLabShader, "texture");
		rgbToLabShader.rgbConversion = gl.getUniformLocation(rgbToLabShader, "rgbConversion");
		rgbToLabShader.rgbConversionMatrix = mat3.create([0.4124, 0.3576, 0.1805, 0.2126, 0.7152, 0.0722, 0.0193, 0.1192, 0.9505]);
		gl.uniformMatrix3fv(rgbToLabShader.rgbConversion, false, rgbToLabShader.rgbConversionMatrix);
		rgbToLabShader.loaded = true;
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
	var block = [];
	for (var i = 0; i < data.length / 4; i++) {
		var colour = data.subarray(i * 4, i * 4 + 4);
		block.push([colour[0], colour[1], colour[2]]);
	}
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

function kMeansPalette(data) {
	array = [];
	for (var i = 0; i < data.length / 4; i++) {
		for (var j = 0; j < shades.length; j++) {
			array.push([data[i * 4] * shades[j], data[i * 4 + 1] * shades[j], data[i * 4 + 2] * shades[j]]);
		}
	}
	var blocks = clusterfck.kmeans(array, paletteSize);
	return blockAverages(blocks);
}

function kMedoidsPalette(data) {
	array = [];
	for (var i = 0; i < data.length / 4; i++) {
		for (var j = 0; j < shades.length; j++) {
			array.push([data[i * 4] * shades[j], data[i * 4 + 1] * shades[j], data[i * 4 + 2] * shades[j]]);
		}
	}
	var blocks = kMedoids(array, paletteSize);
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
	return kMeansPalette(data);
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
	//gl.disable(gl.DEPTH_TEST);
	//gl.depthMask(gl.FALSE);
	gl.viewport(0, 0, 4096, 4096);
	gl.bindTexture(gl.TEXTURE_2D, palette);
	gl.activeTexture(gl.TEXTURE0);
	gl.useProgram(ciede2000Shader);
	gl.uniform1i(ciede2000Shader.palette, 0);
	drawRectangle(ciede2000Shader);
	//gl.depthMask(gl.TRUE);
	//gl.enable(gl.DEPTH_TEST);
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
	var texCoords = []
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
			if (split.length >= 8 && currentVertex < vertexCount) {
				vertices.push(parseFloat(split[0]));
				vertices.push(parseFloat(split[2]));
				vertices.push(parseFloat(split[1]));
				normals.push(parseFloat(split[3]));
				normals.push(parseFloat(split[5]));
				normals.push(parseFloat(split[4]));
				texCoords.push(parseFloat(split[6]));
				texCoords.push(parseFloat(split[7]));
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
	console.log(faces[0]);
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
	model.vertexBuffer.itemSize = 2;
	model.vertexBuffer.numItems = vertexCount;
	model.indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(faces), gl.STATIC_DRAW);
	model.indexBuffer.itemSize = 1;
	model.indexBuffer.numItems = faceCount * 3;
}

function handleLoadedTexture(model) {
	gl.bindTexture(gl.TEXTURE_2D, model.texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, model.texture.image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.generateMipmap(gl.TEXTURE_2D);
	var palette = createPalette(model.texture);
	model.palette = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, model.palette);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, palette.length / 4, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(palette));
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.bindTexture(gl.TEXTURE_2D, null);
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
	// TODO: auto-generate palette using median cut or octree quantisation; for now, load from file
	/*model.palette = gl.createTexture();
	model.palette.image = new Image();
	model.palette.image.onload = function() {
		gl.bindTexture(gl.TEXTURE_2D, model.palette);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, model.palette.image);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.bindTexture(gl.TEXTURE_2D, null);
		loadedPalette = true;
	}*/
	//model.palette.image.src = "scolipedepalette.png";
}

function renderOutline(model) {
	gl.bindFramebuffer(gl.FRAMEBUFFER, screenFramebuffer);
	
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, normalTexture, 0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	drawModel(normalShader, model);
	
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, depthTexture, 0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.useProgram(depthShader);
	drawModel(depthShader, model);
	
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, edgeTexture, 0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.useProgram(outlineShader);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, depthTexture);
	gl.uniform1i(outlineShader.depthTexture, 0);
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, normalTexture);
	gl.uniform1i(outlineShader.directedNormalTexture, 1);
	gl.activeTexture(gl.TEXTURE0);
	gl.uniform2i(outlineShader.textureSize, screenBufferWidth(), screenBufferHeight());
	drawRectangle(outlineShader);
	
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

function drawModel(shader, model) {
	mat4.perspective(30, screenBufferWidth() / screenBufferHeight(), 25.0, 50.0, pMatrix);
	mat4.identity(mvMatrix);

	mat4.translate(mvMatrix, [0.0, -5.0, -39.0]);
	if (stereoscopic) {
		mat4.translate(mvMatrix, [transVal, 0.0, 0.0]);
	}
	mat4.rotate(mvMatrix, 0.0, [1.0, 0.0, 0.0]);
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
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
	gl.drawElements(gl.TRIANGLES, model.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	gl.disableVertexAttribArray(shader.vertexPosition);
	gl.disableVertexAttribArray(shader.vertexNormal);
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
	if (teapotModel.vertexBuffer == null) {
		return;
	}
	gl.viewport(0, 0, screenBufferWidth(), screenBufferHeight());
	if (drawOutlines) {
		renderOutline(teapotModel);
	}
	gl.bindFramebuffer(gl.FRAMEBUFFER, screenFramebuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, phongTexture, 0);
	
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	drawModel(phongShader, teapotModel);
	
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
	gl.bindTexture(gl.TEXTURE_2D, teapotModel.palette);
	gl.uniform1i(pixelShader.palette, 4);
	
	drawRectangle(pixelShader);
	gl.activeTexture(gl.TEXTURE0);
	
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport((stereoscopic && transVal < 0) ? gl.viewportWidth : 0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.bindTexture(gl.TEXTURE_2D, screenTexture);
	drawRectangle(textureShader);
	gl.viewport(0, 0, gl.viewportWidth / 8, gl.viewportHeight / 8);
	gl.bindTexture(gl.TEXTURE_2D, teapotModel.palette);
	drawRectangle(textureShader);
}

function testOutline() {
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.BACK);
	drawModel(shader, teapotModel);
	gl.disable(gl.CULL_FACE);
	gl.disable(gl.DEPTH_TEST);
	drawBuffers(basicShader, teapotModel);
	gl.enable(gl.DEPTH_TEST);
}

function tick() {
	if (!ciede2000Texture && ciede2000Shader.loaded && loadedPalette) {
		createConversionTextures(teapotModel.palette);
	}
	requestAnimFrame(tick);
	draw();
	if (stereoscopic) {
		transVal = -transVal;
		draw();
	}
	time += 0.01;
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
	loadModel("scolipede2.ply", teapotModel);
	loadTexture("scolipede2.png", teapotModel);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	tick();
}