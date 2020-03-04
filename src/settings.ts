export default class Settings {
    private skinOpacityElem: HTMLInputElement;

    public constructor() {
        this.skinOpacityElem = createInput(
            "Skin Opacity",
            "range",
            0.0,
            1.0,
            0.05,
            0.001,
            "slider",
            "skinOpacity"
        );
    }

    public skinOpacity(): number {
        return parseFloat(this.skinOpacityElem.value);
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
