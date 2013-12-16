var gl;
var time = 0.0;
var basicShader;
var shader;
var conversionFramebuffer;
var srgbToCielabShader;
var srgbToCielabTexture;
var cielabToSrgbShader;
var cielabToSrgbTexture;
var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var normalMatrix = mat3.create();
var vertexBuffer;
var normalBuffer;
var indexBuffer;

function initGL(canvas) {
	try {
		gl = canvas.getContext("webgl"/*, {antialias:false}*/);
		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;
	} catch (e) {
	}
	if (!gl) {
		alert("Failed to initialise WebGL");
	}
}

function getShader(gl, name) {
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


function initShaders() {
	shader = createShader(getShader(gl, "shader-vs"), getShader(gl, "shader-fs"));
	gl.useProgram(shader);
	shader.vertexPosition = gl.getAttribLocation(shader, "vertexPosition");
	shader.vertexNormal = gl.getAttribLocation(shader, "vertexNormal");
	shader.pMatrix = gl.getUniformLocation(shader, "pMatrix");
	shader.mvMatrix = gl.getUniformLocation(shader, "mvMatrix");
	shader.nMatrix = gl.getUniformLocation(shader, "nMatrix");
}

function initBasicShader() {
	basicShader = createShader(getShader(gl, "basic-vs"), getShader(gl, "basic-fs"));
	gl.useProgram(basicShader);
	basicShader.vertexPosition = gl.getAttribLocation(basicShader, "vertexPosition");
	gl.enableVertexAttribArray(basicShader.vertexPosition);
	basicShader.pMatrix = gl.getUniformLocation(basicShader, "pMatrix");
	basicShader.mvMatrix = gl.getUniformLocation(basicShader, "mvMatrix");
}

function initSrgbToCielabShader() {
	srgbToCielabShader = createShader(getShader(gl, "basic-vs"), getShader(gl, "srgb-to-cielab"));
	gl.useProgram(srgbToCielabShader);
	srgbToCielabShader.vertexPosition = gl.getAttribLocation(srgbToCielabShader, "vertexPosition");
	gl.enableVertexAttribArray(srgbToCielabShader.vertexPosition);
	srgbToCielabShader.pMatrix = gl.getUniformLocation(srgbToCielabShader, "pMatrix");
	srgbToCielabShader.mvMatrix = gl.getUniformLocation(srgbToCielabShader, "mvMatrix");
	srgbToCielabShader.conversionMatrix = mat3.create([2.7688, 1.7517, 1.1301, 1.0, 4.5906, 0.060067, 0.0, 0.056507, 5.5942]);
	srgbToCielabShader.rgbConversion = gl.getUniformLocation(srgbToCielabShader, "rgbConversion");
	
}

function initCielabToSrgbShader() {
	srgbToCielabShader = createShader(getShader(gl, "basic-vs"), getShader(gl, "cielab-to-srgb"));
	gl.useProgram(cielabToSrgbShader);
	cielabToSrgbShader.vertexPosition = gl.getAttribLocation(cielabToSrgbShader, "vertexPosition");
	gl.enableVertexAttribArray(cielabToSrgbShader.vertexPosition);
	cielabToSrgbShader.pMatrix = gl.getUniformLocation(cielabToSrgbShader, "pMatrix");
	cielabToSrgbShader.mvMatrix = gl.getUniformLocation(cielabToSrgbShader, "mvMatrix");
	cielabToSrgbShader.conversionMatrix = mat3.create([0.41847, -0.15866, -0.082835, -0.91169, 0.25243, 0.015708, 0.00092090, -0.0025498, 0.17860]);
	cielabToSrgbShader.xyzConversion = gl.getUniformLocation(cielabToSrgbShader, "xyzConversion");
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
	mat4.ortho(0.0, 1.0, 0.0, 1.0, -1.0, 1.0);
	var rectCoords = [0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0];
	var rectBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, rectBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rectCoords), gl.STATIC_DRAW);
	gl.vertexAttribPointer(srgbToCielabShader.vertexPosition, 3, gl.FLOAT, false, 0, 0);
	gl.drawArrays(gl.QUADS, 1, 0);
}


function handleLoadModel(data) {
	var lines = data.split("\n");
	var currentVertex = 0;
	var vertexCount = 0;
	var currentFace = 0;
	var faceCount = 0;
	var vertices = [];
	var normals = [];
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
			if (split.length >= 6 && currentVertex < vertexCount) {
				vertices.push(parseFloat(split[0]));
				vertices.push(parseFloat(split[1]));
				vertices.push(parseFloat(split[2]));
				normals.push(parseFloat(split[3]));
				normals.push(parseFloat(split[4]));
				normals.push(parseFloat(split[5]));
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
	vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	vertexBuffer.itemSize = 3;
	vertexBuffer.numItems = vertexCount;
	normalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
	normalBuffer.itemSize = 3;
	normalBuffer.numItems = vertexCount;
	indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(faces), gl.STATIC_DRAW);
	indexBuffer.itemSize = 1;
	indexBuffer.numItems = faceCount * 3;
}

function loadModel() {
	var request = new XMLHttpRequest();
	request.overrideMimeType('text/plain');
	request.open("GET", "teapot_withnormals.ply");
	request.onreadystatechange = function() {
		if (request.readyState == 4) {
			handleLoadModel(request.responseText);
		}
	}
	request.send();
}

function drawBuffers(shader, vertexBuffer, indexBuffer, normalBuffer) {
	gl.useProgram(shader);
	gl.uniformMatrix4fv(shader.pMatrix, false, pMatrix);
	gl.uniformMatrix4fv(shader.mvMatrix, false, mvMatrix);
	if (normalBuffer != null) {
		gl.uniformMatrix3fv(shader.nMatrix, false, normalMatrix);
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.vertexAttribPointer(shader.vertexPosition, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(shader.vertexPosition);
	if (normalBuffer != null) {
		gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
		gl.vertexAttribPointer(shader.vertexNormal, 3, gl.FLOAT, true, 0, 0);
		gl.enableVertexAttribArray(shader.vertexNormal);
	}
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.drawElements(gl.TRIANGLES, indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	gl.disableVertexAttribArray(shader.vertexNormal);
}

function draw() {
	if (vertexBuffer == null) {
		return;
	}
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);
	mat4.identity(mvMatrix);

	mat4.translate(mvMatrix, [0.0, -1.0, -9.0]);
	mat4.rotate(mvMatrix, 1.0, [-1.0, 0.0, 0.0]);
	mat4.rotate(mvMatrix, time, [0.0, 0.0, 1.0]);

	mat4.toInverseMat3(mvMatrix, normalMatrix);
	mat3.transpose(normalMatrix);
	
	/*gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.BACK);*/
	drawBuffers(shader, vertexBuffer, indexBuffer, normalBuffer);
	//gl.disable(gl.CULL_FACE);

	//testOutline();

}

function testOutline() {
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.BACK);
	drawBuffers(shader, vertexBuffer, indexBuffer, normalBuffer);
	gl.disable(gl.CULL_FACE);
	gl.disable(gl.DEPTH_TEST);
	drawBuffers(basicShader, vertexBuffer, indexBuffer, null);
	gl.enable(gl.DEPTH_TEST);
}

function tick() {
	requestAnimFrame(tick);
	draw();
	time += 0.01;
}



function start() {
	var canvas = document.getElementById("glcanvas");
	initGL(canvas);
	initBasicShader();
	initShaders();
	loadModel();
	gl.clearColor(1.0, 1.0, 1.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	tick();
}