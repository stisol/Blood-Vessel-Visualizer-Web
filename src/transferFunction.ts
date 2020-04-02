export default class TransferFunctionController {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private histogramData: number[];
    private transferFunction: TransferFunction;

    private dragging = false;
    private draggingId = 0;
    private lastClick = 0;

    private readonly handleSize = 6;
    private readonly margin = 8;
    private readonly spacing = 2;

    /**
     * Creates a transfer function controller.
     * @param volumeData The normalized volume data.
     */
    constructor(volumeData: Float32Array, parentElement: HTMLElement, buckets = 50) {
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

        this.transferFunction = new TransferFunction([[0, 0, "blue"], [0.315, 0.3, "green"], [1, 0, "red"]]);

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
            this.ctx.fillStyle = p[2];
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
    private dataToCanvas(data: [number, number, string]): [number, number] {
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
                const notEndpoint = i != 0 || i != tf.controlPoints.length - 1;
                // LMB: Drag
                if (!doubleclick) {
                    this.dragging = true;
                    this.draggingId = i;
                }
                //RMB: Remove
                else if (doubleclick && notEndpoint) {
                    tf.controlPoints.splice(i, 1);
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
                        tf.controlPoints.splice(i, 0, [xx, yy, "pink"]);
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
        const isEndpoint = this.draggingId != 0 && this.draggingId != cp.length - 1;
        const isValidMove = isEndpoint
            && m[0] > cp[this.draggingId - 1][0]
            && m[0] < cp[this.draggingId + 1][0];

        if (isValidMove) p[0] = m[0];
        p[1] = m[1];
        
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
}

export class TransferFunction {
    public controlPoints: [number, number, string][];
    
    public constructor(controlPoints: [number, number, string][]) {
        this.controlPoints = controlPoints;
    }

    public bake(): number[] {
        throw "Unimplemented.";
    }
}
