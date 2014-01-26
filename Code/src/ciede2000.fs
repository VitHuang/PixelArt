precision highp float;
uniform sampler2D palette;
uniform mat3 rgbConversion;

#define PI 3.141592653589793238462643383279

const int bits = 8;

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

float dsin(float degrees) {
	return sin(degrees / 180.0 * PI);
}

float dcos(float degrees) {
	return cos(degrees / 180.0 * PI);
}

float datan(float y, float x) {
	return atan(y, x) / PI * 180.0;
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
	if (lab1.z != 0.0 || ap1 != 0.0) {
		h1 = datan(lab1.z, ap1);
		if (h1 < 0.0) {
			h1 += 360.0;
		}
	}
	float h2 = 0.0;
	if (lab2.z != 0.0 || ap2 != 0.0) {
		h2 = datan(lab2.z, ap2);
		if (h2 < 0.0) {
			h2 += 360.0;
		}
	}
	float dl = lab2.x - lab1.x;
	float dc = cp2 - cp1;
	float dh = 0.0;
	if (cp1 != 0.0 && cp2 != 0.0) {
		dh = h2 - h1;
		if (dh < -180.0) {
			dh += 360.0;
		} else if (dh > 180.0) {
			dh -= 360.0;
		}
	}
	float dch = 2.0 * sqrt(cp1 * cp2) * dsin(dh / 2.0);
	float lavg = (lab1.x + lab2.x) / 2.0;
	float cpavg = (cp1 + cp2) / 2.0;
	float havg = h1 + h2;
	if (cp1 != 0.0 && cp2 != 0.0) {
		if (abs(h1 - h2) < 180.0) {
			havg = (h1 + h2) / 2.0;
		} else {
			if (h1 + h2 < 360.0) {
				havg = (h1 + h2 + 360.0) / 2.0;
			} else {
				havg = (h1 + h2 - 360.0) / 2.0;
			}
		}
	}
	float t = 1.0 - 0.17 * dcos(havg - 30.0) + 0.24 * dcos(2.0 * havg) + 0.32 * dcos(3.0 * havg + 6.0) - 0.2 * dcos(4.0 * havg - 63.0);
	//float sqterm = ((havg - 55.0 * PI / 36.0) / 25.0);
	float sqterm = ((havg - 275.0) / 25.0);
	float dtheta = 30.0 * exp(-(sqterm * sqterm));
	float cpavg7 = cpavg * cpavg * cpavg * cpavg * cpavg * cpavg * cpavg;
	float rc = 2.0 * sqrt(cpavg7 / (cpavg7 + 6103515625.0));
	float lavgp = (lavg - 50.0) * (lavg - 50.0);
	float sl = 1.0 + (0.015 * lavgp) / sqrt(20.0 + lavgp);
	float sc = 1.0 + 0.045 * cpavg;
	float sh = 1.0 + 0.015 * cpavg * t;
	float rt = -dsin(2.0 * dtheta) * rc;
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

vec4 getClosestColour(vec4 colour) {
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
	float size = pow(2.0, float(bits));
	float sqrtSize = sqrt(size);
	float r = mod(gl_FragCoord.x, size) / (size - 1.0);
	float g = mod(gl_FragCoord.y, size) / (size - 1.0);
	float b = (floor(gl_FragCoord.x / size) / (sqrtSize - 1.0) + floor(gl_FragCoord.y / size)) / (sqrtSize - 1.0);
	gl_FragColor = getClosestColour(vec4(r, g, b, 1.0));
	//gl_FragColor = vec4(r, g, b, 1.0);
}