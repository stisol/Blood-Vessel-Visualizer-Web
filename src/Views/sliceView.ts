import View from '../view';
import RenderTarget from '../renderTarget';
import Settings from '../settings';
import { mat4 } from 'gl-matrix';
import Camera from '../camera';
import Mesh from '../mesh';
import vert from "../shaders/slice.vert";
import frag from "../shaders/slice.frag";
import { initShaderProgram, LoadedTextureData } from '../shader';
import TransferFunctionController from '../transferFunction';
import * as $ from "jquery";

export default class SliceView implements View {
    private gl: WebGL2RenderingContext;
    private renderTarget: RenderTarget;
    private programInfo: ProgramInfo;
    //private transferFunction: TransferFunctionController;
    // private transferFunctionTexture: WebGLTexture;
    private volumeData: LoadedTextureData;
    private slices: Slice[] = [];
    private projectionMatrix: mat4 = mat4.create();
    private texCache1: Float32Array = new Float32Array();
    private texCache2: Float32Array = new Float32Array();
    private texCache3: Float32Array = new Float32Array();
    private canvas: HTMLCanvasElement;
    private controlWidth = 0.5;
    private controlHeight = 0.5;
    private controlDepth = 0.5;

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
        
        this.slices.push(new Slice(gl, 0.0, 0.5, 0.5, 1.0));
        this.slices.push(new Slice(gl, 0.5, 1.0, 0.5, 1.0));
        this.slices.push(new Slice(gl, 0.5, 1.0, 0.0, 0.5));

        const shaderProgram = initShaderProgram(gl, vert, frag);
        this.programInfo = new ProgramInfo(gl, shaderProgram);

        $("#theCanvas").click(this.click.bind(this));
        this.canvas = document.getElementById("theCanvas") as HTMLCanvasElement;
    }

    private click(ev: JQuery.ClickEvent): void {
        const x = ev.clientX, y = ev.clientY;
        const glx = (x / this.canvas.width) * 2 - 1;
        const gly = (1 - y / this.canvas.height) * 2 - 1;

        for (let i = 0; i < this.slices.length; i++) {
            const slice = this.slices[i];
            const hit = slice.hit(glx, gly);
            if (hit === null) continue;

            const hitx = hit[0], hity = hit[1];
            switch (i) {
                case 0:
                    this.controlWidth = hitx;
                    this.controlHeight = hity;
                    break;
                case 1:
                    this.controlWidth = hitx;
                    this.controlDepth = hity;
                    break;
                case 2:
                    this.controlHeight = hitx;
                    this.controlDepth = hity;
                    break;
                default:
                    console.warn("No click handler for slice #" + i);
            }
            this.cacheSlices();
            break;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public render(aspect: number, _camera: Camera, settings: Settings, settingsUpdated: boolean): void {
        const gl = this.gl;
        
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
            this.cacheSlices();
        }

        {
            const slice = this.slices[0];
            gl.uniform1i(this.programInfo.uniformLocations.textureData, 3);
            gl.bindTexture(gl.TEXTURE_2D, slice.getTexture());
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, this.volumeData.width,
                this.volumeData.height, 0, gl.RED, gl.FLOAT, this.texCache1);
                slice.getMesh().bindShader(gl, this.programInfo.program);
            gl.drawElements(gl.TRIANGLES, slice.getMesh().indiceCount(), gl.UNSIGNED_SHORT, 0);
        }

        {
            const slice = this.slices[1];
            gl.bindTexture(gl.TEXTURE_2D, slice.getTexture());
            gl.uniform1i(this.programInfo.uniformLocations.textureData, 4);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, this.volumeData.width,
                this.volumeData.depth, 0, gl.RED, gl.FLOAT, this.texCache2);
            slice.getMesh().bindShader(gl, this.programInfo.program);
            gl.drawElements(gl.TRIANGLES, slice.getMesh().indiceCount(), gl.UNSIGNED_SHORT, 0);
        }
        
        {
            const slice = this.slices[2];
            gl.bindTexture(gl.TEXTURE_2D, slice.getTexture());
            gl.uniform1i(this.programInfo.uniformLocations.textureData, 5);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, this.volumeData.height,
                this.volumeData.depth, 0, gl.RED, gl.FLOAT, this.texCache3);
            slice.getMesh().bindShader(gl, this.programInfo.program);
            gl.drawElements(gl.TRIANGLES, slice.getMesh().indiceCount(), gl.UNSIGNED_SHORT, 0);
        }
    }

    private cacheSlices(): void {
        const gl = this.gl;
        { // Depth
            const z = Math.floor(this.volumeData.depth * this.controlDepth);
            const sliceSize = this.volumeData.width * this.volumeData.height;
            this.texCache1 = this.volumeData.data.slice(z * sliceSize, (z + 1) * sliceSize);
            gl.activeTexture(gl.TEXTURE3);
            gl.bindTexture(gl.TEXTURE_2D, this.slices[0].getTexture());
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, this.volumeData.width,
                this.volumeData.height, 0, gl.RED, gl.FLOAT, this.texCache1);
        }
        { // Height
            const offset = Math.floor(this.volumeData.height * this.controlHeight);
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
            gl.bindTexture(gl.TEXTURE_2D, this.slices[1].getTexture());
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, this.volumeData.width,
                this.volumeData.depth, 0, gl.RED, gl.FLOAT, this.texCache2);
        }
        { // Width
            const wOff = Math.floor(this.volumeData.width * this.controlWidth);
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
            gl.bindTexture(gl.TEXTURE_2D, this.slices[2].getTexture());
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

class Slice {
    private x1: number;
    private x2: number;
    private y1: number;
    private y2: number;
    private mesh: Mesh;
    private texture: WebGLTexture;

    constructor(gl: WebGL2RenderingContext, x1: number, x2: number, y1: number, y2: number) {
        this.x1 = x1;
        this.x2 = x2;
        this.y1 = y1;
        this.y2 = y2;
        this.texture = gl.createTexture() as WebGLTexture;
        this.mesh = Slice.mesh(x1, x2, y1, y2);
    }

    public hit(x: number, y: number): [number, number] | null {
        const hit = this.x1 < x && x < this.x2 && this.y1 < y && y < this.y2;
        if (!hit) return null;
        return [(x - this.x1) / this.x2, (y - this.y1) / this.y2];
    }

    public getTexture(): WebGLTexture {
        return this.texture;
    }

    public getMesh(): Mesh {
        return this.mesh;
    }

    private static mesh(x1: number, x2: number, y1: number, y2: number): Mesh {
        const mesh = new Mesh();
        const positions = [
            x1, y1, 0.0,
            x2, y1, 0.0,
            x2, y2, 0.0,
            x1, y2, 0.0,
        ];
        const faces = [0, 1, 2, 0, 2, 3];
        const texCoords = [
            0, 0,
            1, 0,
            1, 1,
            0, 1
        ];
        mesh.setPositions(positions, faces);
        mesh.setTexturePositions(texCoords);
        return mesh;        
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