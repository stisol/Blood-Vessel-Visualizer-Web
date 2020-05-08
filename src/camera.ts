import { vec3, mat4, vec4, quat, mat3 } from "gl-matrix";
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

    private invertY: boolean;
    private disableRoll: boolean;
    private disableZoom: boolean;
    private disableMovement: boolean;

    private keyPressMap: {[key: string]: boolean} = {};

    private onChange?: (updatedMatrix: mat4) => void;

    public constructor(target: vec3, canvas: HTMLCanvasElement, radius = 4.0, invertY = false, disableRoll = false, disableZoom = false, disableMovement = false) {
        this.target = target;

        // JQuery is good at automatically creating event handler queues.
        const wheelHandler = this.onMouseScroll.bind(this);
        $(canvas)
            .mousedown(this.setMouseDown.bind(this, true))
            .mouseup(this.setMouseDown.bind(this, false))
            .mouseleave(this.setMouseDown.bind(this, false))
            .mousemove(this.onMouseMove.bind(this))
            .bind("wheel.zoom", function(e) { wheelHandler(e.originalEvent as WheelEvent); });
        
        document.onkeydown = document.onkeyup = this.mapKeys.bind(this);
        document.addEventListener("visibilitychange", this.onBlur.bind(this));
        window.blur = this.onBlur.bind(this);

        this.transform = mat4.create();
        mat4.translate(this.transform, this.transform, vec3.fromValues(0.0, 0.0, -radius));
            
        this.radius = radius;
        this.canvas = canvas;

        this.invertY = invertY;
        this.disableRoll = disableRoll;
        this.disableZoom = disableZoom;
        this.disableMovement = disableMovement;

    }

    public isUpdated(): boolean {
        if(document.hasFocus()) {
            this.onKeyPress();
        } else {
            this.keyPressMap = {};
        }
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
        if(Math.abs(ev.deltaY) > 0.0)
        this.zoom(-Math.sign(ev.deltaY) * 0.5);
    }

    private onKeyPress(): void {
        if(this.keyPressMap['w'] || this.keyPressMap['arrowup'] ) {
            this.move(0.0, 0.0, 1.0);
        }
        if(this.keyPressMap['s'] || this.keyPressMap['arrowdown']) {
            this.move(0.0, 0.0, -1.0);
        }
        if(this.keyPressMap['a'] || this.keyPressMap['arrowleft']) {
            this.move(1.0, 0.0, 0.0);
        }
        if(this.keyPressMap['d'] || this.keyPressMap['arrowright']) {
            this.move(-1.0, 0.0, 0.0);
        }
        if(this.keyPressMap[' ']) {
            this.move(0.0, -1.0, 0.0);
        }
        if(this.keyPressMap['shift']) {
            this.move(0.0, 1.0, 0.0);
        }
    }

    private onBlur(): void {
        this.keyPressMap = {};
    }

    private mapKeys(ev: KeyboardEvent): void {
        console.log(ev);
        ev = ev || event;
        this.keyPressMap[ev.key.toLocaleLowerCase()] = ev.type == 'keydown';
    }

    private move(x: number, y: number, z: number): void {
        if(this.disableMovement) return;
        const direction = vec4.fromValues(x, y, z, 0.0);
        vec4.transformMat4(direction, direction, mat4.invert(mat4.create(), this.transform));
        const direction3 = vec3.fromValues(direction[0], direction[1], direction[2]);
        mat4.translate(this.transform, this.transform, vec3.scale(direction3, direction3, 1/60.0));
        this.updated = true;

        this.doChange();
    }

    private doChange(): void {
        if(this.onChange != null) {
            this.onChange(this.transform);
        }
    }

    public rotate(dx: number, dy: number): void {
        if(dx == this.lastMousePos[0] && dy == this.lastMousePos[1]) return;
        /*this.theta = (this.theta + dTheta) % (Math.PI * 2);
        this.phi = Math.max(0, Math.min(Math.PI, this.phi + dPhi));
        this.updated = true;*/
        const va = this.arcballVector(this.lastMousePos[0], this.lastMousePos[1]);
        const vb = this.arcballVector(dx, dy);

        if(isNaN(vb[0]) || isNaN(va[0])) return;

        if(va != vb) {
            const angle = Math.acos(Math.max(-1.0, Math.min(1.0, vec3.dot(va, vb))));
            const axis  = vec3.create();
            vec3.cross(axis, va, vb);
            const inverse = mat4.invert(mat4.create(), this.transform);
            const transformedAxis = vec4.transformMat4(vec4.create(), vec4.fromValues(axis[0], axis[1], axis[2], 0.0), inverse);

            this.transform = mat4.rotate(mat4.create(), this.transform, angle, vec3.fromValues(transformedAxis[0], transformedAxis[1], transformedAxis[2]));
        }

        this.updated = true;

        this.doChange();
    }

    public zoom(distance: number): void {
        if(this.disableZoom) return;
        this.radius = Math.max(0, this.radius - distance);
        const translation = mat4.create();
        mat4.translate(translation, translation, vec3.fromValues(0.0, 0.0, distance));
        mat4.mul(this.transform, translation, this.transform);
        this.updated = true;

        this.doChange();
    }

    public getTransform(): mat4 {
        return this.transform;
    }

    public getRotation(): mat4 {
        const ltransform = mat3.create();
        mat3.fromMat4(ltransform, this.transform);

        const rotationQuat = quat.create();
        quat.fromMat3(rotationQuat, ltransform);
        return mat4.fromQuat(mat4.create(), rotationQuat);
    }

    private arcballVector(x: number, y: number): vec3 {
        x /= $(this.canvas).width() || 1.0;
        y /= $(this.canvas).height() || 1.0;
        
        let p = vec3.fromValues(x * 2.0 - 1.0, -y * 2.0 + 1.0, 0.0);
        if(this.invertY) p = vec3.fromValues(x * 2.0 - 1.0, y * 2.0 - 1.0, 0.0);
        const length2 = p[0]*p[0] + p[1]*p[1];
        if(length2 < 1.0 || !this.disableRoll) {
            p[2] = Math.sqrt(1.0 - length2);
            vec3.normalize(p, p);
        }
        else {
            vec3.normalize(p, p); 
        }
        return p;
    }

    public setOnChange(onChange: (change: mat4) => void): void {
        this.onChange = onChange;
    }
}
