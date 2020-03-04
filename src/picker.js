/* eslint-disable @typescript-eslint/explicit-function-return-type */
import Picker from 'vanilla-picker';

export default function setupPicker(parentElement, color, onchange) {
    return new Picker({
        popup: "left",
        parent: parentElement,
        color: color,
        onChange: onchange
    });
}
