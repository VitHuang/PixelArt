precision mediump float;
uniform sampler2D inputImage;
uniform ivec2 imageSize;

varying vec2 varTexCoord;

float unpack(vec4 pack) {
	const vec4 shifts = vec4(1.0 / (256.0 * 256.0 * 256.0), 1.0 / (256.0 * 256.0), 1.0 / 256.0, 1.0);
	return dot(pack, shifts);
}

float get(vec2 offset) {
	return unpack(texture2D(inputImage, varTexCoord + offset));
}

void main() {
	vec2 pixelOffset = 1.0 / vec2(imageSize);
	float horizontal = 0.09375 * get(vec2(-pixelOffset.x,  -pixelOffset.y)) +
		 0.3125  * get(vec2(0.0,  -pixelOffset.y)) +
		 0.09375 * get(vec2(pixelOffset.x,  -pixelOffset.y)) +
		-0.09375 * get(vec2(-pixelOffset.x,  pixelOffset.y)) +
		-0.3125  * get(vec2(0.0,  pixelOffset.y)) +
		-0.09375 * get(vec2(pixelOffset.x,  pixelOffset.y));
	float vertical = 0.09375 * get(vec2(-pixelOffset.x,  -pixelOffset.y)) +
		 0.3125  * get(vec2(-pixelOffset.x, 0.0)) +
		 0.09375 * get(vec2(-pixelOffset.x,  pixelOffset.y)) +
		-0.09375 * get(vec2(pixelOffset.x,  -pixelOffset.y)) +
		-0.3125  * get(vec2(pixelOffset.x, 0.0)) +
		-0.09375 * get(vec2(pixelOffset.x,  pixelOffset.y));
	horizontal = (1.0 + horizontal) / 2.0;
	vertical = (1.0 + vertical) / 2.0;
	gl_FragColor = vec4(fract(horizontal * 256.0), horizontal, fract(vertical * 256.0), vertical);
}