precision mediump float;
uniform sampler2D depthTexture;
uniform sampler2D normalTexture;
uniform ivec2 textureSize;

varying vec2 varTexCoord;

const float threshold = 0.05;

vec2 gradientOf(vec4 texel) {
	return (vec2(texel.r / 256.0 + texel.g, texel.b / 256.0 + texel.a) * 2.0) - 1.0;
}

bool isOnEdge(sampler2D image) {
	vec2 pixelOffset = 1.0 / vec2(textureSize);
	float left = varTexCoord.x - pixelOffset.x;
	float right = varTexCoord.x + pixelOffset.x;
	float down = varTexCoord.y - pixelOffset.y;
	float up = varTexCoord.y + pixelOffset.y;
	vec4 inTexel = texture2D(image, varTexCoord);
	bool onEdge = false;
	vec2 gradient = gradientOf(inTexel);
	float direction = atan(gradient.y, gradient.x);
	if (direction < 0.0) {
		direction += 3.14159;
	}
	float magnitude = length(gradient);
	if (magnitude >= threshold) {
		if (direction < 0.39270 || direction > 2.74889) {
			// |
			vec4 downTexel = texture2D(image, vec2(varTexCoord.x, down));
			vec4 upTexel = texture2D(image, vec2(varTexCoord.x, up));
			float downMagnitude = length(gradientOf(downTexel));
			float upMagnitude = length(gradientOf(upTexel));
			if (magnitude > downMagnitude && magnitude >= upMagnitude) {
				onEdge = true;
			}
		} else if (direction < 1.17810) {
			// \
			vec4 downLeftTexel = texture2D(image, vec2(left, down));
			vec4 upRightTexel = texture2D(image, vec2(right, up));
			float downLeftMagnitude = length(gradientOf(downLeftTexel));
			float upRightMagnitude = length(gradientOf(upRightTexel));
			if (magnitude > downLeftMagnitude && magnitude >= upRightMagnitude) {
				onEdge = true;
			}
		} else if (direction < 1.96350) {
			// -
			vec4 leftTexel = texture2D(image, vec2(left, varTexCoord.y));
			vec4 rightTexel = texture2D(image, vec2(right, varTexCoord.y));
			float leftMagnitude = length(gradientOf(leftTexel));
			float rightMagnitude = length(gradientOf(rightTexel));
			if (magnitude >= leftMagnitude && magnitude > rightMagnitude) {
				onEdge = true;
			}
		} else {
			// /
			vec4 downRightTexel = texture2D(image, vec2(right, down));
			vec4 upLeftTexel = texture2D(image, vec2(left, up));
			float downRightMagnitude = length(gradientOf(downRightTexel));
			float upLeftMagnitude = length(gradientOf(upLeftTexel));
			if (magnitude > downRightMagnitude && magnitude >= upLeftMagnitude) {
				onEdge = true;
			}
		}
	}
	return onEdge;
}

void main() {
	bool onEdge = isOnEdge(depthTexture);// || isOnEdge(normalTexture);
	if (onEdge) {
		gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
	} else {
		gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
	}
	//gl_FragColor = vec4(gradientOf(texture2D(depthTexture, varTexCoord)) / 2.0 + 0.5, 0.0, 1.0);
}