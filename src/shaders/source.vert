#version 300 es

layout(location=0) in vec3 aVertexPosition;
in vec4 aColorPosition;

uniform mat4 uLightMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uScaleMatrix;
uniform vec3 uEyePosition;

out vec3 vray_dir;
out vec4 position;
out float depth;
out vec2 screen_tex_coords;
flat out vec3 transformed_eye;

void main() {

    gl_Position = uProjectionMatrix * uScaleMatrix * vec4(aVertexPosition, 1.0);
    position = gl_Position;
    depth = gl_Position.z / gl_Position.w;

    vec4 test = uProjectionMatrix * vec4(aVertexPosition, 1.0);
    vec3 ndc = test.xyz / test.w;

    screen_tex_coords = clamp(ndc.xy * 0.5 + 0.5, vec2(0.0), vec2(1.0));
    transformed_eye = uEyePosition;
    vray_dir = (uScaleMatrix * vec4(aVertexPosition, 1.0)).xyz - transformed_eye;

}