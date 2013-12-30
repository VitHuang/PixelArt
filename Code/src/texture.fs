precision mediump float;

uniform sampler2D texture;

varying vec2 varTexCoord;

void main(void) {
	gl_FragColor = texture2D(texture, varTexCoord);
}