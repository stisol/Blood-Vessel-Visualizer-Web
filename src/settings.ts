import setupPicker from "./picker";
import { vec3, mat4 } from "gl-matrix";
import createSphereMesh from "./meshes/sphereMesh";

import viewVert from "./shaders/lightPreview.vert";
import viewFrag from "./shaders/lightPreview.frag";

import lineVert from "./shaders/lightLine.vert";
import lineFrag from "./shaders/lightLine.frag";

import { initShaderProgram } from "./shader";
import createLineMesh from "./meshes/lineMesh";

abstract class Setting {
    protected container: HTMLDivElement;
    protected updated: boolean;

    constructor(sidebar: HTMLDivElement, titleText: string|null) {
        this.updated = true;
        
        this.container = document.createElement("div");
        this.container.classList.add("settingsContainer");
        sidebar.appendChild(this.container);
        
        if(titleText != null) {
            const title = document.createElement("label");
            title.innerText = titleText;
            this.container.appendChild(title);
        }
        
        this.container.appendChild(document.createElement("br"));
    }

    public abstract getHtml(): HTMLElement;

    public isUpdated(): boolean {
        const updated = this.updated;
        this.updated = false;
        return updated;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public abstract value(): any;
}

class TextSetting extends Setting {
    private elem: HTMLSpanElement;

    constructor(sidebar: HTMLDivElement, titleText: string|null, initialText: string) {
        super(sidebar, titleText);

        this.elem = document.createElement("span");
        this.elem.innerText = initialText;
        this.container.appendChild(this.elem);
    }

    public set(text: string): void {
        this.elem.innerText = text;
    }

    public getString(): string {
        return this.elem.innerText;
    }
    public getHtml(): HTMLElement {
        return this.elem;
    }
    public value(): string {
        return this.elem.innerText;
    }
}

class SliderSetting extends Setting {
    private elem: HTMLInputElement;

    constructor(sidebar: HTMLDivElement, titleText: string|null, initialValue: number, min: number, max: number, step: number, id: string, cssClass: string) {
        super(sidebar, titleText);

        this.elem = document.createElement("input");
    
        const input = document.createElement("input");
        input.type = "range";
        input.min = String(min);
        input.max = String(max);
        input.step = String(step);
        input.classList.add(cssClass);
        input.id = id;
        input.value = String(initialValue);
        this.elem = input;
        this.container.appendChild(input);
        input.oninput = (): void => {this.updated = true;}
    }
    
    public getHtml(): HTMLElement {
        return this.elem;
    }
    
    public value(): number {
        return parseFloat(this.elem.value);
    }
}

class CheckboxSetting extends Setting {
    private elem: HTMLInputElement;

    constructor(sidebar: HTMLDivElement, titleText: string|null, initialValue: boolean, id: string, cssClass: string) {
        super(sidebar, titleText);

        this.elem = document.createElement("input");
    
        const input = document.createElement("input");
        input.type = "checkbox";
        input.classList.add(cssClass);
        input.id = id;
        input.value = String(initialValue);
        this.elem = input;
        this.container.appendChild(input);
        input.oninput = (): void => {this.updated = true;}
    }
    
    public getHtml(): HTMLElement {
        return this.elem;
    }
    
    public value(): boolean {
        return this.elem.checked;
    }
}

class ColorSelectSetting extends Setting {
    private elem: HTMLButtonElement;
    private color: number[];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private setColor(color: any): void {
        this.color[0] = color.rgba[0];
        this.color[1] = color.rgba[1];
        this.color[2] = color.rgba[2];
        this.updated = true;
    }

    constructor(sidebar: HTMLDivElement, titleText: string|null, initialValue: string, id: string, cssClass: string) {
        super(sidebar, titleText);
        this.color = [0.0, 0.0, 0.0];
        this.elem = document.createElement("button");
        this.elem.innerText = "Click to set";
        this.elem.classList.add(cssClass);
        this.elem.id = id;
        this.container.appendChild(this.elem);
        setupPicker(this.elem, initialValue, this.setColor.bind(this));
    }
    
    public getHtml(): HTMLElement {
        return this.elem;
    }
    
    public value(): vec3 {
        return this.color as vec3;
    }
}

class SelectSetting extends Setting {

    private elem: HTMLSelectElement;

    constructor(sidebar: HTMLDivElement, titleText: string | null, options: {value: string; text: string}[]) {
        super(sidebar, titleText);

        this.elem = document.createElement("select");

        options.forEach(option => {
            const optionElem = document.createElement("option");
            optionElem.setAttribute("value", option.value);
            optionElem.innerText = option.text;
            this.elem.appendChild(optionElem);
        });

        this.elem.onchange = (): void => {this.updated = true;}

        this.container.appendChild(this.elem);
    }

    public getHtml(): HTMLElement {
        return this.elem;
    }
    public value(): string {
        return this.elem.value;
    }
    
}

class LightSetting extends Setting {
    private elem: HTMLCanvasElement;

