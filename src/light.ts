import Mesh from "./mesh";
import createSquareMesh from "./meshes/squareMesh";

import Sun from './resources/sun.png';
import viewVert from "./shaders/lightsource.vert";
import viewFrag from "./shaders/lightsource.frag";
import { initShaderProgram } from "./shader";
import { mat4 } from "gl-matrix";

export default class Light {
    private lightMesh: Mesh;
    private lightTexture: WebGLTexture;
    private shader: WebGLProgram;
    private gl: WebGL2RenderingContext;

    constructor(gl: WebGL2RenderingContext) {
        this.lightMesh = createSquareMesh();
        this.lightTexture = this.loadTexture(gl);
        
        const viewProgram = initShaderProgram(gl, viewVert, viewFrag);
        this.shader =  viewProgram;

        this.gl = gl;
    }

    private loadTexture(gl: WebGL2RenderingContext): WebGLTexture {
        const texture = gl.createTexture();
        if(texture == null) {
            throw "Failed to create texture for light sources";
        }
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,255,255]));

        const image = new Image();
        image.onload = (): void => {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.width, image.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        };

        image.src = Sun;

        return texture;
    }

    draw(transform: mat4): void {
        const gl = this.gl;
        gl.useProgram(this.shader);
        gl.uniformMatrix4fv(gl.getUniformLocation(this.shader, "uProjectionMatrix"), false, transform);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.lightTexture);
        this.lightMesh.bindShader(this.gl, this.shader);
        gl.drawElements(gl.TRIANGLES, this.lightMesh.indiceCount(), gl.UNSIGNED_SHORT, 0.0);
    }
}