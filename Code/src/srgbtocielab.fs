precision mediump float;

uniform mat3 rgbConversion;

float linearise(float c) {
	if (c <= 0.04045) {
		return (c / 12.92);
	} else {
		return pow((c + 0.055) / 1.055, 2.4);
	}
}

float labf(float c) {
	if (c > 0.008856) {
		return pow(c, 0.3333);
	} else {
		return 7.787 * c + 0.1379;
	}
}

vec3 srgbToCielab(vec3 srgb) {
	vec3 linearRgb = vec3(linearise(srgb.r), linearise(srgb.g), linearise(srgb.b));
	vec3 ciexyz = rgbConversion * linearRgb;
	float fX = labf(ciexyz.x);
	float fY = labf(ciexyz.y);
	vec3 cielab = vec3(116 * fY - 16, 500 * (fX - fY), 200 * (fY - labf(ciexyz.z)));
	return cielab;
}

void main(void){
	vec3 srgb = vec3(floor(gl_FragCoord.x / 16) / 255.0, (floor(mod(gl_FragCoord.x, 16)) * 16 + floor(mod(gl_FragCoord.y, 16))) / 255.0, floor(gl_FragCoord.y / 16)) / 255.0;
	vec3 cielab = srgbToCielab(srgb);
	gl_FragColor = vec4((cielab.x + 16 / 116), cielab.y / 500, cielab.z / 500, 1.0);
}