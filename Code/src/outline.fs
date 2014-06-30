precision mediump float;
uniform sampler2D depthTexture;
uniform sampler2D normalTexture;
uniform ivec2 textureSize;

varying vec2 varTexCoord;

const float normalThreshold = 1.0;
const float maxNormalDifference = 1.5;
const float minDepthThreshold = 0.01;
const float depthFactor = 5.0;

float unpack(vec4 pack) {
	const vec4 shifts = vec4(1.0 / (256.0 * 256.0 * 256.0), 1.0 / (256.0 * 256.0), 1.0 / 256.0, 1.0);
	return dot(pack, shifts);
}

vec3 normalAt(vec2 coord) {
	return texture2D(normalTexture, coord).xyz * 2.0 - 1.0;
}

float depthAt(vec2 coord) {
	return unpack(texture2D(depthTexture, coord));
}

float sobelIntensity() {
	vec2 pixelOffset = 1.0 / vec2(textureSize);
	vec2 rightCoord = vec2(varTexCoord.x + pixelOffset.x, varTexCoord.y);
	vec2 leftCoord = vec2(varTexCoord.x - pixelOffset.x, varTexCoord.y);
	vec2 upCoord = vec2(varTexCoord.x, varTexCoord.y + pixelOffset.y);
	vec2 downCoord = vec2(varTexCoord.x, varTexCoord.y - pixelOffset.y);
	vec2 upRightCoord = vec2(varTexCoord.x + pixelOffset.x, varTexCoord.y + pixelOffset.y);
	vec2 upLeftCoord = vec2(varTexCoord.x - pixelOffset.x, varTexCoord.y + pixelOffset.y);
	vec2 downRightCoord = vec2(varTexCoord.x + pixelOffset.x, varTexCoord.y - pixelOffset.y);
	vec2 downLeftCoord = vec2(varTexCoord.x - pixelOffset.x, varTexCoord.y - pixelOffset.y);
	float horizontalDepth = - depthAt(upLeftCoord) + depthAt(upRightCoord) - 2.0 * depthAt(leftCoord) + 2.0 * depthAt(rightCoord) - depthAt(downLeftCoord) + depthAt(downRightCoord);
	float verticalDepth = depthAt(upLeftCoord) + 2.0 * depthAt(upCoord) + depthAt(upRightCoord) - depthAt(downLeftCoord) - 2.0 * depthAt(downCoord) - depthAt(downRightCoord);
	float depthIntensity = sqrt(horizontalDepth * horizontalDepth + verticalDepth * verticalDepth);
	vec3 horizontalNormal = - normalAt(upLeftCoord) + normalAt(upRightCoord) - 2.0 * normalAt(leftCoord) + 2.0 * normalAt(rightCoord) - normalAt(downLeftCoord) + normalAt(downRightCoord);
	vec3 verticalNormal = normalAt(upLeftCoord) + 2.0 * normalAt(upCoord) + normalAt(upRightCoord) - normalAt(downLeftCoord) - 2.0 * normalAt(downCoord) - normalAt(downRightCoord);
	float normalIntensity = sqrt(length(horizontalNormal) * length(horizontalNormal) + length(verticalNormal) + length(verticalNormal));
	return max(depthIntensity, normalIntensity);
}

float edgeIntensity(vec3 normal, float depth, vec2 other) {
	float depthDistance = distance(depth, depthAt(other));
	bool onEdge = false;
	// compute normal distance based on angle rather than directly taking the vector distance
	float cosd = dot(normal, normalAt(other));
	float normalDistance = acos(cosd);
	if (depthDistance > minDepthThreshold) {
		onEdge = depth < depthAt(other);
	} else if (normalDistance > normalThreshold) {
		onEdge = normal.z < normalAt(other).z;
	}
	if (onEdge) {
		if (depthAt(other) >= 1.0) {
			return 1.0;
		}
		if (normalDistance > normalThreshold) {
			if (normalDistance > maxNormalDifference) {
				normalDistance = maxNormalDifference;
			}
			float x = (normalDistance - normalThreshold) / (maxNormalDifference - normalThreshold) + depthDistance * depthFactor;
			return x;
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