import View from '../view';
import RenderTarget from '../renderTarget';
import Settings from '../settings';
import { Layout } from '../settings';
import { mat4, vec3 } from 'gl-matrix';
import Camera from '../camera';
import Mesh from '../mesh';
import vert from "../shaders/slice.vert";
import frag from "../shaders/slice.frag";
import { initShaderProgram, LoadedTextureData } from '../shader';
import * as $ from "jquery";

export default class SliceView implements View {
    private gl: WebGL2RenderingContext;
    private renderTarget: RenderTarget;
    private programInfo: ProgramInfo;
    private settings: Settings;
    //private transferFunction: TransferFunctionController;
    // private transferFunctionTexture: WebGLTexture;
    private slices: Slice[] = [];
    private canvas: HTMLCanvasElement;
    private controlWidth = 0.5;
    private controlHeight = 0.5;
    private controlDepth = 0.5;
    private modelCenter: [number, number, number] = [0.5, 0.5, 0.5];
    private mesh3d: Mesh;
    private aspectRatioCache = 1;
    private layoutCache = Layout.Focus;
    public textureUpdated = false;
    
    public constructor(
        gl: WebGL2RenderingContext,
        renderTarget: RenderTarget,
        settings: Settings) {
        this.gl = gl;
        this.settings = settings;
        this.renderTarget = renderTarget;
        const volumeData = settings.getLoadedData();

        // this.transferFunction = transferFunction;
        // this.transferFunctionTexture = gl.createTexture() as WebGLTexture;

        this.slices.push(new Slice(gl, [255, 0, 0], 0, volumeData.width, volumeData.height, 1));
        this.slices.push(new Slice(gl, [0, 255, 0], 1, volumeData.width, volumeData.depth, 1));
        this.slices.push(new Slice(gl, [0, 0, 255], 2, volumeData.height, volumeData.depth, 1));
        this.mesh3d = Slice.mesh(-1, 1, -1, 1);

        const shaderProgram = initShaderProgram(gl, vert, frag);
        this.programInfo = new ProgramInfo(gl, shaderProgram);

        this.canvas = document.getElementById("theCanvas") as HTMLCanvasElement;

        

        const wheelHandler = this.onMouseScroll.bind(this);
        $("#theCanvas")
            .click(this.click.bind(this))
            .bind("wheel.slice", function(e) {
                const handled = wheelHandler(e.originalEvent as WheelEvent);
                if (handled) e.stopImmediatePropagation();
            });

        this.cacheSlices();
    }

    private onMouseScroll(ev: WheelEvent): boolean {
        return this.doOnSlice(ev.clientX, ev.clientY, (i: number) => {
            const volumeData = this.settings.getLoadedData();
            const sign = ev.deltaY > 0 ? -1 : 1;
            switch (i) {
                case 0:
                    this.controlDepth += sign / volumeData.depth;
                    this.controlDepth = Math.min(1, Math.max(0, this.controlDepth));
                    break;
                case 1:
                    this.controlHeight += sign / volumeData.height;
                    this.controlHeight = Math.min(1, Math.max(0, this.controlHeight));
                    break;
                case 2:
                    this.controlWidth += sign / volumeData.height;
                    this.controlWidth = Math.min(1, Math.max(0, this.controlWidth));
                    break;
            }
            this.cacheSlices();
            this.textureUpdated = true;
        });
    }

