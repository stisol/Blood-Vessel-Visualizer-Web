import setupPicker from "./picker";
import { vec3, mat4, quat, mat3 } from "gl-matrix";
import createSphereMesh from "./meshes/sphereMesh";

import viewVert from "./shaders/lightPreview.vert";
import viewFrag from "./shaders/lightPreview.frag";

import lineVert from "./shaders/lightLine.vert";
import lineFrag from "./shaders/lightLine.frag";

import { initShaderProgram, LoadedTextureData } from "./shader";
import createLineMesh from "./meshes/lineMesh";
import Camera from "./camera";

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
    private lightTransform: mat4;

    private modelViewMatrix = mat4.create();

    private draw?: () => void;

    constructor(sidebar: HTMLDivElement, titleText: string | null) {
        super(sidebar, titleText);

        this.elem = document.createElement("canvas");
        this.elem.height=270;
        this.elem.width = 270;
        this.elem.id = "LightControl";

        this.container.appendChild(this.elem);

        this.lightTransform = mat4.create();
        
        
        const camera = new Camera([0.0, 0.0, 0.0], this.elem, 0.0, true, true, true, true);

        const gl = this.elem.getContext("webgl2");
        if (gl === null) {
            alert("Unable to initialize WebGL. Your browser or machine may not support it.");
            return;
        }

        
        const viewProgram = initShaderProgram(gl, viewVert, viewFrag);
        const viewInfo = {
            program: viewProgram,
            uniformLocations: {
                projectionMatrix: gl.getUniformLocation(viewProgram, "uProjectionMatrix"),
                lightPosition: gl.getUniformLocation(viewProgram, "uLightPosition")
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
        mat4.translate(model, model, [0.0, 0.0, -4.0]);
        //mat4.rotateX(model, model, Math.PI);


        const sphere = createSphereMesh(0.75, 32, 32, false);

        const line = createLineMesh(0.025, -1.0);

        const createRotationMatrix = (): mat4 => {
            const modelViewMatrix = mat4.create();

            mat4.mul(modelViewMatrix, camera.getTransform(), modelViewMatrix);

            //modelViewMatrix = mat4.copy(mat4.create(), camera.getTransform());
            mat4.rotateX(modelViewMatrix, modelViewMatrix, Math.PI);
            
            const inverse = mat4.invert(mat4.create(), modelViewMatrix);
            this.lightTransform = inverse;
            return inverse;
        }

        this.draw = (): void => {
            const lTransform = mat4.create();
            mat4.mul(lTransform, this.modelViewMatrix, createRotationMatrix());
            mat4.scale(lTransform, lTransform, vec3.fromValues(-1.0, 1.0, 1.0));
            
            const lightPosition = vec3.fromValues(0.0, 0, 1.0);
            vec3.transformMat4(lightPosition, lightPosition, mat4.mul(mat4.create(), model, lTransform));

            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clearDepth(1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LEQUAL);
    
            gl.useProgram(viewInfo.program);

            gl.uniform3fv(viewInfo.uniformLocations.lightPosition, lightPosition);
            
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            gl.clearColor(0, 0, 0, 1);   // clear to white

            const projectionMatrix = mat4.create();
            mat4.mul(projectionMatrix, model, lTransform);
            mat4.mul(projectionMatrix, perspective, projectionMatrix);
    
            gl.uniformMatrix4fv(viewInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    
            sphere.bindShader(gl, viewInfo.program);
            gl.drawElements(gl.TRIANGLES, sphere.indiceCount(), gl.UNSIGNED_SHORT, 0.0);
            
            gl.useProgram(lineInfo.program);
            const newTransform = mat4.create();
            mat4.multiply(newTransform, model, lTransform);
            mat4.multiply(newTransform, perspective, newTransform);
            gl.uniformMatrix4fv(lineInfo.uniformLocations.projectionMatrix, false, newTransform);
            line.bindShader(gl, lineInfo.program);
            gl.drawElements(gl.TRIANGLES, line.indiceCount(), gl.UNSIGNED_SHORT, 0.0);
            /*
            mat4.multiply(newTransform, model, this.lightTransform);
            mat4.multiply(newTransform, modelViewMatrix, newTransform);
            mat4.multiply(newTransform, perspective, newTransform);
            gl.uniformMatrix4fv(lineInfo.uniformLocations.projectionMatrix, false, newTransform);
            line.bindShader(gl, lineInfo.program);
            gl.drawElements(gl.TRIANGLES, line.indiceCount(), gl.UNSIGNED_SHORT, 0.0);*/
        };

        this.draw();

        camera.setOnChange((): void => {
            if(this.draw == null) return; 
            this.draw();
            this.updated = true;
        })
    }
    
    public getHtml(): HTMLElement {
        throw new Error("Method not implemented.");
    }

    public value(): mat4 {
        return mat4.rotateX(mat4.create(), this.lightTransform, Math.PI);
    }
    
    multiplyLightTransform(rotation: quat): void {
        this.modelViewMatrix = mat4.fromQuat(mat4.create(), rotation);
        if(this.draw == null) return;
        this.draw();
    }
}

export enum Layout {
    Focus,
    View3D,
    Quad
}

export default class Settings {
    private settings: {[item: string]: Setting};

    private loadedData: LoadedTextureData;

    public constructor(data: LoadedTextureData) {
        const sidebar = document.getElementById("sidebar") as HTMLDivElement;

        this.settings = {
            fps: new TextSetting(sidebar, null, "FPS: N/A"),
            showSlices: new CheckboxSetting(sidebar, "Show Slices", false, "show-slices", "checkbox"),
            isOrthoElem: new CheckboxSetting(sidebar, "Orthographic Camera", false, "orthographic-camera", "checkbox"),
            defaultColor: new ColorSelectSetting(sidebar, "Default color", "#FFE0BDFF", "defaultColor", "color-picker"),
            lightDistance: new SliderSetting(sidebar, "Light distance", 2.0, 0.5, 5.0, 0.05, "lightDistance", "light-distance"),
            accumulationMethod: new SelectSetting(sidebar, "Color accumulation Method", [
                {value: "0", text: "Accumulate"},
                {value: "1", text: "Maximum Intensity Projection"}
            ]),
            layout: new SelectSetting(sidebar, "Layout", [
                {value: "0", text: "Focus"},
                {value: "1", text: "3D View only"},
                {value: "2", text: "Quad view"}
            ]),
            light: new LightSetting(sidebar, "Light position")
        };

        this.loadedData = data;

    }

    public isUpdated(): boolean {
        const values = Object.keys(this.settings).map(key => this.settings[key]);
        const isUpdated = values.some(x=>x.isUpdated());
        return isUpdated;
    }

    public showslices(): boolean {
        return this.settings["showSlices"].value();
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

    public lightTransform(): mat4 {
        return this.settings["light"].value();
    }

    public lightDistance(): number {
        return this.settings["lightDistance"].value();
    }

    public layout(): Layout {
        switch (this.settings["layout"].value()) {
            case "0": return Layout.Focus;
            case "1": return Layout.View3D;
            case "2": return Layout.Quad;
            default: throw "Unknown layout type " + this.settings["layout"].value();
        }
    }

    public multiplyLightTransform(transform: mat4): void {
        const ltransform = mat3.create();
        mat3.fromMat4(ltransform, transform);

        const rotationQuat = quat.create();
        quat.fromMat3(rotationQuat, ltransform);
        //quat.normalize(rotationQuat, rotationQuat);

        const light = this.settings["light"] as LightSetting;
        light.multiplyLightTransform(rotationQuat);
    }

    public setLoadedData(data: LoadedTextureData): void {
        this.loadedData = data;
    }

    public getLoadedData(): LoadedTextureData {
        return this.loadedData;
    }
}
