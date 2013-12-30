var gl;
var time = 0.0;
var basicShader;
var textureShader;
var pixelShader;
var normalShader;
var depthShader;
var sobelShader;
var cannyShader;
var conversionFramebuffer;
var srgbToCielabShader;
var srgbToCielabTexture;
var cielabToSrgbShader;
var cielabToSrgbTexture;
var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var normalMatrix = mat3.create();
var teapotModel = new Object;
var screenFramebuffer;
var normalTexture;
var depthTexture;
var normalSobelTexture;
var depthSobelTexture;
var edgeTexture;
var screenTexture;
var rectBuffer;
var loadedShaders = false;
var transVal = 12.0;

function screenBufferWidth() {
	return 256;
}

function screenBufferHeight() {
	return 256;
}

function areShadersLoaded() {
	return basicShader.loaded && textureShader.loaded && pixelShader.loaded && normalShader.loaded && depthShader.loaded && sobelShader.loaded && cannyShader.loaded;
}

function initGL(canvas) {
	try {
		gl = canvas.getContext("webgl"/*, {antialias:false}*/);
		gl.viewportWidth = canvas.width / 2;
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

function initPixelShader() {
	pixelShader = createShaderFromFiles("pixel.vs", "pixel.fs");
	pixelShader.onLink = function() {
		gl.useProgram(pixelShader);
		pixelShader.vertexPosition = gl.getAttribLocation(pixelShader, "vertexPosition");
		pixelShader.vertexNormal = gl.getAttribLocation(pixelShader, "vertexNormal");
		pixelShader.texCoord = gl.getAttribLocation(pixelShader, "texCoord");
		pixelShader.texture = gl.getUniformLocation(pixelShader, "texture");
		pixelShader.palette = gl.getUniformLocation(pixelShader, "palette");
		pixelShader.pMatrix = gl.getUniformLocation(pixelShader, "pMatrix");
		pixelShader.mvMatrix = gl.getUniformLocation(pixelShader, "mvMatrix");
		pixelShader.nMatrix = gl.getUniformLocation(pixelShader, "nMatrix");
		pixelShader.rgbConversion = gl.getUniformLocation(pixelShader, "rgbConversion");
		pixelShader.rgbConversionMatrix = mat3.create([0.4124, 0.3576, 0.1805, 0.2126, 0.7152, 0.0722, 0.0193, 0.1192, 0.9502]);
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
		gl.enableVertexAttribArray(textureShader.texCoord);
		textureShader.texCoord = gl.getAttribLocation(textureShader, "texCoord");
		textureShader.pMatrix = gl.getUniformLocation(textureShader, "pMatrix");
		textureShader.mvMatrix = gl.getUniformLocation(textureShader, "mvMatrix");
		textureShader.texture = gl.getUniformLocation(textureShader, "texture");
		textureShader.loaded = true;
	}
}

function initNormalShader() {
	normalShader = createShaderFromFiles("normal.vs", "normal.fs");
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

function initSobelShader() {
	sobelShader = createShaderFromFiles("sobel.vs", "sobel.fs");
	sobelShader.onLink = function() {
		gl.useProgram(sobelShader);
		sobelShader.vertexPosition = gl.getAttribLocation(sobelShader, "vertexPosition");
		gl.enableVertexAttribArray(sobelShader.vertexPosition);
		sobelShader.texCoord = gl.getAttribLocation(sobelShader, "texCoord");
		gl.enableVertexAttribArray(sobelShader.texCoord);
		sobelShader.pMatrix = gl.getUniformLocation(sobelShader, "pMatrix");
		sobelShader.mvMatrix = gl.getUniformLocation(sobelShader, "mvMatrix");
		sobelShader.inputImage = gl.getUniformLocation(sobelShader, "inputImage");
		sobelShader.imageSize = gl.getUniformLocation(sobelShader, "imageSize");
		sobelShader.loaded = true;
	}
}

function initCannyShader() {
	cannyShader = createShaderFromFiles("canny.vs", "canny.fs");
	cannyShader.onLink = function() {
		gl.useProgram(cannyShader);
		cannyShader.vertexPosition = gl.getAttribLocation(cannyShader, "vertexPosition");
		gl.enableVertexAttribArray(cannyShader.vertexPosition);
		cannyShader.texCoord = gl.getAttribLocation(cannyShader, "texCoord");
		gl.enableVertexAttribArray(cannyShader.texCoord);
		cannyShader.pMatrix = gl.getUniformLocation(cannyShader, "pMatrix");
		cannyShader.mvMatrix = gl.getUniformLocation(cannyShader, "mvMatrix");
		cannyShader.depthTexture = gl.getUniformLocation(cannyShader, "depthTexture");
		cannyShader.normalTexture = gl.getUniformLocation(cannyShader, "normalTexture");
		cannyShader.textureSize = gl.getUniformLocation(cannyShader, "textureSize");
		cannyShader.loaded = true;
	}
}

function initSrgbToCielabShader() {
	srgbToCielabShader = createShaderFromFiles("canny.vs", "srgbtocielab.fs");
	srgbToCielabShader.onLink = function() {
		gl.useProgram(srgbToCielabShader);
		srgbToCielabShader.vertexPosition = gl.getAttribLocation(srgbToCielabShader, "vertexPosition");
		gl.enableVertexAttribArray(srgbToCielabShader.vertexPosition);
		srgbToCielabShader.pMatrix = gl.getUniformLocation(srgbToCielabShader, "pMatrix");
		srgbToCielabShader.mvMatrix = gl.getUniformLocation(srgbToCielabShader, "mvMatrix");
		srgbToCielabShader.conversionMatrix = mat3.create([2.7688, 1.7517, 1.1301, 1.0, 4.5906, 0.060067, 0.0, 0.056507, 5.5942]);
		srgbToCielabShader.rgbConversion = gl.getUniformLocation(srgbToCielabShader, "rgbConversion");
		gl.disableVertexAttribArray(srgbToCielabShader.vertexPosition);
		srgbToCielabShader.loaded = true;
	}
}

function initCielabToSrgbShader() {
	srgbToCielabShader = createShaderFromFiles("canny.vs", "cielabtosrgb.fs");
	srgbToCielabShader.onLink = function() {
		gl.useProgram(cielabToSrgbShader);
		cielabToSrgbShader.vertexPosition = gl.getAttribLocation(cielabToSrgbShader, "vertexPosition");
		gl.enableVertexAttribArray(cielabToSrgbShader.vertexPosition);
		cielabToSrgbShader.pMatrix = gl.getUniformLocation(cielabToSrgbShader, "pMatrix");
		cielabToSrgbShader.mvMatrix = gl.getUniformLocation(cielabToSrgbShader, "mvMatrix");
		cielabToSrgbShader.conversionMatrix = mat3.create([0.41847, -0.15866, -0.082835, -0.91169, 0.25243, 0.015708, 0.00092090, -0.0025498, 0.17860]);
		cielabToSrgbShader.xyzConversion = gl.getUniformLocation(cielabToSrgbShader, "xyzConversion");
		gl.disableVertexAttribArray(cielabToSrgbShader.vertexPosition);
		cielabToSrgbShader.loaded = true;
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

function createConversionTextures() {
	conversionTexture = gl.createTexture();
	conversionFramebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, conversionFramebuffer);
	gl.bindTexture(gl.TEXTURE_2D, conversionTexture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2048, 2048, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	var renderbuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 2048, 2048);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, conversionTexture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
	drawRectangle(srgbToCielabShader);
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
				vertices.push(parseFloat(split[1]));
				vertices.push(parseFloat(split[2]));
				normals.push(parseFloat(split[3]));
				normals.push(parseFloat(split[4]));
				normals.push(parseFloat(split[5]));
				texCoords.push(parseFloat(split[6]));
				texCoords.push(parseFloat(split[7]));
				currentVertex += 1;
			}
			if (split.length >= 4 && currentVertex >= vertexCount && currentFace < faceCount) {
				// assume split[0] = 3, i.e. triangles
				faces.push(parseInt(split[1]));
				faces.push(parseInt(split[2]));
				faces.push(parseInt(split[3]));
				currentFace += 1
			}
		}
	}
	model.vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
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
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.bindTexture(gl.TEXTURE_2D, null);
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
	model.palette = gl.createTexture();
	model.palette.image = new Image();
	model.palette.image.onload = function() {
		gl.bindTexture(gl.TEXTURE_2D, model.palette);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, model.palette.image);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}
	model.palette.image.src = "palette.png";
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
	
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, normalSobelTexture, 0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.useProgram(sobelShader);
	gl.bindTexture(gl.TEXTURE_2D, normalTexture);
	gl.uniform1i(sobelShader.inputImage, 0);
	gl.uniform2i(sobelShader.imageSize, screenBufferWidth(), screenBufferHeight());
	drawRectangle(sobelShader);
	
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, depthSobelTexture, 0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.useProgram(sobelShader);
	gl.bindTexture(gl.TEXTURE_2D, depthTexture);
	gl.uniform1i(sobelShader.inputImage, 0);
	gl.uniform2i(sobelShader.imageSize, screenBufferWidth(), screenBufferHeight());
	drawRectangle(sobelShader);
	
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, edgeTexture, 0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.useProgram(cannyShader);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, depthSobelTexture);
	gl.uniform1i(cannyShader.depthTexture, 0);
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, normalSobelTexture);
	gl.uniform1i(cannyShader.normalTexture, 1);
	gl.activeTexture(gl.TEXTURE0);
	gl.uniform2i(cannyShader.textureSize, screenBufferWidth(), screenBufferHeight());
	drawRectangle(cannyShader);
	
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
	if (typeof shader.texCoord != "undefined") {
		gl.enableVertexAttribArray(shader.texCoord);
		gl.vertexAttribPointer(shader.texCoord, 2, gl.FLOAT, false, 0, 0);
	}
	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}

