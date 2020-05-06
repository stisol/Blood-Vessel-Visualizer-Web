#version 300 es

precision highp float;
precision highp int;
precision highp sampler3D;

in vec2 texCoord;
in float zDepth;
out lowp vec4 color;

uniform vec3 borderColor;
uniform sampler2D textureData;

void main() {
    if (texCoord.x <= 0.01 || texCoord.y <= 0.01 || texCoord.x >= 0.99 || texCoord.y >= 0.99) {
        color = vec4(borderColor, 1.0);
    } else {
        float v = texture(textureData, texCoord).r;
        color = vec4(v, v, v, 1.0);
    }
}
