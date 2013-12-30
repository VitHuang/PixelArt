precision mediump float;
varying vec3 varNormal;
varying vec3 eyeVec;

vec4 pack(float x) {
	const vec4 shifts = vec4(256.0 * 256.0 * 256.0, 256.0 * 256.0, 256.0, 1.0);
	const vec4 mask = vec4(0.0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0);
	vec4 pack = fract(x * shifts);
	pack -= pack.xxyz * mask;
	return pack;
}

void main(void) {
	float angle = abs(dot(normalize(eyeVec), normalize(varNormal)));
	gl_FragColor = pack(angle);
}