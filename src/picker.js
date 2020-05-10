/* eslint-disable @typescript-eslint/explicit-function-return-type */
import Picker from 'vanilla-picker';

export default function setupPicker(parentElement, color, onchange) {
    return new Picker({
        popup: "bottom",
        parent: parentElement,
        color: color,
        onChange: onchange
    });
}
