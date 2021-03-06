#version 300 es

precision highp float;
precision highp int;
precision highp sampler3D;

in vec3 position;
in vec2 texCoord;

out lowp vec4 color;

uniform sampler2D textureData;
uniform bool disabledTexture;

void main() {
    color = vec4(1.0);
    if(!disabledTexture) {
        color *= texture(textureData, texCoord);
    }
}