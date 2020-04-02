#version 300 es

layout(location=0) in vec3 aVertexPosition;

uniform mat4 uProjectionMatrix;

out vec3 position;

void main() {

    gl_Position = uProjectionMatrix * vec4(aVertexPosition, 1.0);
    position = gl_Position.xyz;
}