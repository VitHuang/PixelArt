var gl;
var time = 0.0;
var shader;
var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var vertexBuffer;
var indexBuffer;

function initGL(canvas) {
	try {
		gl = canvas.getContext("webgl");
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

function initShaders() {
	var fragShader = getShader(gl, "shader-fs");
	var vertShader = getShader(gl, "shader-vs");
	shader = gl.createProgram();
	gl.attachShader(shader, vertShader);
	gl.attachShader(shader, fragShader);
	gl.linkProgram(shader);
		if (!gl.getProgramParameter(shader, gl.LINK_STATUS)) {
		alert("Could not initialise shaders");
	}
	gl.useProgram(shader);
	shader.vertexPositionAttribute = gl.getAttribLocation(shader, "vertexPosition");
	gl.enableVertexAttribArray(shader.vertexPositionAttribute);
	shader.pMatrixUniform = gl.getUniformLocation(shader, "pMatrix");
	shader.mvMatrixUniform = gl.getUniformLocation(shader, "mvMatrix");
}
function setMatrixUniforms() {
	gl.uniformMatrix4fv(shader.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(shader.mvMatrixUniform, false, mvMatrix);
}

function handleLoadModel(data) {
	var lines = data.split("\n");
	var currentVertex = 0;
	var vertexCount = 0;
	var currentFace = 0;
	var faceCount = 0;
	var vertices = [];
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
			if (split.length >= 3 && currentVertex < vertexCount) {
				vertices.push(parseFloat(split[0]));
				vertices.push(parseFloat(split[1]));
				vertices.push(parseFloat(split[2]));
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
	indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(faces), gl.STATIC_DRAW);
	indexBuffer.itemSize = 1;
	indexBuffer.numItems = faceCount * 3;
}

function loadModel() {
	var request = new XMLHttpRequest();
	request.overrideMimeType('text/plain');
	request.open("GET", "teapot.ply");
	request.onreadystatechange = function() {
		if (request.readyState == 4) {
			handleLoadModel(request.responseText);
		}
	}
	request.send();
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

	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.vertexAttribPointer(shader.vertexPositionAttribute, vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
	setMatrixUniforms();

	gl.drawElements(gl.TRIANGLES, indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

}

function tick() {
	requestAnimFrame(tick);
	draw();
	time += 0.01;
}



function start() {
	var canvas = document.getElementById("glcanvas");
	initGL(canvas);
	initShaders();
	loadModel();
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
	tick();
}