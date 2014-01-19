precision mediump float;
varying vec3 varNormal;

void main(void) {
	gl_FragColor = vec4(vec3((varNormal + 1.0) / 2.0), 1.0);
}