import Settings from "./settings";

export default class TransferFunctionController {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private settings: Settings;
    private histogramData: number[];
    private transferFunction: TransferFunction;

    private dragging = false;
    private draggingId = 0;
    private lastClick = 0;
    public transferFunctionUpdated = true;

    private readonly handleSize = 6;
    private readonly margin = 8;
    private readonly spacing = 2;


    /**
     * Creates a transfer function controller.
     * @param volumeData The normalized volume data.
     */
    constructor(
        volumeData: Float32Array,
        parentElement: HTMLElement,
        settings: Settings,
        buckets = 50) {

        this.settings = settings;
        this.histogramData = new Array(buckets).fill(0);
        volumeData.forEach(v => {
            const i = Math.floor(v * (buckets - 1));
            this.histogramData[i] += 1;
        });

        const div = document.createElement("div");
        div.classList.add("transfer-function");

        const label = document.createElement("label");
        label.innerText = "Transfer function";
        div.appendChild(label);

        this.canvas = document.createElement("canvas");
        div.appendChild(this.canvas);
        parentElement.appendChild(div);
        this.canvas.height = 200;
        this.canvas.width = 270;
        this.canvas.onmouseup = this.onMouseUp.bind(this);
        this.canvas.onmousemove = this.onMouseMove.bind(this);
        this.canvas.onmousedown = this.onMouseDown.bind(this);
        this.canvas.onmouseleave = this.onMouseLeave.bind(this);

        const df = new Color(0, 0, 0);
        const skin = new Color(255, 224, 189);
        const bone = new Color(254, 254, 254);
        this.transferFunction = new TransferFunction([
            [0, 0, df],
            [0.3, 0, df],
            [0.35, 1, skin],
            [0.4, 0, df],            
            [0.5, 1, bone],
            [0.6, 0, df],
            [1, 0, df],
        ]);

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

        // Draw transfer function, line first
        const tf = this.transferFunction;
        this.ctx.strokeStyle = "grey";
        this.ctx.beginPath();
        tf.controlPoints.forEach(p => {
            const [x, y] = this.dataToCanvas(p);
            this.ctx.lineTo(x, y);
        });
        this.ctx.stroke();

        // Draw circles at each point.
        tf.controlPoints.forEach(p => {
            this.ctx.fillStyle = p[2].toHtml();
            const [x, y] = this.dataToCanvas(p);
            const v = this.handleSize;
            this.ctx.fillRect(x - (v / 2), y - (v / 2), v, v);
        });
    }

    /**
     * Converts canvas coordinates to data space.
     */
    private canvasToData(x: number, y: number): [number, number] {
        const m = this.margin;
        const h = this.canvas.height, w = this.canvas.width;

        let xx = (x - m) / (w - m * 2);
        let yy = 1 - (y - m) / (h - m * 2);
        xx = Math.min(1.0, Math.max(0.0, xx));
        yy = Math.min(1.0, Math.max(0.0, yy));

        return [xx, yy];
    }

    /**
     * Converts data coordinates to canvas space.
     */
    private dataToCanvas(data: [number, number, Color]): [number, number] {
        const x = data[0], y = data[1];
        const m = this.margin;
        const h = this.canvas.height, w = this.canvas.width;
        const h2 = (h - m * 2);

        const xx = x * (w - m * 2) + m;
        const yy = h2 - y * h2 + m;
        return [xx, yy];
    }

