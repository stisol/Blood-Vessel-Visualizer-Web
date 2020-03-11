export default class TransferFunctionController {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private histogramData: number[];
    private transferFunctions: TransferFunction[] = [];

    private dragging = false;
    private draggingIds: [number, number] = [0, 0];

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

        this.transferFunctions.push(
            new TransferFunction("white", [[0.2, 0], [0.315, 0.3], [0.45, 0]])
        );
        this.transferFunctions.push(
            new TransferFunction("orange", [[0.45, 0], [0.7, 1], [1, 0]])
        );

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

        // Draw transfer functions.
        this.transferFunctions.forEach(tf => {
            // Draw the line.
            this.ctx.strokeStyle = tf.color;
            this.ctx.beginPath();
            tf.controlPoints.forEach(p => {
                const [x, y] = this.dataToCanvas(p);
                this.ctx.lineTo(x, y);
            });
            this.ctx.stroke();

            // Draw circles at each point.
            this.ctx.fillStyle = tf.color;
            tf.controlPoints.forEach(p => {
                const [x, y] = this.dataToCanvas(p);
                const v = this.handleSize;
                this.ctx.fillRect(x - (v / 2), y - (v / 2), v, v);
            });
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
    private dataToCanvas(data: [number, number]): [number, number] {
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

        for (let i = 0; i < this.transferFunctions.length; i++) {
            const tf = this.transferFunctions[i];
            for (let j = 0; j < tf.controlPoints.length; j++) {
                const [px, py] = this.dataToCanvas(tf.controlPoints[j]);
                const xok = Math.abs(x - px) < this.handleSize;
                const yok = Math.abs(y - py) < this.handleSize;
                if (xok && yok) {
                    this.dragging = true;
                    this.draggingIds = [i, j];
                }
            }
        }
    }

    private onMouseMove(event: MouseEvent): void {
        if (!this.dragging) return;

        const tf = this.transferFunctions[this.draggingIds[0]];
        const p = tf.controlPoints[this.draggingIds[1]]
        const [mx, my] = this.clientToMouseCoords(event);
        const [x, y] = this.canvasToData(mx, my);
        p[0] = x, p[1] = y;
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
    public controlPoints: [number, number][];
    public color: string;

    public constructor(color: string, controlPoints: [number, number][]) {
        this.color = color;
        this.controlPoints = controlPoints;
    }
}
