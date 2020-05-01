#version 300 es

uniform mat4 uProjectionMatrix;
layout(location=0) in vec3 aVertexPosition;
in vec2 aTextureCoord;
out vec2 texCoord;

void main() {
    gl_Position = uProjectionMatrix * vec4(aVertexPosition, 1.0);
    texCoord = aTextureCoord;
}
