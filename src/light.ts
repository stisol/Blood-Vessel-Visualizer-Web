import Mesh from "./mesh";
import createSquareMesh from "./meshes/squareMesh";

import viewVert from "./shaders/lightsource.vert";
import viewFrag from "./shaders/lightsource.frag";
import { initShaderProgram } from "./shader";
import { mat4, vec3 } from "gl-matrix";

export default class Light {
    private lightMesh: Mesh;
    private lightTexture: WebGLTexture;
    private shader: WebGLProgram;
    private gl: WebGL2RenderingContext;

    private lightUniform: WebGLUniformLocation;

    constructor(gl: WebGL2RenderingContext) {
        this.lightMesh = createSquareMesh(-0.1, 0.1);
        this.lightTexture = this.loadTexture(gl);
        
        const viewProgram = initShaderProgram(gl, viewVert, viewFrag);
        this.shader =  viewProgram;
        this.lightUniform = gl.getUniformLocation(viewProgram, "uLightPosition") as WebGLUniformLocation;

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

        image.src = " data:image/png;base64,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";

        return texture;
    }

draw(transform: mat4, position: vec3): void {
        const gl = this.gl;
        gl.useProgram(this.shader);
        gl.uniform3fv(this.lightUniform, position);
        gl.uniformMatrix4fv(gl.getUniformLocation(this.shader, "uProjectionMatrix"), false, transform);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.lightTexture);
        this.lightMesh.bindShader(this.gl, this.shader);
        gl.drawElements(gl.TRIANGLES, this.lightMesh.indiceCount(), gl.UNSIGNED_SHORT, 0.0);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }
}