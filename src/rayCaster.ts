import Settings from "./settings";
import { mat4, vec4, vec3 } from "gl-matrix";
import Camera from "./camera";
import { LoadedTextureData } from "./shader";
import rayCast from "./rayCast";
import * as $ from "jquery";

export default class RayCasterController {
    private modelCanvas: HTMLCanvasElement;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private settings: Settings;
    private camera: Camera;
    private histogramData: number[];
    private buckets: number;

    private readonly margin = 8;
    private readonly spacing = 2;
    private readonly volumeData: LoadedTextureData;
    
    public aspect = 1;

    constructor(
        volumeData: LoadedTextureData,
        parentElement: HTMLElement,
        settings: Settings,
        camera: Camera,
        buckets = 50) {
        this.camera = camera;
        this.settings = settings;
        this.histogramData = new Array(buckets).fill(0);
        this.volumeData = volumeData;
        this.buckets = buckets;

        volumeData.data.forEach(v => {
            const i = Math.floor(v * (buckets - 1));
            this.histogramData[i] += 1;
        });
        
        const div = document.createElement("div");
        div.classList.add("transfer-function");
        
        const label = document.createElement("label");
        label.innerText = "Raycast Histogram";
        div.appendChild(label);
        
        this.canvas = document.createElement("canvas");
        div.appendChild(this.canvas);
        parentElement.appendChild(div);
        this.canvas.height = 100;
        this.canvas.width = 270;
        
        $("#theCanvas").dblclick(this.onclick.bind(this))
        this.modelCanvas = document.getElementById("theCanvas") as HTMLCanvasElement;
        
        this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
        
        this.draw();
    }

    /**
     * Redraw the transfer functions and histogram to the canvas.
     */
    private draw(): void {
        const margin = this.margin, spacing = this.spacing;
        const itemCount = this.histogramData.length;
        const totalWidth = (this.canvas.width - (margin * 2) - ((itemCount - 1) * spacing));
        const itemWidth = totalWidth / itemCount;
        const maxValue = Math.max(...this.histogramData);
        const maxHeight = this.canvas.height - 2 * margin;

        // Draw histogram.
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = "grey";
        for (let i = 0; i < itemCount; i++) {
            const x = margin + i * (spacing + itemWidth);
            const h = maxHeight * this.histogramData[i] / maxValue;
            this.ctx.fillRect(x, margin + maxHeight - h, itemWidth, h);
        }
    }

    private onclick(ev: JQuery.DoubleClickEvent): void {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const ev2 = ev.originalEvent as MouseEvent;
        const x = ev2.clientX / this.modelCanvas.clientWidth * 2.0 - 1.0;
        const y = ev2.clientY / this.modelCanvas.clientHeight * 2.0 - 1.0;
        
        const zNear = 0.1, zFar = 40.0;
        let projectionMatrix;
        if (this.settings.isOrtographicCamera()) {
            projectionMatrix = mat4.ortho(mat4.create(), -1.0, 1.0, -1.0, 1.0, zNear, zFar);
        } else {
            const fieldOfView = 45 * Math.PI / 180;   // in radians
            projectionMatrix = mat4.perspective(mat4.create(), fieldOfView, this.aspect, zNear, zFar);
        }
        
        const modelViewMatrix = mat4.copy(mat4.create(), this.camera.getTransform());
        
        const eye4 = vec4.transformMat4(vec4.create(), vec4.fromValues(0.0, 0.0, 0.0, 1.0), modelViewMatrix);
        const eye = vec3.fromValues(eye4[0], eye4[1], eye4[2]);
        const scale = this.volumeData.scale;
        const boxMin = vec3.transformMat4(vec3.create(), vec3.fromValues(-1.0,-1.0,-1.0), scale);
        const boxMax = vec3.transformMat4(vec3.create(), vec3.fromValues(1.0, 1.0, 1.0), scale);
        
        const matrix = mat4.create();
        mat4.multiply(matrix, projectionMatrix, modelViewMatrix);
        //const glPosition = uProjectionMatrix * uScaleMatrix * vec4(aVertexPosition, 1.0);
            
        const rayClip: vec4 = [0.0, 0.0, -1.0, 0.0];
        const rayWorld = vec4.transformMat4(vec4.create(), rayClip, mat4.invert(mat4.create(), modelViewMatrix));

        vec4.normalize(rayWorld, rayWorld);

        const position = vec3.fromValues(rayWorld[0], rayWorld[1], rayWorld[2]);
        vec3.normalize(position, position);

        console.log("POSITO", position, rayClip);

        const volumeDim: vec3 = [244, 124, 257];
        
        const data = rayCast(this.volumeData, vec3.fromValues(0.0, 0.0, 1.0), eye, volumeDim, scale, boxMin, boxMax);
        
        this.histogramData = [];
        const buckets = this.buckets;
        for (let i = 0; i < buckets; i++) this.histogramData[i] = 0;
        data.forEach(v => {
            const i = Math.floor(v * (buckets - 1));
            this.histogramData[i] += 1;
        });
        this.draw();
    }
}
