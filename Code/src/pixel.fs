precision highp float;
varying vec2 varTexCoord;
uniform sampler2D paletteMap;

uniform sampler2D phongTexture;
uniform sampler2D edgeTexture;
uniform sampler2D depthTexture;
uniform sampler2D conversionTexture;
uniform ivec2 textureSize;

const int conversionBits = 8;
const float ditherFactor = 0.06;
const float antialiasThreshold = 0.1;
const int antialiasDistance = 16;
const vec4 outlineColour = vec4(0.3, 0.3, 0.3, 1.0);
const vec4 edgeColour = vec4(0.6, 0.6, 0.6, 1.0);

float unpack(vec4 pack) {
	const vec4 shifts = vec4(1.0 / (256.0 * 256.0 * 256.0), 1.0 / (256.0 * 256.0), 1.0 / 256.0, 1.0);
	return dot(pack, shifts);
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
	return (lcolour * (1.0 - weighting) + rcolour * weighting) * clamp((colour + colour.a), 0.0, 1.0);
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
	return (dcolour * (1.0 - weighting) + ucolour * weighting) * clamp((colour + colour.a), 0.0, 1.0);
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

void main(void) {
	vec4 fragColour = texture2D(phongTexture, gl_FragCoord.xy / vec2(textureSize));
	float specularFactor = fragColour.a;
	float edgeIntensity = texture2D(edgeTexture, gl_FragCoord.xy / vec2(textureSize)).r;
	if (edgeIntensity > antialiasThreshold) {
		if (specularFactor > 1.0) {
			fragColour = fragColour * (1.0 - edgeIntensity) + edgeColour * edgeIntensity;
		} else {
			fragColour = fragColour * (1.0 - edgeIntensity) + antialias() * edgeIntensity;
			}
		//fragColour = antialias();
	} else {
		fragColour = fragColour + vec4(vec3(specularFactor), 1.0);
	}
	fragColour.a = 1.0;
	// LET'S DITHER SOME THINGS
	//fragColour += (mod(gl_FragCoord[0] + gl_FragCoord[1], 2.0)) * ditherFactor * 2.0 - ditherFactor;
	//fragColour += floor((mod(gl_FragCoord[0], 2.0) + mod(gl_FragCoord[1], 2.0)) / 2.0) * ditherFactor / 2.0;
	//fragColour += floor((mod(gl_FragCoord[0] + 1.0, 2.0) + mod(gl_FragCoord[1], 2.0)) / 2.0) * -ditherFactor / 2.0;
	//fragColour -= floor((2.0 - (mod(gl_FragCoord[0], 2.0) + mod(gl_FragCoord[1], 2.0))) / 2.0) * ditherFactor;
	//vec2 paletteMapIndex = vec2(floor(fragColour.r * 255.0) * 16.0 + floor(fragColour.g * 16.0), floor(fragColour.b * 255.0) * 16.0 + floor(mod(fragColour.g * 255.0, 16.0)));
	gl_FragColor = getMatchingColour(fragColour);//texture2D(paletteMap, paletteMapIndex);
	//gl_FragColor = fragColour;
}