    constructor(sidebar: HTMLDivElement, titleText: string | null) {
        super(sidebar, titleText);

        this.elem = document.createElement("canvas");
        this.elem.height=270;
        this.elem.width = 270;

        this.container.appendChild(this.elem);

        const gl = this.elem.getContext("webgl2");
        if (gl === null) {
            alert("Unable to initialize WebGL. Your browser or machine may not support it.");
            return;
        }

        
        const viewProgram = initShaderProgram(gl, viewVert, viewFrag);
        const viewInfo = {
            program: viewProgram,
            uniformLocations: {
                projectionMatrix: gl.getUniformLocation(viewProgram, "uProjectionMatrix")
            },
        };
        
        const lineProgram = initShaderProgram(gl, lineVert, lineFrag);
        const lineInfo = {
            program: lineProgram,
            uniformLocations: {
                projectionMatrix: gl.getUniformLocation(lineProgram, "uProjectionMatrix")
            },
        };

        const perspective = mat4.create();
        mat4.ortho(perspective, -1.0, 1.0, -1.0, 1.0, 0.1, 40.0);

        const model = mat4.create();
        mat4.translate(model, model, [0.0, 0.0, -5.0]);

        const transform = mat4.create();
        mat4.mul(transform, perspective, model);

        const sphere = createSphereMesh(0.75, 32, 32, false);

        const line = createLineMesh(0.025, 1.0);
        const lineTransform = mat4.create();

        const draw = (lTransform: mat4): void => {

            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clearDepth(1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LEQUAL);
    
            gl.useProgram(viewInfo.program);
            
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            gl.clearColor(0, 0, 0, 1);   // clear to white
    
            gl.uniformMatrix4fv(viewInfo.uniformLocations.projectionMatrix, false, transform);
    
            sphere.bindShader(gl, viewInfo.program);
            gl.drawElements(gl.TRIANGLES, sphere.indiceCount(), gl.UNSIGNED_SHORT, 0.0);
            
            gl.useProgram(lineInfo.program);
            const newTransform = mat4.create();
            mat4.multiply(newTransform, model, lTransform);
            mat4.multiply(newTransform, perspective, newTransform);
            gl.uniformMatrix4fv(lineInfo.uniformLocations.projectionMatrix, false, newTransform);
            line.bindShader(gl, lineInfo.program);
            gl.drawElements(gl.TRIANGLES, line.indiceCount(), gl.UNSIGNED_SHORT, 0.0);
        }
        draw(lineTransform);


        this.elem.addEventListener('mousemove', (event: MouseEvent) => {
            const rect = this.elem.getBoundingClientRect();
            const x = (event.clientX - rect.left) / 270.0 * 2.0 - 1.0;
            const y = (event.clientY - rect.top) / 270.0 * 2.0 - 1.0;
            const direction = vec3.fromValues(-x, y, 0.0);
            vec3.transformMat4(direction, direction, transform);
            vec3.normalize(direction, direction);
            vec3.negate(direction, direction);
            

            const primaryAxis = direction;
            let secondAxis = vec3.fromValues(1.0, 0.0, 0.0);

            if(vec3.dot(primaryAxis, secondAxis) == 1.0) {
                secondAxis = vec3.fromValues(0.0, 0.0, 1.0);
            }
            const thirdAxis = vec3.create();
            vec3.cross(thirdAxis, primaryAxis, secondAxis);
            vec3.cross(secondAxis, primaryAxis, thirdAxis);
            const rotation = mat4.fromValues(primaryAxis[0], primaryAxis[1], primaryAxis[2], 0.0, secondAxis[0], secondAxis[1], secondAxis[2], 0.0, thirdAxis[0], thirdAxis[1], thirdAxis[2], 0.0, 0.0, 0.0, 0.0, 1.0)

            /*const qRotation = quat.create();
            quat.fromMat3(qRotation, rotation);
            mat4.fromRotationTranslation(lineTransform, qRotation, [0.0, 0.0, 0.0]);*/

            console.log(mat4.str(rotation));
            draw(rotation);
            console.log(x, y, direction);
            console.log(primaryAxis, secondAxis, thirdAxis);
        });

        // TODO: Draw light spec
    }
    
    public getHtml(): HTMLElement {
        throw new Error("Method not implemented.");
    }

    public value(): never {
        throw new Error("Method not implemented.");
    }
}

export default class Settings {
    private settings: {[item: string]: Setting};
    

    public constructor() {
        const sidebar = document.getElementById("sidebar") as HTMLDivElement;

        const defaultSkinOpacity = 0.3;
        
        this.settings = {
            fps: new TextSetting(sidebar, null, "FPS: N/A"),
            skinOpacity: new SliderSetting(sidebar, "Skin Opacity", defaultSkinOpacity, 0.0, 1.0, 0.001, "skinOpacity", "slider"),
            isOrthoElem: new CheckboxSetting(sidebar, "Orthographic Camera", false, "orthographic-camera", "checkbox"),
            defaultColor: new ColorSelectSetting(sidebar, "Default color", "#FFE0BDFF", "defaultColor", "color-picker"),
            accumulationMethod: new SelectSetting(sidebar, "Color accumulation Method", [
                {value: "0", text: "Accumulate"},
                {value: "1", text: "Maximum Intensity Projection"}
            ]),
            light: new LightSetting(sidebar, "Light position")
        };

    }

    public isUpdated(): boolean {
        const values = Object.keys(this.settings).map(key => this.settings[key]);
        const isUpdated = values.some(x=>x.isUpdated());
        return isUpdated;
    }

    public skinOpacity(): number {
        return Math.pow(this.settings["skinOpacity"].value(), 4);
    }

    public isOrtographicCamera(): boolean {
        return this.settings["isOrthoElem"].value();
    }

    public colorDefault(): vec3 {
        return this.settings["defaultColor"].value();
    }

    public setFps(fps: string): void {
        (this.settings["fps"] as TextSetting).set("FPS: " + fps);
    }

    public accumulationMethod(): number {
        const value = this.settings["accumulationMethod"].value();
        return parseInt(value);
    }
}