    private click(ev: JQuery.ClickEvent): void {
        this.doOnSlice(ev.clientX, ev.clientY, (i: number, hitx: number, hity: number) => {            
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
            }
            this.cacheSlices();
            this.textureUpdated = true;
        });
    }

    /// Finds the slice for the given x,y coordinates and calls the given
    /// function with the relative coordinates clicked. Returns a boolean
    /// indicating whether or not a slice was clicked.
    private doOnSlice(x: number, y: number, fun: (i: number, x: number, y: number) => void): boolean {
        const glx = (x / this.canvas.clientWidth) * 2 - 1;
        const gly = (1 - y / this.canvas.clientHeight) * 2 - 1;
        
        for (let i = 0; i < this.slices.length; i++) {
            const slice = this.slices[i];
            const hit = slice.hit(glx, gly);
            if (hit === null) continue;

            fun(i, hit[0], hit[1]);
            return true;
        }
        return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public render(aspect: number, camera: Camera, settings: Settings, loadedData: LoadedTextureData): void {
        if (!this.textureUpdated && this.layoutCache == Layout.View3D
            && !settings.showslices() && settings.layout() == Layout.View3D) {
            return;
        }
        this.textureUpdated = false;
        const gl = this.gl;
        
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.viewport(0, 0, this.renderTarget.getWidth(), this.renderTarget.getHeight());
        gl.useProgram(this.programInfo.program);
        
        // Layout recalculation
        if (settings.layout() != this.layoutCache || aspect != this.aspectRatioCache) {
            this.layoutCache = settings.layout();
            this.aspectRatioCache = aspect;
            this.slices.forEach(element => element.updateMesh(this.layoutCache, aspect));
        }

        for (let i = 0; i < this.slices.length; i++) {
            const identity = mat4.identity(mat4.create());
            gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, identity);

            const slice = this.slices[i];
            const c = slice.color;
            gl.uniform1i(this.programInfo.uniformLocations.textureData, 3 + i);
            gl.uniform3f(this.programInfo.uniformLocations.borderColor, c[0], c[1], c[2])
            gl.bindTexture(gl.TEXTURE_2D, slice.getTexture());
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, slice.w(), slice.h(), 0, gl.RED, gl.FLOAT, slice.getTexCache());            
            
            // 2D slices
            if (this.layoutCache != Layout.View3D) {
                slice.getMesh().bindShader(gl, this.programInfo.program);
                gl.drawElements(gl.TRIANGLES, slice.getMesh().indiceCount(), gl.UNSIGNED_SHORT, 0);
            }
                
            // 3D planar representation
            if (!settings.showslices()) continue;
            const perspective = mat4.create();
            const fieldOfView = 45 * Math.PI / 180, zNear = 0.1, zFar = 40.0;
            if (settings.isOrtographicCamera()) {
                mat4.ortho(perspective, -1.0, 1.0, -1.0, 1.0, zNear, zFar);
            } else {
                mat4.perspective(perspective, fieldOfView, 
                    aspect, zNear, zFar);
            }
            const lookat = mat4.copy(mat4.create(), camera.getTransform());
            mat4.translate(lookat, lookat, vec3.negate(vec3.create(), this.modelCenter));

            // "Center" the slices
            const transVec: vec3 = [0.5, 0.5, 0.5];
            const scaleVec: vec3 = mat4.getScaling(vec3.create(), loadedData.scale);
            for (let i = 0; i < 3; i++)
                transVec[i] /= scaleVec[i];            
            const matrix = mat4.translate(mat4.create(), mat4.create(), transVec);

            let zOff = 0;
            switch (i) {
                case 0:
                    zOff = this.controlDepth;
                    break;
                case 1:
                    zOff = this.controlHeight;
                    mat4.rotateX(matrix, matrix, Math.PI / 2)
                    break;
                case 2:
                    zOff = this.controlWidth;
                    mat4.rotateY(matrix, matrix, -Math.PI / 2);
                    mat4.rotateZ(matrix, matrix, Math.PI / 2);
                    mat4.rotateX(matrix, matrix, Math.PI);
                    break;
            }
            mat4.translate(matrix, matrix, [0, 0, 2 * zOff - 1]);

            mat4.multiply(matrix, loadedData.scale, matrix);
            mat4.multiply(matrix, lookat, matrix);
            mat4.multiply(matrix, perspective, matrix);
            
            gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, matrix);
            this.mesh3d.bindShader(gl, this.programInfo.program);
            gl.drawElements(gl.TRIANGLES, this.mesh3d.indiceCount(), gl.UNSIGNED_SHORT, 0);
        }
    }

    private cacheSlices(): void {
        const gl = this.gl;
        const volumeData = this.settings.getLoadedData();
        { // Depth
            const z = Math.floor(volumeData.depth * this.controlDepth);
            const sliceSize = volumeData.width * volumeData.height;
            this.slices[0].setTexCache(volumeData.data.slice(z * sliceSize, (z + 1) * sliceSize));
            gl.activeTexture(gl.TEXTURE3);
            gl.bindTexture(gl.TEXTURE_2D, this.slices[0].getTexture());
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, volumeData.width,
                volumeData.height, 0, gl.RED, gl.FLOAT, this.slices[0].getTexCache());
        }
        { // Height
            const offset = Math.floor(volumeData.height * this.controlHeight);
            const hOff = offset * volumeData.width;
            const sliceSize = volumeData.depth * volumeData.width;
            const texCache = new Float32Array(sliceSize);
            let i = 0;
            for (let d = 0; d < volumeData.depth; d++) {
                const dOff = d * volumeData.height * volumeData.width;
                for (let w = 0; w < volumeData.width; w++) {
                    const wOff = w;
                    texCache[i++] = volumeData.data[hOff + dOff + wOff];
                }
            }
            this.slices[1].setTexCache(texCache);
            gl.activeTexture(gl.TEXTURE4);
            gl.bindTexture(gl.TEXTURE_2D, this.slices[1].getTexture());
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, volumeData.width,
                volumeData.depth, 0, gl.RED, gl.FLOAT, this.slices[1].getTexCache());
        }
        { // Width
            const wOff = Math.floor(volumeData.width * this.controlWidth);
            const sliceSize = volumeData.depth * volumeData.width;
            const texCache = new Float32Array(sliceSize);
            let i = 0;
            for (let d = 0; d < volumeData.depth; d++) {
                const dOff = d * volumeData.height * volumeData.width;
                for (let h = 0; h < volumeData.height; h++) {
                    const hOff = h * volumeData.width;
                    texCache[i++] = volumeData.data[dOff + hOff + wOff];
                }
            }
            this.slices[2].setTexCache(texCache);
            gl.activeTexture(gl.TEXTURE5);
            gl.bindTexture(gl.TEXTURE_2D, this.slices[2].getTexture());
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, volumeData.height,
                volumeData.depth, 0, gl.RED, gl.FLOAT, this.slices[2].getTexCache());
        }
    }

    public recalculate(): void {
        const volumeData = this.settings.getLoadedData();

        this.slices = [];
        this.slices.push(new Slice(this.gl, [255, 0, 0], 0, volumeData.width, volumeData.height, 1));
        this.slices.push(new Slice(this.gl, [0, 255, 0], 1, volumeData.width, volumeData.depth, 1));
        this.slices.push(new Slice(this.gl, [0, 0, 255], 2, volumeData.height, volumeData.depth, 1));
        this.cacheSlices();
    }

    getRenderTarget(): RenderTarget {
        return this.renderTarget;
    }
}

