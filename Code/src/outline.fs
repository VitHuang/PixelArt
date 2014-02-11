precision mediump float;
uniform sampler2D depthTexture;
uniform sampler2D directedNormalTexture;
uniform ivec2 textureSize;

varying vec2 varTexCoord;

const float normalThreshold = 0.1;
const float minDepthThreshold = 0.01;
const float depthFactor = 5.0;

float unpack(vec4 pack) {
	const vec4 shifts = vec4(1.0 / (256.0 * 256.0 * 256.0), 1.0 / (256.0 * 256.0), 1.0 / 256.0, 1.0);
	return dot(pack, shifts);
}

vec3 normalAt(vec2 coord) {
	return texture2D(directedNormalTexture, coord).xyz;
}

float depthAt(vec2 coord) {
	return unpack(texture2D(depthTexture, coord));
}

float edgeIntensity(vec3 normal, float depth, vec2 other) {
	float depthDistance = distance(depth, depthAt(other));
	bool onEdge = false;
	if (depthDistance > minDepthThreshold) {
		onEdge = depth < depthAt(other);
	} else {
		onEdge = normal.z < normalAt(other).z;
	}
	if (onEdge) {
		if (depthAt(other) >= 1.0) {
			return 1.0;
		}
		float normalDistance = distance(normal, normalAt(other));
		if (normalDistance > normalThreshold) {
			float x = (normalDistance - normalThreshold) / (1.0 - normalThreshold) + depthDistance * depthFactor;
			return x;//1.0 - ((1.0 - x) * (1.0 - x));
		} else {
			return depthDistance * depthFactor;
		}
	} else {
		return 0.0;
	}
}

void main() {
	vec2 pixelOffset = 1.0 / vec2(textureSize);
	vec3 normal = normalAt(varTexCoord);
	float depth = depthAt(varTexCoord);
	vec2 rightCoord = vec2(varTexCoord.x + pixelOffset.x, varTexCoord.y);
	vec2 leftCoord = vec2(varTexCoord.x - pixelOffset.x, varTexCoord.y);
	vec2 upCoord = vec2(varTexCoord.x, varTexCoord.y + pixelOffset.y);
	vec2 downCoord = vec2(varTexCoord.x, varTexCoord.y - pixelOffset.y);
	float intensity = max(max(edgeIntensity(normal, depth, rightCoord), edgeIntensity(normal, depth, leftCoord)), max(edgeIntensity(normal, depth, upCoord), edgeIntensity(normal, depth, downCoord)));
	gl_FragColor = vec4(vec3(intensity), 1.0);
}