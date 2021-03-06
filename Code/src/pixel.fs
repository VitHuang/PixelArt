precision highp float;
varying vec2 varTexCoord;
uniform sampler2D paletteMap;

uniform sampler2D phongTexture;
uniform sampler2D edgeTexture;
uniform sampler2D depthTexture;
uniform sampler2D conversionTexture;
uniform mat3 rgbConversion;
uniform ivec2 textureSize;

const int conversionBits = 8;
const float edgeThreshold = 0.3;
const int antialiasDistance = 16;
const vec4 outlineColour = vec4(0.8, 0.8, 0.8, 1.0);
const vec4 midColour = vec4(0.2, 0.2, 0.2, 1.0);
const vec4 edgeColour = vec4(0.8, 0.8, 0.8, 1.0);
const float minEdgeLDifference = 10.0;

float unpack(vec4 pack) {
	const vec4 shifts = vec4(1.0 / (256.0 * 256.0 * 256.0), 1.0 / (256.0 * 256.0), 1.0 / 256.0, 1.0);
	return dot(pack, shifts);
}


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

float weightFun(float pos) {
	return sin(pos * 1.57079633);
}

vec4 antialiasHorizontal() {
	vec2 coord = gl_FragCoord.xy / vec2(textureSize);
	vec2 lcoord = coord;
	vec2 rcoord = coord;
	float offset = 1.0 / float(textureSize.x);
	bool lfound = false;
	bool rfound = false;
	for (int i = 0; i < antialiasDistance; i++) {
		if (!lfound) {
			lcoord.x -= offset;
			lfound = (texture2D(edgeTexture, lcoord).r < edgeThreshold);
		}
		if (!rfound) {
			rcoord.x += offset;
			rfound = (texture2D(edgeTexture, rcoord).r < edgeThreshold);
		}
		if (rfound && lfound) {
			break;
		}
	}
	float len = (rcoord.x - lcoord.x - offset);
	float weighting = (gl_FragCoord.x / float(textureSize.x) - lcoord.x) / len;
	float ldepth = unpack(texture2D(depthTexture, lcoord));
	float rdepth = unpack(texture2D(depthTexture, rcoord));
	vec4 lcolour;
	vec4 rcolour;
	if (ldepth < 1.0) {
		lcolour = edgeColour;
	} else {
		lcolour = outlineColour;
	}
	if (rdepth < 1.0) {
		rcolour = edgeColour;
	} else {
		rcolour = outlineColour;
	}
	vec4 colour = texture2D(phongTexture, coord);
	float w = sin(weighting * 3.14159265359);
	if (weighting < 0.5) {
		return (lcolour * (1.0 - w) + midColour * w) * clamp((colour + colour.a), 0.0, 1.0);
	} else {
		return (rcolour * (1.0 - w) + midColour * w) * clamp((colour + colour.a), 0.0, 1.0);
	}
}

vec4 antialiasVertical() {
	vec2 coord = gl_FragCoord.xy / vec2(textureSize);
	vec2 dcoord = coord;
	vec2 ucoord = coord;
	float offset = 1.0 / float(textureSize.y);
	bool dfound = false;
	bool ufound = false;
	for (int i = 0; i < antialiasDistance; i++) {
		if (!dfound) {
			dcoord.y -= offset;
			dfound = (texture2D(edgeTexture, dcoord).r < edgeThreshold);
		}
		if (!ufound) {
			ucoord.y += offset;
			ufound = (texture2D(edgeTexture, ucoord).r < edgeThreshold);
		}
		if (dfound && ufound) {
			break;
		}
	}
	float len = (ucoord.y - dcoord.y - offset);
	float weighting = (gl_FragCoord.y / float(textureSize.y) - dcoord.y) / len;
	float ddepth = unpack(texture2D(depthTexture, dcoord));
	float udepth = unpack(texture2D(depthTexture, ucoord));
	vec4 dcolour;
	vec4 ucolour;
	if (ddepth < 1.0) {
		dcolour = edgeColour;
	} else {
		dcolour = outlineColour;
	}
	if (udepth < 1.0) {
		ucolour = edgeColour;
	} else {
		ucolour = outlineColour;
	}
	vec4 colour = texture2D(phongTexture, coord);
	if (weighting < 0.5) {
		return (dcolour * (0.5 - weighting) * 2.0 + midColour * weighting * 2.0) * clamp((colour + colour.a), 0.0, 1.0);
	} else {
		return (ucolour * (weighting - 0.5) * 2.0 + midColour * (1.0 - weighting) * 2.0) * clamp((colour + colour.a), 0.0, 1.0);
	}
}

