import View from '../view';
import RenderTarget from '../renderTarget';
import Settings from '../settings';
import { mat4 } from 'gl-matrix';
import Camera from '../camera';
import Mesh from '../mesh';
import SliceMeshes from '../meshes/squareMeshForSlice';
import vert from "../shaders/slice.vert";
import frag from "../shaders/slice.frag";
import { initShaderProgram, LoadedTextureData } from '../shader';
import TransferFunctionController from '../transferFunction';

export default class SliceView implements View {
    private gl: WebGL2RenderingContext;
    private renderTarget: RenderTarget;
    private programInfo: ProgramInfo;
    private transferFunction: TransferFunctionController;
    // private transferFunctionTexture: WebGLTexture;
    private volumeData: LoadedTextureData;
    private mesh1: Mesh = SliceMeshes.mesh1();
    private mesh2: Mesh = SliceMeshes.mesh2();
    private mesh3: Mesh = SliceMeshes.mesh3();
    private projectionMatrix: mat4 = mat4.create();
    private dataTexture1: WebGLTexture;
    private dataTexture2: WebGLTexture;
    private dataTexture3: WebGLTexture;
    private texCache1: Float32Array = new Float32Array();
    private texCache2: Float32Array = new Float32Array();
    private texCache3: Float32Array = new Float32Array();

    public constructor(
        gl: WebGL2RenderingContext,
        transferFunction: TransferFunctionController,
        renderTarget: RenderTarget,
        volumeData: LoadedTextureData) {
        this.gl = gl;
        this.renderTarget = renderTarget;
        this.volumeData = volumeData;

        this.transferFunction = transferFunction;
        // this.transferFunctionTexture = gl.createTexture() as WebGLTexture;
        this.dataTexture1 = gl.createTexture() as WebGLTexture;
        this.dataTexture2 = gl.createTexture() as WebGLTexture;
        this.dataTexture3 = gl.createTexture() as WebGLTexture;

        const shaderProgram = initShaderProgram(gl, vert, frag);
        this.programInfo = new ProgramInfo(gl, shaderProgram);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

        gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, this.projectionMatrix);

        if (settingsUpdated /*|| this.transferFunction.transferFunctionUpdated*/) {
            const tempAxis = Math.max(0.01, Math.min(0.99, settings.skinOpacity()));
            this.cacheSlices(tempAxis, tempAxis, tempAxis);
        }

        gl.uniform1i(this.programInfo.uniformLocations.textureData, 3);
        gl.bindTexture(gl.TEXTURE_2D, this.dataTexture1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, this.volumeData.width,
            this.volumeData.height, 0, gl.RED, gl.FLOAT, this.texCache1);
        this.mesh1.bindShader(gl, this.programInfo.program);
        gl.drawElements(gl.TRIANGLES, this.mesh1.indiceCount(), gl.UNSIGNED_SHORT, 0);

        gl.bindTexture(gl.TEXTURE_2D, this.dataTexture2);
        gl.uniform1i(this.programInfo.uniformLocations.textureData, 4);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, this.volumeData.width,
            this.volumeData.depth, 0, gl.RED, gl.FLOAT, this.texCache2);
        this.mesh2.bindShader(gl, this.programInfo.program);
        gl.drawElements(gl.TRIANGLES, this.mesh2.indiceCount(), gl.UNSIGNED_SHORT, 0);

        gl.bindTexture(gl.TEXTURE_2D, this.dataTexture3);
        gl.uniform1i(this.programInfo.uniformLocations.textureData, 5);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, this.volumeData.height,
            this.volumeData.depth, 0, gl.RED, gl.FLOAT, this.texCache3);
        this.mesh3.bindShader(gl, this.programInfo.program);
        gl.drawElements(gl.TRIANGLES, this.mesh3.indiceCount(), gl.UNSIGNED_SHORT, 0);
    }

    private cacheSlices(depth: number, height: number, width: number): void {
        const gl = this.gl;
        { // Depth
            const z = Math.floor(this.volumeData.depth * depth);
            const sliceSize = this.volumeData.width * this.volumeData.height;
            this.texCache1 = this.volumeData.data.slice(z * sliceSize, (z + 1) * sliceSize);
            gl.activeTexture(gl.TEXTURE3);
            gl.bindTexture(gl.TEXTURE_2D, this.dataTexture1);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, this.volumeData.width,
                this.volumeData.height, 0, gl.RED, gl.FLOAT, this.texCache1);
        }
        { // Height
            const offset = Math.floor(this.volumeData.height * height);
            const hOff = offset * this.volumeData.width;
            const sliceSize = this.volumeData.depth * this.volumeData.width;
            this.texCache2 = new Float32Array(sliceSize);
            let i = 0;
            for (let d = 0; d < this.volumeData.depth; d++) {
                const dOff = d * this.volumeData.height * this.volumeData.width;
                for (let w = 0; w < this.volumeData.width; w++) {
                    const wOff = w;
                    this.texCache2[i++] = this.volumeData.data[hOff + dOff + wOff];
                }
            }
            gl.activeTexture(gl.TEXTURE4);
            gl.bindTexture(gl.TEXTURE_2D, this.dataTexture2);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, this.volumeData.width,
                this.volumeData.depth, 0, gl.RED, gl.FLOAT, this.texCache2);
        }
        { // Width
            const wOff = Math.floor(this.volumeData.width * width);
            const sliceSize = this.volumeData.depth * this.volumeData.width;
            this.texCache3 = new Float32Array(sliceSize);
            let i = 0;
            for (let d = 0; d < this.volumeData.depth; d++) {
                const dOff = d * this.volumeData.height * this.volumeData.width;
                for (let h = 0; h < this.volumeData.height; h++) {
                    const hOff = h * this.volumeData.width;
                    this.texCache3[i++] = this.volumeData.data[dOff + hOff + wOff];
                }
            }
            gl.activeTexture(gl.TEXTURE5);
            gl.bindTexture(gl.TEXTURE_2D, this.dataTexture3);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, this.volumeData.height,
                this.volumeData.depth, 0, gl.RED, gl.FLOAT, this.texCache3);
        }
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