precision mediump float;
varying vec3 varNormal;

varying vec4 fragPosition;

vec4 pack(float x) {
	const vec4 shifts = vec4(256.0 * 256.0 * 256.0, 256.0 * 256.0, 256.0, 1.0);
	const vec4 mask = vec4(0.0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0);
	vec4 pack = fract(x * shifts);
	pack -= pack.xxyz * mask;
	return pack;
}

void main(void) {
	float depth = (fragPosition.z / fragPosition.w + 1.0) / 2.0;
	gl_FragColor = pack(depth);
}