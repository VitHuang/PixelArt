precision highp float;
uniform sampler2D texture;
uniform mat3 rgbConversion;
varying vec2 varTexCoord;

#define MIN_A -86.185
#define MAX_A 98.254
#define MIN_B -107.863
#define MAX_B 94.482

float linearise(float c) {
	if (c <= 0.04045) {
		return (c / 12.92);
	} else {
		return pow((c + 0.055) / 1.055, 2.4);
	}
}

float labf(float c) {
	if (c > 0.008856) {
		return pow(c, 1.0/3.0);
	} else {
		return 7.787 * c + 0.1379;
	}
}

vec3 srgbToCiexyz(vec3 srgb) {
	vec3 linearRgb = vec3(linearise(srgb.r), linearise(srgb.g), linearise(srgb.b));
	return linearRgb * rgbConversion;
}

vec3 srgbToCielab(vec3 srgb) {
	vec3 ciexyz = srgbToCiexyz(srgb);
	float fX = labf(ciexyz.x / 0.95047);
	float fY = labf(ciexyz.y);
	float fZ = labf(ciexyz.z / 1.08883);
	vec3 cielab = vec3(max(116.0 * fY - 16.0, 0.0), 500.0 * (fX - fY), 200.0 * (fY - fZ));
	return cielab;
}

void main(void) {
	vec3 lab = srgbToCielab(texture2D(texture, varTexCoord).rgb);
	gl_FragColor = vec4(lab.x / 100.0, (lab.y - MIN_A) / (MAX_A - MIN_A), (lab.z - MIN_B) / (MAX_B - MIN_B), 1.0);
}