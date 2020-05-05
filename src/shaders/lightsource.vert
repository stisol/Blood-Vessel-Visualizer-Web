#version 300 es

layout(location=0) in vec3 aVertexPosition;
in vec2 aTextureCoord;

uniform mat4 uProjectionMatrix;
uniform vec3 uLightPosition;

out vec3 position;
out vec2 texCoord;

void main() {
    gl_Position = uProjectionMatrix * vec4(uLightPosition + aVertexPosition, 1.0);
    position = gl_Position.xyz / gl_Position.w;
    texCoord = aTextureCoord;
}