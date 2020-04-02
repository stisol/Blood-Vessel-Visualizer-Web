#version 300 es

precision highp float;
precision highp int;
precision highp sampler3D;

in vec3 position;

out lowp vec4 color;

void main() {
    color = vec4(1.0, 0.0, 0.0, 1.0);
    //gl_FragDepth = position.z / 40.0;
}