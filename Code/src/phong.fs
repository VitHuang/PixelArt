precision mediump float;
varying vec3 varNormal;
varying vec3 eyeVec;
varying vec2 varTexCoord;
uniform sampler2D texture;

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
	float diffuseFactor = diffuseLighting(normal, vec3(0.57735)); // vec3(0.57735, 0.57735, 0.57735) is the normalised vector with equal positive x,y,z components
	float specularFactor = specularReflection(normal, vec3(0.57735), 5.0);
	vec3 diffuseLighting = vec3(1.0, 1.0, 1.0) * diffuseFactor;
	vec3 ambientLighting = vec3(0.5, 0.5, 0.5);
	gl_FragColor = vec4((texture2D(texture, varTexCoord) * vec4(ambientLighting + diffuseLighting, 1.0)).xyz, specularFactor);
}