vec4 antialias() {
	float leftIntensity = texture2D(edgeTexture, (gl_FragCoord.xy - vec2(1.0, 0.0)) / vec2(textureSize)).r;
	float rightIntensity = texture2D(edgeTexture, (gl_FragCoord.xy + vec2(1.0, 0.0)) / vec2(textureSize)).r;
	float downIntensity = texture2D(edgeTexture, (gl_FragCoord.xy - vec2(0.0, 1.0)) / vec2(textureSize)).r;
	float upIntensity = texture2D(edgeTexture, (gl_FragCoord.xy + vec2(0.0, 1.0)) / vec2(textureSize)).r;
	if ((leftIntensity + rightIntensity) > (downIntensity + upIntensity)) {
		return antialiasHorizontal();
	} else {
		return antialiasVertical();
	}
}

vec2 rgbToCoords(vec3 rgb) {
	float rows = pow(2.0, float(conversionBits) / 2.0);
	float maxValue = pow(2.0, float(conversionBits)) - 1.0;
	float conversionTextureSize = pow(2.0, float(conversionBits) * 1.5);
	rgb = rgb * maxValue;
	float cellNumber = floor(rgb.b);
	vec2 coords = vec2(mod(cellNumber, rows), floor(cellNumber / rows)) * (maxValue + 1.0);
	coords += rgb.rg;
	return coords / conversionTextureSize;
}

vec4 getMatchingColour(vec4 colour) {
	return texture2D(conversionTexture, rgbToCoords(clamp(colour, 0.0, 1.0).rgb));
}

vec4 getPhongColour(vec2 coord) {
	vec4 c = texture2D(phongTexture, coord);
	c += vec4(vec3(c.a), 1.0);
	return clamp(c, 0.0, 1.0);
}

vec4 getEdgeColour(vec4 colour) {
	vec2 coord = gl_FragCoord.xy / vec2(textureSize);
	vec2 lcoord = coord - vec2(1.0 / float(textureSize.x), 0.0);
	vec2 rcoord = coord + vec2(1.0 / float(textureSize.x), 0.0);
	vec2 dcoord = coord - vec2(0.0, 1.0 / float(textureSize.y));
	vec2 ucoord = coord + vec2(0.0, 1.0 / float(textureSize.y));
	float ll = 100.0;
	if (texture2D(edgeTexture, lcoord).r < edgeThreshold && unpack(texture2D(depthTexture, lcoord)) < 1.0) {
		ll = srgbToCielab(getMatchingColour(getPhongColour(lcoord)).rgb).x;
	}
	float rl = 100.0;
	if (texture2D(edgeTexture, rcoord).r < edgeThreshold && unpack(texture2D(depthTexture, rcoord)) < 1.0) {
		rl = srgbToCielab(getMatchingColour(getPhongColour(rcoord)).rgb).x;
	}
	float dl = 100.0;
	if (texture2D(edgeTexture, dcoord).r < edgeThreshold && unpack(texture2D(depthTexture, dcoord)) < 1.0) {
		dl = srgbToCielab(getMatchingColour(getPhongColour(dcoord)).rgb).x;
	}
	float ul = 100.0;
	if (texture2D(edgeTexture, ucoord).r < edgeThreshold && unpack(texture2D(depthTexture, ucoord)) < 1.0) {
		ul = srgbToCielab(getMatchingColour(getPhongColour(lcoord)).rgb).x;
	}
	vec4 paletteColour = getMatchingColour(colour);
	float l = srgbToCielab(paletteColour.rgb).x + minEdgeLDifference;
	if (l >= ll || l >= rl || l >= dl || l >= ul) {
		for (int i = 0; i < 10; i++) {
			colour = colour * vec4(0.9, 0.9, 0.9, 1.0);
			paletteColour = getMatchingColour(colour);
			l = srgbToCielab(paletteColour.rgb).x + minEdgeLDifference;
			if (l < ll && l < rl && l < dl && l < ul) {
				break;
			}
		}
	}
	return paletteColour;
}

void main(void) {
	vec4 fragColour = texture2D(phongTexture, gl_FragCoord.xy / vec2(textureSize));
	float specularFactor = fragColour.a;
	float edgeIntensity = texture2D(edgeTexture, gl_FragCoord.xy / vec2(textureSize)).r;
	if (edgeIntensity > edgeThreshold) {
		fragColour = antialias();
		gl_FragColor = getEdgeColour(fragColour);
	} else {
		fragColour = fragColour + vec4(vec3(specularFactor), 1.0);
		gl_FragColor = getMatchingColour(fragColour);
	}
}