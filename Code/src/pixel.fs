precision mediump float;
varying vec2 varTexCoord;
uniform sampler2D paletteMap;

uniform sampler2D phongTexture;
uniform sampler2D edgeTexture;
uniform ivec2 textureSize;

// will optimise later
uniform sampler2D palette;
uniform mat3 rgbConversion;

#define PI 3.141592653589793238462643383279

const float ditherFactor = 0.06;
const float antialiasThreshold = 0.1;
const int antialiasDistance = 16;

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

float ciede2000(vec3 lab1, vec3 lab2) {
	float cavg = (length(lab1.yz) + length(lab2.yz)) / 2.0;
	float cavg7 = cavg * cavg * cavg * cavg * cavg * cavg * cavg;
	float g = 0.5 * (1.0 - sqrt(cavg7 / (cavg7 + 6103515625.0)));
	float ap1 = (1.0 + g) * lab1.y;
	float ap2 = (1.0 + g) * lab2.y;
	float cp1 = sqrt(ap1 * ap1 + lab1.z * lab1.z);
	float cp2 = sqrt(ap2 * ap2 + lab2.z * lab2.z);
	float h1 = 0.0;
	if (lab1.z != 0.0 && ap1 != 0.0) {
		h1 = atan(lab1.z, ap1);
	}
	float h2 = 0.0;
	if (lab2.z != 0.0 && ap2 != 0.0) {
		h2 = atan(lab2.z, ap2);
	}
	float dl = lab2.x - lab1.x;
	float dc = cp2 - cp1;
	float dh = 0.0;
	if (cp1 != 0.0 && cp2 != 0.0) {
		dh = h2 - h1;
		if (dh < -PI) {
			dh += 2.0 * PI;
		} else if (dh > PI) {
			dh -= 2.0 * PI;
		}
	}
	float dch = 2.0 * sqrt(cp1 * cp2) * (dh / 2.0);
	float lavg = (lab1.x + lab2.x) / 2.0;
	float cpavg = (cp1 + cp2) / 2.0;
	float havg = h1 + h2;
	if (cp1 != 0.0 && cp2 != 0.0) {
		if (abs(h1 - h2) < PI) {
			havg = (h1 + h2) / 2.0;
		} else {
			if (h1 + h2 < 2.0 * PI) {
				havg = (h1 + h2 + 2.0 * PI);
			} else {
				havg = (h1 + h2 - 2.0 * PI);
			}
		}
	}
	float t = 1.0 - 0.17 * cos(havg - PI / 6.0) + 0.24 * cos(2.0 * havg) + 0.32 * cos(3.0 * havg + PI / 30.0) - 0.20 * cos(4.0 * havg - 7.0 * PI / 20.0);
	float dlambda = (PI / 6.0) * exp(-((havg - 55.0 * PI / 36.0) / 25.0));
	float cpavg7 = cpavg * cpavg * cpavg * cpavg * cpavg * cpavg * cpavg;
	float rc = 0.5 * sqrt(cpavg7 / (cpavg7 + 6103515625.0));
	float lavgp = (lavg - 50.0) * (lavg - 50.0);
	float sl = 1.0 + (0.015 * lavgp) / sqrt(20.0 + lavgp);
	float sc = 1.0 + 0.045 * cpavg;
	float sh = 1.0 + 0.015 * cpavg * t;
	float rt = -sin(2.0 * dlambda) * rc;
	float de = sqrt((dl / sl) * (dl / sl) + (dc / sc) * (dc / sc) + (dch / sh) * (dch / sh) + rt * (dc / sc) * (dch / sh));
	return de;
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

vec4 antialiasHorizontal() {
	vec2 lcoord = gl_FragCoord.xy / vec2(textureSize);
	vec2 rcoord = gl_FragCoord.xy / vec2(textureSize);
	float offset = 1.0 / float(textureSize.x);
	bool lfound = false;
	bool rfound = false;
	for (int i = 0; i < antialiasDistance; i++) {
		if (!lfound) {
			lcoord.x -= offset;
			lfound = (texture2D(edgeTexture, lcoord).r < antialiasThreshold);
		}
		if (!rfound) {
			rcoord.x += offset;
			rfound = (texture2D(edgeTexture, rcoord).r < antialiasThreshold);
		}
		if (rfound && lfound) {
			break;
		}
	}
	float len = (rcoord.x - lcoord.x - offset);
	float weighting = (gl_FragCoord.x / float(textureSize.x) - lcoord.x) / len;
	return 0.6 * (texture2D(phongTexture, lcoord) * (1.0 - weighting) + texture2D(phongTexture, rcoord) * weighting);
}

vec4 antialiasVertical() {
	vec2 dcoord = gl_FragCoord.xy / vec2(textureSize);
	vec2 ucoord = gl_FragCoord.xy / vec2(textureSize);
	float offset = 1.0 / float(textureSize.y);
	bool dfound = false;
	bool ufound = false;
	for (int i = 0; i < antialiasDistance; i++) {
		if (!dfound) {
			dcoord.y -= offset;
			dfound = (texture2D(edgeTexture, dcoord).r < antialiasThreshold);
		}
		if (!ufound) {
			ucoord.y += offset;
			ufound = (texture2D(edgeTexture, ucoord).r < antialiasThreshold);
		}
		if (dfound && ufound) {
			break;
		}
	}
	float len = (ucoord.y - dcoord.y - offset);
	float weighting = (gl_FragCoord.y / float(textureSize.y) - dcoord.y) / len;
	return 0.6 * (texture2D(phongTexture, dcoord) * (1.0 - weighting) + texture2D(phongTexture, ucoord) * weighting);
}

vec4 antialias() {
	float leftIntensity = texture2D(edgeTexture, (gl_FragCoord.xy - vec2(1.0, 0.0)) / vec2(textureSize)).r;
	float rightIntensity = texture2D(edgeTexture, (gl_FragCoord.xy + vec2(1.0, 0.0)) / vec2(textureSize)).r;
	float downIntensity = texture2D(edgeTexture, (gl_FragCoord.xy + vec2(0.0, 1.0)) / vec2(textureSize)).r;
	float upIntensity = texture2D(edgeTexture, (gl_FragCoord.xy - vec2(0.0, 1.0)) / vec2(textureSize)).r;
	if ((leftIntensity + rightIntensity) > (downIntensity + upIntensity)) {
		return antialiasHorizontal();
	} else {
		return antialiasVertical();
	}
}

vec4 getMatchingColour(vec4 colour) {
	float bestDist = -1.0;
	vec4 bestColour;
	vec4 paletteColour;
	// TODO: pass this value in from main program since WebGL apparently doesn't support GLSL textureSize
	for (int i = 0; i < 16; i++) {
		paletteColour = texture2D(palette, vec2(float(i) / 16.0, 0));
		float dist = ciede2000(srgbToCielab(colour.rgb), srgbToCielab(paletteColour.rgb));
		if (dist < bestDist || bestDist < 0.0) {
			bestColour = paletteColour;
			bestDist = dist;
		}
	}
	return bestColour;
}

void main(void) {
	vec4 fragColour = texture2D(phongTexture, gl_FragCoord.xy / vec2(textureSize));
	float specularFactor = fragColour.a;
	float edgeIntensity = texture2D(edgeTexture, gl_FragCoord.xy / vec2(textureSize)).r;
	if (edgeIntensity > antialiasThreshold) {
		fragColour = fragColour * (1.0 - edgeIntensity) + antialias() * edgeIntensity;
		//fragColour = antialias();
	} else {
		fragColour = fragColour + vec4(vec3(specularFactor), 1.0);
	}
	fragColour.a = 1.0;
	fragColour = clamp(fragColour, 0.0, 1.0);
	// LET'S DITHER SOME THINGS
	//fragColour += (mod(gl_FragCoord[0] + gl_FragCoord[1], 2.0)) * ditherFactor * 2.0 - ditherFactor;
	//fragColour += floor((mod(gl_FragCoord[0], 2.0) + mod(gl_FragCoord[1], 2.0)) / 2.0) * ditherFactor / 2.0;
	//fragColour += floor((mod(gl_FragCoord[0] + 1.0, 2.0) + mod(gl_FragCoord[1], 2.0)) / 2.0) * -ditherFactor / 2.0;
	//fragColour -= floor((2.0 - (mod(gl_FragCoord[0], 2.0) + mod(gl_FragCoord[1], 2.0))) / 2.0) * ditherFactor;
	//vec2 paletteMapIndex = vec2(floor(fragColour.r * 255.0) * 16.0 + floor(fragColour.g * 16.0), floor(fragColour.b * 255.0) * 16.0 + floor(mod(fragColour.g * 255.0, 16.0)));
	gl_FragColor = getMatchingColour(fragColour);//texture2D(paletteMap, paletteMapIndex);
	//gl_FragColor = fragColour;
}