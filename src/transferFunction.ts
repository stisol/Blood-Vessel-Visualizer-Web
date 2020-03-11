export default class TransferFunction {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private histogramData: number[];

    /**
     * Creates a transfer function controller.
     * @param volumeData The normalized volume data.
     */
    constructor(volumeData: Float32Array, parentElement: HTMLElement, buckets = 20) {
        this.histogramData = new Array(buckets).fill(0);
        volumeData.forEach(v => {
            const i = Math.floor(v * (buckets - 1));
            this.histogramData[i] += 1;
        });

        const label = document.createElement("label");
        label.innerText = "Transfer function";
        parentElement.appendChild(label);

        this.canvas = document.createElement("canvas");
        this.canvas.classList.add("transfer-function");
        parentElement.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
        this.draw();
    }

    public draw(): void {
        const margin = 8;
        const spacing = 8;
        const itemCount = this.histogramData.length;
        const totalWidth = (this.canvas.width - (margin * 2) - ((itemCount - 1) * spacing));
        const itemWidth = totalWidth / itemCount;
        const maxValue = Math.max(...this.histogramData);
        const maxHeight = this.canvas.height - 2 * margin;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = "#FFA500";
        for (let i = 0; i < itemCount; i++) {
            const x = margin + i * (spacing + itemWidth);
            const h = maxHeight * this.histogramData[i] / maxValue;
            this.ctx.fillRect(x, margin + maxHeight - h, itemWidth, h);
        }
    }
}