class Slice {
    public posId: number;
    public layout: Layout = Layout.Focus;
    private x1: number;
    private x2: number;
    private y1: number;
    private y2: number;
    private mesh: Mesh;
    private texture: WebGLTexture;
    private texW: number;
    private texH: number;
    private texCache: Float32Array = new Float32Array();
    public color: vec3;

    constructor(gl: WebGL2RenderingContext, color: vec3, positionId: number, w: number, h: number, aspect: number) {
        this.posId = positionId;
        this.texW = w;
        this.texH = h;
        this.color = color;
        this.texture = gl.createTexture() as WebGLTexture;
        [this.x1, this.x2, this.y1, this.y2] =
            Slice.getPositionsForIdAndLayout(positionId, Layout.Focus, w, h, aspect);
        this.mesh = Slice.mesh(this.x1, this.x2, this.y1, this.y2);
    }

    public updateMesh(layout: Layout, aspect: number): void {
        this.layout = layout;
        [this.x1, this.x2, this.y1, this.y2] =
            Slice.getPositionsForIdAndLayout(this.posId, layout, this.texW, this.texH, aspect);
        this.mesh = Slice.mesh(this.x1, this.x2, this.y1, this.y2);
    }

    private static getPositionsForIdAndLayout(id: number, layout: Layout, w: number, h: number, aspect: number): [number, number, number, number] {
        if (layout == Layout.View3D) return [0, 0, 1, 1];
        let x1, x2, y1, y2;
        
        // Default "focus" coordinates
        switch (id) {
            case 0: x1 = 0.0, x2 = 0.5, y1 = 0.5, y2 = 1.0; break;
            case 1: x1 = 0.5, x2 = 1.0, y1 = 0.5, y2 = 1.0; break;
            case 2: x1 = 0.5, x2 = 1.0, y1 = 0.0, y2 = 0.5; break;
            default: throw "Unknown slice position ID: " + id;
        }

        // Quad is a simple scaling difference
        if (layout == Layout.Quad) {
            x1 = x1 * 2 - 1, x2 = x2 * 2 - 1;
            y1 = y1 * 2 - 1, y2 = y2 * 2 - 1;
        }

        // Adjust for data shape
        if (w > h) {
            const ratio = h / w;
            const height = Math.abs(y2 - y1);
            const dy = height - height * ratio;
            y1 += dy / 2, y2 -= dy / 2;
        } else if (h > w) {
            const ratio = w / h;
            const width = Math.abs(x2 - x1);
            const dx = width - width * ratio;
            x1 += dx / 2, x2 -= dx / 2;
        }

        // Adjust for screen aspect ratio
        if (aspect > 1) {
            const width = Math.abs(x2 - x1);
            const dx = width - width / aspect;
            if (layout == Layout.Focus) {
                if (id == 0) {
                    x1 += dx, x2 += dx;
                }
                x1 += dx;
            } else if (layout == Layout.Quad) {
                x1 += dx / 2, x2 -= dx / 2;
            }
        } else if (aspect < 1) {
            const height = Math.abs(y2 - y1);
            const dy = height - height * aspect;
            if (layout == Layout.Focus) {
                if (id == 2) {
                    y1 += dy, y2 += dy;
                }
                y1 += dy;
            } else if (layout == Layout.Quad) {
                y1 += dy / 2, y2 -= dy / 2;
            }
        }        

        return [x1, x2, y1, y2];
    }

