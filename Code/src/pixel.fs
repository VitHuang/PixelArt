precision mediump float;
varying vec3 varNormal;
varying vec3 eyeVec;
varying vec2 varTexCoord;
uniform sampler2D texture;
uniform sampler2D paletteMap;

// will optimise later
uniform sampler2D palette;
uniform mat3 rgbConversion;

const float ditherFactor = 0.06;

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

vec3 srgbToCiexyz(vec3 srgb) {
	vec3 linearRgb = vec3(linearise(srgb.r), linearise(srgb.g), linearise(srgb.b));
	return linearRgb * rgbConversion;
}

vec3 srgbToCielab(vec3 srgb) {
	vec3 ciexyz = srgbToCiexyz(srgb);
	float fY = labf(ciexyz.y);
	vec3 cielab = vec3(116.0 * fY - 16.0, 500.0 * (labf(ciexyz.x / 0.95047) - fY), 200.0 * (fY - labf(ciexyz.z / 1.08883)));
	return cielab;
}

vec4 getMatchingColour(vec4 colour) {
	float bestDist = -1.0;
	vec4 bestColour;
	vec4 paletteColour;
	// TODO: pass this value in from main program since WebGL apparently doesn't support GLSL textureSize
	for (int i = 0; i < 16; i++) {
		paletteColour = texture2D(palette, vec2((float(i) + 0.5) / 16.0, 0));
		float dist = distance(srgbToCielab(paletteColour.rgb), srgbToCielab(colour.rgb));
		if (dist < bestDist || bestDist < 0.0) {
			bestColour = paletteColour;
			bestDist = dist;
		}
	}
	return bestColour;
}

float calculateLightWeighting(vec3 normal) {
	return max(normal.y + normal.x + normal.z, 0.0) / 2.0;
}

void main(void) {
	vec3 normal = normalize(varNormal);
	vec4 fragColour;
	float lightWeighting = calculateLightWeighting(normal);
	vec3 lighting = vec3(1.0, 1.0, 1.0) * lightWeighting + vec3(0.3, 0.3, 0.3);
	fragColour = texture2D(texture, varTexCoord) * vec4(lighting, 1.0);
	// LET'S DITHER SOME THINGS
	fragColour += (mod(gl_FragCoord[0] + gl_FragCoord[1], 2.0)) * ditherFactor * 2.0 - ditherFactor;
	fragColour += floor((mod(gl_FragCoord[0], 2.0) + mod(gl_FragCoord[1], 2.0)) / 2.0) * ditherFactor / 2.0;
	fragColour += floor((mod(gl_FragCoord[0] + 1.0, 2.0) + mod(gl_FragCoord[1], 2.0)) / 2.0) * -ditherFactor / 2.0;
	//fragColour -= floor((2.0 - (mod(gl_FragCoord[0], 2.0) + mod(gl_FragCoord[1], 2.0))) / 2.0) * ditherFactor;
	//vec2 paletteMapIndex = vec2(floor(fragColour.r * 255.0) * 16.0 + floor(fragColour.g * 16.0), floor(fragColour.b * 255.0) * 16.0 + floor(mod(fragColour.g * 255.0, 16.0)));
	gl_FragColor = getMatchingColour(fragColour);//texture2D(paletteMap, paletteMapIndex);
}