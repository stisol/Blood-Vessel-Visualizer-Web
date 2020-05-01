#version 300 es

precision highp float;
precision highp int;
precision highp sampler3D;

in vec2 texCoord;
out lowp vec4 color;

uniform vec3 borderColor;
uniform sampler2D textureData;
//uniform sampler2D uTransferFunction;

void main() {
    if (texCoord.x <= 0.005 || texCoord.y <= 0.005 || texCoord.x >= 0.995 || texCoord.y >= 0.995) {
        color = vec4(borderColor, 1.0);
    } else {
        float v = texture(textureData, texCoord).r;
        color = vec4(v, v, v, 1.0);
    }
	gl_FragDepth = 0.0;
}
