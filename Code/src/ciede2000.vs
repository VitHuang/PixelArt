attribute vec3 vertexPosition;
attribute vec2 texCoord;

uniform mat4 pMatrix;
uniform mat4 mvMatrix;

void main(void) {
        gl_Position = pMatrix * mvMatrix * vec4(vertexPosition, 1.0);
}