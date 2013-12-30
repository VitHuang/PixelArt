attribute vec3 vertexPosition;
attribute vec3 vertexNormal;
varying vec3 varNormal;

uniform mat4 pMatrix;
uniform mat4 mvMatrix;
uniform mat3 nMatrix;

varying vec4 fragPosition;

void main(void) {
	vec4 position = pMatrix * mvMatrix * vec4(vertexPosition, 1.0);
	fragPosition = position;
	gl_Position = position;
	varNormal = normalize(nMatrix * vertexNormal);
}