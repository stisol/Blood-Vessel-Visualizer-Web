#version 300 es

layout(location=0) in vec3 aVertexPosition;
in vec2 aTextureCoord;

uniform mat4 uProjectionMatrix;

out vec3 position;
out vec2 texCoord;

void main() {
    vec4 pos = uProjectionMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    gl_Position = pos + vec4(aVertexPosition/10.0, 1.0);
    position = gl_Position.xyz;
    texCoord = aTextureCoord;
}