attribute vec3 vertexPosition;
attribute vec3 vertexNormal;

uniform mat4 pMatrix;
uniform mat4 mvMatrix;
uniform mat3 nMatrix;

varying vec3 varNormal;
varying vec3 eyeVec;

void main(void) {
	gl_Position = pMatrix * mvMatrix * vec4(vertexPosition, 1.0);
	varNormal = normalize(nMatrix * vertexNormal);
	eyeVec = (mvMatrix * vec4(vertexPosition, 1.0)).xyz;
}