import View from '../view';
import RenderTarget from '../renderTarget';
import Settings from '../settings';
import { mat4 } from 'gl-matrix';
import Camera from '../camera';
import Mesh from '../mesh';
import squareMeshForSlice from '../meshes/squareMeshForSlice';
import vert from "../shaders/slice.vert";
import frag from "../shaders/slice.frag";
import { initShaderProgram, LoadedTextureData } from '../shader';
import TransferFunctionController from '../transferFunction';

export default class SliceView implements View {
    private gl: WebGL2RenderingContext;
    private renderTarget: RenderTarget;
    private programInfo: ProgramInfo;
    // private transferFunction: TransferFunctionController;
    // private transferFunctionTexture: WebGLTexture;
    private volumeData: LoadedTextureData;
    private mesh: Mesh = squareMeshForSlice();
    private projectionMatrix: mat4 = mat4.create();
    private dataTexture: WebGLTexture;

    public constructor(
        gl: WebGL2RenderingContext,
        transferFunction: TransferFunctionController,
        renderTarget: RenderTarget,
        volumeData: LoadedTextureData) {
        this.gl = gl;
        this.renderTarget = renderTarget;
        this.volumeData = volumeData;

        // this.transferFunction = transferFunction;
        // this.transferFunctionTexture = gl.createTexture() as WebGLTexture;
        this.dataTexture = gl.createTexture() as WebGLTexture;

        const shaderProgram = initShaderProgram(gl, vert, frag);
        this.programInfo = new ProgramInfo(gl, shaderProgram);
    }

    render(aspect: number, camera: Camera, settings: Settings, settingsUpdated: boolean): void {
        const gl = this.gl;
        //if(settingsUpdated || this.transferFunction.transferFunctionUpdated) {
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.viewport(0, 0, this.renderTarget.getWidth(), this.renderTarget.getHeight());
        gl.useProgram(this.programInfo.program);

        mat4.ortho(this.projectionMatrix, -1.0 * aspect, 1.0, -1.0 / aspect, 1.0, 0.0, 50.0);

        // Check for transfer function update
        // const tf = this.transferFunction;
        // if (tf.transferFunctionUpdated) {
        //     const tex = tf.getTransferFunctionTexture();
        //     gl.activeTexture(gl.TEXTURE2);
        //     gl.bindTexture(gl.TEXTURE_2D, this.transferFunctionTexture);
        //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        //     gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, tex);
        // }
        // else {
        //     gl.activeTexture(gl.TEXTURE2);
        //     gl.bindTexture(gl.TEXTURE_2D, this.transferFunctionTexture);
        // }
        //gl.uniform1i(this.programInfo.uniformLocations.transferFunction, 2);

        // Upload slice data;
        const z = Math.floor(this.volumeData.depth * settings.skinOpacity());
        const sliceSize = this.volumeData.width * this.volumeData.height;
        const data = this.volumeData.data.slice(z * sliceSize, (z + 1) * sliceSize);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, this.dataTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.R16F,
            this.volumeData.width,
            this.volumeData.height,
            0,
            gl.RED,
            gl.FLOAT,
            data
        );

        gl.uniform1i(this.programInfo.uniformLocations.textureData, 3);

        gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, this.projectionMatrix);

        this.mesh.bindShader(gl, this.programInfo.program);
        gl.drawElements(gl.TRIANGLES, this.mesh.indiceCount(), gl.UNSIGNED_SHORT, 0);

        //}
    }

    getRenderTarget(): RenderTarget {
        return this.renderTarget;
    }
}

class ProgramInfo {
    program: WebGLShader;
    uniformLocations: UniformLocations;

    constructor(gl: WebGL2RenderingContext, program: WebGLShader) {
        this.program = program;
        this.uniformLocations = new UniformLocations(gl, program);
    }
}

class UniformLocations {
    projectionMatrix: WebGLUniformLocation;
    //transferFunction: WebGLUniformLocation;
    textureData: WebGLUniformLocation;

    constructor(gl: WebGL2RenderingContext, shaderProgram: WebGLShader) {
        this.projectionMatrix =
            gl.getUniformLocation(shaderProgram, "uProjectionMatrix") as WebGLUniformLocation;
        //this.transferFunction =
        //    gl.getUniformLocation(shaderProgram, "uTransferFunction") as WebGLUniformLocation;
        this.textureData =
            gl.getUniformLocation(shaderProgram, "textureData") as WebGLUniformLocation;
    }
}