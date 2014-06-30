precision mediump float;
varying vec3 varNormal;
varying vec3 eyeVec;
varying vec2 varTexCoord;
uniform sampler2D texture;
const float ditherFactor = 0.0;

float specularReflection(vec3 normal, vec3 lightDir, float roughness) {
	vec3 reflectionVector = -2.0 * normal * dot(normal, lightDir) + lightDir;
	return max(pow(dot(reflectionVector, normalize(eyeVec)), roughness), 0.0);
}

float diffuseLighting(vec3 normal, vec3 lightDir) {
	return max(dot(normal, lightDir), 0.0);
}

void main(void) {
	vec3 normal = normalize(varNormal);
	vec4 fragColour;
	float diffuseFactor = diffuseLighting(normal, normalize(vec3(-0.4, 1.0, 1.5))); // vec3(0.57735, 0.57735, 0.57735) is the normalised vector with equal positive x,y,z components
	// LET'S DITHER SOME THINGS
	diffuseFactor += (mod(gl_FragCoord[0] + gl_FragCoord[1], 2.0)) * ditherFactor * 2.0 - ditherFactor;
	// possible more advanced dithering?
	//fragColour += floor((mod(gl_FragCoord[0], 2.0) + mod(gl_FragCoord[1], 2.0)) / 2.0) * ditherFactor / 2.0;
	//fragColour += floor((mod(gl_FragCoord[0] + 1.0, 2.0) + mod(gl_FragCoord[1], 2.0)) / 2.0) * -ditherFactor / 2.0;
	//fragColour -= floor((2.0 - (mod(gl_FragCoord[0], 2.0) + mod(gl_FragCoord[1], 2.0))) / 2.0) * ditherFactor;
	// TODO: pass these values in as uniforms
	if (diffuseFactor > 0.8) {
		diffuseFactor = 1.0;
	} else if (diffuseFactor > 0.4) {
		diffuseFactor = 0.8;
	} else {
		diffuseFactor = 0.4;
	}
	float specularFactor = specularReflection(normal, vec3(0.57735), 5.0) * 0.0;
	vec3 diffuseLighting = vec3(0.7, 0.7, 0.7) * diffuseFactor;
	vec3 ambientLighting = vec3(0.3, 0.3, 0.3);
	gl_FragColor = vec4((texture2D(texture, varTexCoord) * vec4(min(ambientLighting + diffuseLighting, 1.0), 1.0)).xyz, specularFactor);
}