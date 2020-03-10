import { vec3 } from "gl-matrix";

export default class Camera {
    private theta = 0.0;
    private phi = Math.PI / 2.0;
    private radius = 4.0;
    private target: vec3;

    private mouseDown = false;
    private lastMousePos = [0.0, 0.0];

    private updated = true;

    public constructor(target: vec3) {
        this.target = target;

        const canvas = document.getElementById("theCanvas") as HTMLCanvasElement;
        canvas.onmousedown = this.setMouseDown.bind(this, true);
        canvas.onmouseup = this.setMouseDown.bind(this, false);
        canvas.onmouseleave = this.setMouseDown.bind(this, false);
        canvas.onmousemove = this.onMouseMove.bind(this);
        canvas.onwheel = this.onMouseScroll.bind(this);
    }

    public isUpdated(): boolean {
        const v = this.updated;
        this.updated = false;
        return v;
    }

    private setMouseDown(value: boolean): void {
        this.mouseDown = value;
    }

    private onMouseMove(ev: MouseEvent): void {
        if (!this.mouseDown) {
            this.lastMousePos[0] = ev.clientX;
            this.lastMousePos[1] = ev.clientY;
            return;
        }

        const dx = (ev.clientX - this.lastMousePos[0]) / 200;
        const dy = (ev.clientY - this.lastMousePos[1]) / 200;
        this.rotate(-dx, -dy);

        this.lastMousePos[0] = ev.clientX;
        this.lastMousePos[1] = ev.clientY;
    }

    private onMouseScroll(ev: WheelEvent): void {
        this.zoom(-ev.deltaY / 20);
    }

    public rotate(dTheta: number, dPhi: number): void {
        this.theta = (this.theta + dTheta) % (Math.PI * 2);
        this.phi = Math.max(0, Math.min(Math.PI, this.phi + dPhi));
        this.updated = true;
    }

    public zoom(distance: number): void {
        this.radius = Math.max(0, this.radius - distance);
        this.updated = true;
    }

    public position(): vec3 {
        const r = this.radius, phi = this.phi, theta = this.theta;
        const x = this.target[0] + r * Math.sin(phi) * Math.sin(theta);
        const y = this.target[1] + r * Math.cos(phi);
        const z = this.target[2] + r * Math.sin(phi) * Math.cos(theta);
        return [x, y, z];
    }
}
