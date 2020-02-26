#version 300 es

layout(location=0) in vec3 aVertexPosition;
in vec4 aColorPosition;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

out vec3 vray_dir;
flat out vec3 transformed_eye;

void main() {

    vec3 eye_pos = vec3(0.5, 0.5, -3.0);
    vec3 volume_scale = vec3(1.0);

    vec3 volume_translation = vec3(0.5) - volume_scale * 0.5;
    gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aVertexPosition, 1.0);

    transformed_eye = (eye_pos - volume_translation) / volume_scale;
    vray_dir = aVertexPosition - transformed_eye;

    /*vec3 pos = vec3(aVertexPosition, 0.0);
    vec3 volume_scale = vec3(1.0);
	vec3 volume_translation = vec3(0.5) - volume_scale * 0.5;
    vec3 eye_pos = vec3(0.0);
	gl_Position = vec4(aVertexPosition, 0.0, 1.0);
    
    transformed_eye = (eye_pos - volume_translation) / volume_scale;
	vray_dir = pos - transformed_eye;*/
}