    private onMouseDown(event: MouseEvent): void {
        const [x, y] = this.clientToMouseCoords(event);

        // Doubleclick detection
        const newTime = Date.now();
        const doubleclick = newTime - this.lastClick < 250;
        this.lastClick = newTime;

        const tf = this.transferFunction;
        let didSomething = false;
        for (let i = 0; i < tf.controlPoints.length; i++) {
            const [px, py] = this.dataToCanvas(tf.controlPoints[i]);
            const xok = Math.abs(x - px) < this.handleSize;
            const yok = Math.abs(y - py) < this.handleSize;
            if (xok && yok) {
                const isEndpoint = i == 0 || i == tf.controlPoints.length - 1;
                // LMB: Drag
                if (!doubleclick) {
                    this.dragging = true;
                    this.draggingId = i;
                }
                //RMB: Remove
                else if (doubleclick && !isEndpoint) {
                    tf.controlPoints.splice(i, 1);
                    this.transferFunctionUpdated = true;
                    this.draw();
                }
                didSomething = true;
                break;
            }
        }

        // If nothing else was done for a right-click, add a point.
        if (!didSomething && doubleclick) {
            // Validate coordinates
            const [xx, yy] = this.canvasToData(x, y);
            if (0 < xx && xx < 1) {
                for (let i = 0; i < tf.controlPoints.length; i++) {
                    if (xx < tf.controlPoints[i][0]) {
                        const c = this.settings.colorDefault();
                        const color = new Color(c[0], c[1], c[2]);
                        tf.controlPoints.splice(i, 0, [xx, yy, color]);
                        this.transferFunctionUpdated = true;
                        this.draw();
                        break;
                    }
                }
            }
        }
    }

    private onMouseMove(event: MouseEvent): void {
        if (!this.dragging) return;

        const cp = this.transferFunction.controlPoints;
        const p = cp[this.draggingId];
        const [mx, my] = this.clientToMouseCoords(event);
        const m = this.canvasToData(mx, my);

        // Don't move x coord of first and last point.
        const isEndpoint = this.draggingId == 0 || this.draggingId == cp.length - 1;
        const isValidMove = !isEndpoint
            && m[0] > cp[this.draggingId - 1][0]
            && m[0] < cp[this.draggingId + 1][0];

        if (isValidMove) p[0] = m[0];
        p[1] = m[1];

        this.transferFunctionUpdated = true;
        this.draw();
    }

    private onMouseUp(): void {
        this.dragging = false;
    }

    private onMouseLeave(): void {
        this.dragging = false;
    }

    private clientToMouseCoords(e: MouseEvent): [number, number] {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        return [e.clientX - rect.left, e.clientY - rect.top];
    }

    public getTransferFunctionTexture(): Uint8Array {
        return this.transferFunction.bake();
    }
}

class Color {
    public r: number;
    public g: number;
    public b: number;

    public constructor(r: number, g: number, b: number) {
        this.r = r;
        this.g = g;
        this.b = b;
    }

    public static default(): Color {
        return new Color(255, 0, 255);
    }

    public toHtml(): string {
        return `rgb(${this.r},${this.g},${this.b})`;
    }
}

export class TransferFunction {
    public controlPoints: [number, number, Color][];

    public constructor(controlPoints: [number, number, Color][]) {
        this.controlPoints = controlPoints;
    }

    public bake(): Uint8Array {
        const tex = new Uint8Array(256 * 4);

        let cpi = 0;
        let c1 = this.controlPoints[cpi];
        let c2 = this.controlPoints[cpi + 1];
        for (let i = 0; i < 256; i++) {
            const xval = i / 256;
            if (xval > c2[0]) {
                cpi++;
                c1 = this.controlPoints[cpi];
                c2 = this.controlPoints[cpi + 1];
            }

            const i0 = i * 4;
            tex[i0 + 0] = this.lerp(xval, c1[0], c2[0], c1[2].r, c2[2].r);
            tex[i0 + 1] = this.lerp(xval, c1[0], c2[0], c1[2].g, c2[2].g);
            tex[i0 + 2] = this.lerp(xval, c1[0], c2[0], c1[2].b, c2[2].b);
            tex[i0 + 3] = this.lerp(xval, c1[0], c2[0], c1[1], c2[1]);
        }

        return tex;
    }

    private lerp(x: number, x0: number, x1: number, y0: number, y1: number): number {
        return (y0 * (x1 - x0) + y1 * (x - x0)) / (x1 - x0);
    }
}
