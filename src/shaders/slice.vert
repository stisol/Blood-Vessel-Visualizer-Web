#version 300 es

uniform mat4 uProjectionMatrix;
layout(location=0) in vec3 aVertexPosition;
in vec2 aTextureCoord;
out vec2 texCoord;
out float zDepth;

void main() {
    vec4 pos = uProjectionMatrix * vec4(aVertexPosition, 1.0);
    gl_Position = pos;
    zDepth = pos.z;
    texCoord = aTextureCoord;
}
