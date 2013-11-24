var gl;
var time = 0.0;
var shader;
var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var normalMatrix = mat3.create();
var vertexBuffer;
var normalBuffer;
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
	shader.vertexPosition = gl.getAttribLocation(shader, "vertexPosition");
	gl.enableVertexAttribArray(shader.vertexPosition);
	shader.vertexNormal = gl.getAttribLocation(shader, "vertexNormal");
	gl.enableVertexAttribArray(shader.vertexNormal);
	shader.pMatrix = gl.getUniformLocation(shader, "pMatrix");
	shader.mvMatrix = gl.getUniformLocation(shader, "mvMatrix");
	shader.nMatrix = gl.getUniformLocation(shader, "nMatrix");
}
function setMatrixUniforms() {
	gl.uniformMatrix4fv(shader.pMatrix, false, pMatrix);
	gl.uniformMatrix4fv(shader.mvMatrix, false, mvMatrix);
	gl.uniformMatrix3fv(shader.nMatrix, false, normalMatrix);
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
	alert(vertexCount);
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

	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.vertexAttribPointer(shader.vertexPosition, 3, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
	gl.vertexAttribPointer(shader.vertexNormal, 3, gl.FLOAT, true, 0, 0);

	setMatrixUniforms();

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
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
	gl.clearColor(1.0, 1.0, 1.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
	//gl.enable(gl.CULL_FACE);
	//gl.cullFace(gl.BACK);
	tick();
}