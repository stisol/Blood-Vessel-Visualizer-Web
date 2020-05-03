import { vec3, mat4, vec4 } from "gl-matrix";
import * as $ from "jquery";

export default class Camera {
    private theta = 0.0;
    private phi = Math.PI / 2.0;
    private radius = 4.0;
    private target: vec3;

    private mouseDown = false;
    private lastMousePos = [0.0, 0.0];

    private updated = true;

    private transform: mat4;
    private canvas: HTMLCanvasElement;

    public constructor(target: vec3, canvas: HTMLCanvasElement, radius = 4.0) {
        this.target = target;

        // JQuery is good at automatically creating event handler queues.
        $(canvas)
            .mousedown(this.setMouseDown.bind(this, true))
            .mouseup(this.setMouseDown.bind(this, false))
            .mouseleave(this.setMouseDown.bind(this, false))
            .mousemove(this.onMouseMove.bind(this));
        
        // But JQuery is also really bad at scroll wheels.
        canvas.onwheel = this.onMouseScroll.bind(this);

        this.transform = mat4.create();
        mat4.translate(this.transform, this.transform, vec3.fromValues(0.0, 0.0, -radius));
            
        this.radius = radius;
        this.canvas = canvas;
    }

    public isUpdated(): boolean {
        const v = this.updated;
        this.updated = false;
        return v;
    }

    private setMouseDown(value: boolean): void {
        this.mouseDown = value;
    }

    private onMouseMove(ev: JQuery.MouseMoveEvent): void {
        if (!this.mouseDown) {
            this.lastMousePos[0] = ev.offsetX;
            this.lastMousePos[1] = ev.offsetY;
            return;
        }

        /*const dx = (ev.clientX - this.lastMousePos[0]) / 200;
        const dy = (ev.clientY - this.lastMousePos[1]) / 200;*/
        this.rotate(ev.offsetX, ev.offsetY);
        this.lastMousePos[0] = ev.offsetX;
        this.lastMousePos[1] = ev.offsetY;
    }

    private onMouseScroll(ev: WheelEvent): void {
        console.log("ev", ev);
        if(Math.abs(ev.deltaY) > 0.0)
        this.zoom(-Math.sign(ev.deltaY) * 0.5 / 2.0 + 1.0);
    }

    public rotate(dx: number, dy: number): void {
        console.log(dx, dy);
        if(dx == this.lastMousePos[0] && dy == this.lastMousePos[1]) return;
        /*this.theta = (this.theta + dTheta) % (Math.PI * 2);
        this.phi = Math.max(0, Math.min(Math.PI, this.phi + dPhi));
        this.updated = true;*/

        const va = this.arcballVector(this.lastMousePos[0], this.lastMousePos[1]);
        const vb = this.arcballVector(dx, dy);

        if(va != vb) {
            const angle = Math.acos(Math.max(-1.0, Math.min(1.0, vec3.dot(va, vb))));
            const axis  = vec3.create();
            vec3.cross(axis, va, vb);

            const inverse = mat4.invert(mat4.create(), this.transform);
            const transformedAxis = vec4.transformMat4(vec4.create(), vec4.fromValues(axis[0], axis[1], axis[2], 0.0), inverse);

            this.transform = mat4.rotate(mat4.create(), this.transform, angle, vec3.fromValues(transformedAxis[0], transformedAxis[1], transformedAxis[2]));
        }

        this.updated = true;
    }

    public zoom(distance: number): void {
        this.radius = Math.max(0, this.radius - distance);
        mat4.scale(this.transform, this.transform, vec3.fromValues(distance, distance, distance));
        this.updated = true;
    }

    public position(): vec3 {
        const r = this.radius, phi = this.phi, theta = this.theta;
        const x = this.target[0] + r * Math.sin(phi) * Math.sin(theta);
        const y = this.target[1] + r * Math.cos(phi);
        const z = this.target[2] + r * Math.sin(phi) * Math.cos(theta);
        return [x, y, z];
    }
    
    public invertedPosition(): vec3 {
        const r = this.radius, phi = this.phi, theta = this.theta;
        const z = this.target[0] + r * Math.sin(phi) * Math.sin(theta);
        const y = (-this.target[1] + r * Math.cos(phi));
        const x = this.target[2] + r * Math.sin(phi) * Math.cos(theta);
        return [x, y, z];
    }

    public getTransform(): mat4 {
        return this.transform;
    }

    private arcballVector(x: number, y: number): vec3 {
        console.log("x", x, "y", y);
        x /= $(this.canvas).width() || 1.0;
        y /= $(this.canvas).height() || 1.0;
        console.log("dx", x, "dy", y);
        const p = vec3.fromValues(x * 2.0 - 1.0, -y * 2.0 + 1.0, 0.0);
        const length2 = p[0]*p[0] + p[1]*p[1];
        if(length2 < 1.0) {
            p[2] = Math.sqrt(1.0 - length2);
            vec3.normalize(p, p);
        }
        else {
            vec3.normalize(p, p); 
        }
        return p;
    }
}
