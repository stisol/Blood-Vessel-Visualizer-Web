#version 300 es

precision highp float;
precision highp int;
precision highp sampler3D;

in vec3 position;
in vec2 texCoord;
in vec3 vnormal;

out lowp vec4 color;

uniform vec3 uLightPosition;

void main() {
    vec3 normal = normalize(vnormal);
    float diff = max(dot(normal, uLightPosition), 0.0);
    color = vec4(vec3(1.0) * (diff + 0.25), 1.0);
    //gl_FragDepth = position.z / 40.0;
}