function drawModel(shader, model) {
	mat4.perspective(45, screenBufferWidth() / screenBufferHeight(), 150.0, 400.0, pMatrix);
	mat4.identity(mvMatrix);

	mat4.translate(mvMatrix, [transVal, -20.0, -250.0]);
	mat4.rotate(mvMatrix, 0.5, [1.0, 0.0, 0.0]);
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
	if (typeof shader.texture != "undefined") {
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, model.palette);
		gl.uniform1i(shader.palette, 1);
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
	renderOutline(teapotModel);
	//gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.bindFramebuffer(gl.FRAMEBUFFER, screenFramebuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, screenTexture, 0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	drawModel(pixelShader, teapotModel);
	gl.disable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.ONE_MINUS_SRC_COLOR, gl.SRC_COLOR);
	gl.bindTexture(gl.TEXTURE_2D, edgeTexture);
	gl.useProgram(textureShader);
	drawRectangle(textureShader);
	gl.enable(gl.DEPTH_TEST);
	gl.disable(gl.BLEND);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport(transVal < 0 ? gl.viewportWidth : 0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.bindTexture(gl.TEXTURE_2D, screenTexture);
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
	requestAnimFrame(tick);
	draw();
	transVal = -transVal;
	draw();
	time += 0.01;
}

function loadShaders() {
	initPixelShader();
	initBasicShader();
	initDepthShader();
	initNormalShader();
	initSobelShader();
	initCannyShader();
	initTextureShader();
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
	initScreenFramebuffer();
	loadModel("teapot2.ply", teapotModel);
	loadTexture("background.png", teapotModel);
	gl.clearColor(1.0, 1.0, 1.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	tick();
}