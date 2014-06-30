attribute vec3 vertexPosition;
attribute vec3 vertexNormal;
attribute vec2 texCoord;

uniform mat4 pMatrix;
uniform mat4 mvMatrix;
uniform mat3 nMatrix;
uniform ivec2 viewportSize;

varying vec3 varNormal;
varying vec2 varTexCoord;
varying vec3 eyeVec;

varying float temp;

void main(void) {
        varNormal = normalize(nMatrix * vertexNormal);
		vec4 cameraSpace = mvMatrix * vec4(vertexPosition, 1.0);
        vec4 screenSpace = pMatrix * cameraSpace;
		gl_Position = screenSpace;
        varTexCoord = texCoord;
        eyeVec = (mvMatrix * vec4(vertexPosition, 1.0)).xyz;
}