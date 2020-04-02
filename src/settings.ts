import setupPicker from "./picker";
import { vec3 } from "gl-matrix";

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
            ])
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

