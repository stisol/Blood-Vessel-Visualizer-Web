#version 300 es

layout(location=0) in vec3 aVertexPosition;
in vec2 aTextureCoord;
in vec3 aNormalPosition;

uniform mat4 uProjectionMatrix;

out vec3 position;
out vec2 texCoord;
out vec3 vnormal;

void main() {

    gl_Position = uProjectionMatrix * vec4(aVertexPosition, 1.0);
    position = gl_Position.xyz;
    texCoord = aTextureCoord;
    vnormal = aNormalPosition;
}