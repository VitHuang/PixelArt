precision mediump float;

uniform mat3 xyzConversion;

float invlabf(float c) {
	if (c > 0.2069) {
		return c * c * c;
	} else {
		return 0.12842 * (c - 0.1379);
	}
}

float delinearise(float c) {
	if (c <= 0.0031308) {
		return (c * 12.92);
	} else {
		return pow((c * 1.055), 0.41667) - 0.055;
	}
}

vec3 normalisedCielabToSrgb(vec3 normalisedCielab) {
	vec3 ciexyz = vec3(invlabf(normalisedCielab.x), invlabf(normalisedCielab.x + normalisedCielab.y), invlabf(normalisedCielab.x - normalisedCielab.z));
	vec3 linearRgb = xyzConversion * ciexyz;
	vec3 srgb = vec3(delinearise(linearRgb.r), delinearise(linearRgb.g), delinearise(linearRgb.b));
	return srgb;
}

void main(void){
	vec3 cielab = vec3(floor(gl_FragCoord.x / 16.0) / 255.0, (floor(mod(gl_FragCoord.x, 16.0)) * 16.0 + floor(mod(gl_FragCoord.y, 16.0))) / 255.0, floor(gl_FragCoord.y / 16.0)) / 255.0;
	vec3 srgb = normalisedCielabToSrgb(cielab);
	gl_FragColor = vec4(srgb, 1.0);
}