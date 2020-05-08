#version 300 es

layout(location=0) in vec3 aVertexPosition;
in vec2 aTextureCoord;

out vec3 position;
out vec2 texCoord;

uniform mat4 uTransform;

void main() {

    gl_Position = uTransform * vec4(aVertexPosition, 1.0);
    position = gl_Position.xyz;
    texCoord = aTextureCoord;
}