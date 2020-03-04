import setupPicker from "./picker";
import { vec3 } from "gl-matrix";

export default class Settings {
    private skinOpacityElem: HTMLInputElement;
    private pickerSkin: vec3 = [0.0, 0.0, 1.0];
    private pickerBone: vec3 = [0.001, 0.0, 0.0];

    public constructor() {
        this.skinOpacityElem = createInput(
            "Skin Opacity",
            "range",
            0.0,
            0.1,
            0.05,
            0.001,
            "slider",
            "skinOpacity"
        );

        const sidebar = document.getElementById("sidebar") as HTMLDivElement;

        const pickerSkin = document.createElement("button");
        pickerSkin.innerText = "Tissue color";
        sidebar.appendChild(pickerSkin);
        setupPicker(pickerSkin, "blue", this.setColorSkin.bind(this));

        const pickerBone = document.createElement("button");
        pickerBone.innerText = "Bone color";
        sidebar.appendChild(pickerBone);
        setupPicker(pickerBone, "#01000000", this.setColorBone.bind(this));
    }

    public skinOpacity(): number {
        return parseFloat(this.skinOpacityElem.value);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private setColorSkin(color: any): void {
        this.pickerSkin[0] = color.rgba[0];
        this.pickerSkin[1] = color.rgba[1];
        this.pickerSkin[2] = color.rgba[2];
    }

    public colorSkin(): vec3 {
        return this.pickerSkin;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private setColorBone(color: any): void {
        this.pickerBone[0] = color.rgba[0];
        this.pickerBone[1] = color.rgba[1];
        this.pickerBone[2] = color.rgba[2];
    }

    public colorBone(): vec3 {
        return this.pickerBone;
    }
}

function createInput(
    name: string,
    type: string,
    min: number,
    max: number,
    value: number,
    step: number,
    cssClass: string,
    id: string
): HTMLInputElement {
    const sidebar = document.getElementById("sidebar") as HTMLDivElement;

    const div = document.createElement("div");
    div.classList.add("settingsContainer");

    const title = document.createElement("label");
    title.innerText = name;
    div.appendChild(title);

    div.appendChild(document.createElement("br"));

    const input = document.createElement("input");
    input.type = type;
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.classList.add(cssClass);
    input.id = id;
    input.value = String(value);
    div.appendChild(input);

    sidebar.appendChild(div);

    return input;
}
