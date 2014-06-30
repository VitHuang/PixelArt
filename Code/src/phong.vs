attribute vec3 vertexPosition;
attribute vec3 vertexNormal;
attribute vec2 texCoord;
attribute vec2 featureSize;

uniform mat4 pMatrix;
uniform mat4 mvMatrix;
uniform mat3 nMatrix;
uniform ivec2 viewportSize;
//uniform float fovy;

varying vec3 varNormal;
varying vec2 varTexCoord;
varying vec3 eyeVec;

void main(void) {
		float fovy = 0.523598776;
        varNormal = normalize(nMatrix * vertexNormal);
		vec4 cameraSpace = mvMatrix * vec4(vertexPosition, 1.0);
        vec4 screenSpace = pMatrix * cameraSpace;
		
		// TODO: iron out bugs - theory is sound, but implementation needs work
		
		/*vec2 size = featureSize.x / (tan(fovy / 2.0) * -cameraSpace.z) * vec2(viewportSize / 2);
		float minDimension = min(size.x, size.y); // IN PIXELS
		if (minDimension < featureSize.y) {
			float pixelEnlargement = featureSize.y - minDimension;
			vec2 pixelNormal = varNormal.xy * vec2(viewportSize / 2);
			vec2 resizedNormal;
			if (size.x < size.y) {
				if (pixelNormal.x != 0.0) {
					resizedNormal = pixelEnlargement * vec2(1.0, pixelNormal.y / pixelNormal.x);
				} else {
					resizedNormal = pixelEnlargement * vec2(0.0, sign(pixelNormal.y));
				}
			} else {
				if (pixelNormal.y != 0.0) {
					resizedNormal = pixelEnlargement * vec2(pixelNormal.x / pixelNormal.y, 1.0);
				} else {
					resizedNormal = pixelEnlargement * vec2(sign(pixelNormal.x), 0.0);
				}
			}
			gl_Position = screenSpace + vec4((resizedNormal / vec2(viewportSize / 2)), 0.0, 0.0);
		} else {
			gl_Position = screenSpace;
		}*/
		gl_Position = screenSpace;
        varTexCoord = texCoord;
        eyeVec = (mvMatrix * vec4(vertexPosition, 1.0)).xyz;
}