    public hit(x: number, y: number): [number, number] | null {
        const x1 = this.x1, y1 = this.y1, x2 = this.x2, y2 = this.y2;
        const hit = x1 < x && x < x2 && y1 < y && y < y2;
        if (!hit) return null;
        return [
            Math.abs(x - x1) / Math.abs(x2 - x1),
            Math.abs(y - y1) / Math.abs(y2 - y1)
        ];
    }

    public getTexture(): WebGLTexture {
        return this.texture;
    }

    public getMesh(): Mesh {
        return this.mesh;
    }

    public w(): number { return this.texW }
    public h(): number { return this.texH }
    public getTexCache(): Float32Array { return this.texCache; }
    public setTexCache(t: Float32Array): void { this.texCache = t; }

    public static mesh(x1: number, x2: number, y1: number, y2: number): Mesh {
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
    textureData: WebGLUniformLocation;
    borderColor: WebGLUniformLocation;

    constructor(gl: WebGL2RenderingContext, shaderProgram: WebGLShader) {
        this.projectionMatrix =
            gl.getUniformLocation(shaderProgram, "uProjectionMatrix") as WebGLUniformLocation;
        this.textureData =
            gl.getUniformLocation(shaderProgram, "textureData") as WebGLUniformLocation;
        this.borderColor =
            gl.getUniformLocation(shaderProgram, "borderColor") as WebGLUniformLocation;
    }
}