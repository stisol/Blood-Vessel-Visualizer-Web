import makeRequest from "./util";
import { isNullOrUndefined } from "util";


/**
 * Initialize a shader program, so WebGL knows how to draw our data.
 */
export function initShaderProgram(
    gl: WebGL2RenderingContext,
    vsSource: string,
    fsSource: string,
): WebGLProgram {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource) as WebGLShader;
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource) as WebGLShader;

    // Create the shader program
    const shaderProgram = gl.createProgram();
    if (isNullOrUndefined(shaderProgram)) throw "Failed to create shader program";

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        const error = "Unable to initialize the shader program";
        alert(error + ": " + gl.getProgramInfoLog(shaderProgram));
        throw error;
    }

    return shaderProgram;
}

/**
 * Creates a shader of the given type, uploads the source and compiles it.
 */
function loadShader(
    gl: WebGL2RenderingContext,
    type: number,
    source: string,
): WebGLShader | null {
    const shader = gl.createShader(type);
    if (isNullOrUndefined(shader)) throw "Failed to create shader";

    // Send the source to the shader object
    gl.shaderSource(shader, source);

    // Compile the shader program
    gl.compileShader(shader);

    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = "An error occurred compiling the shaders";
        alert(error + ": " + gl.getShaderInfoLog(shader));
        console.log(error + ": " + gl.getShaderInfoLog(shader))
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

export async function bindTexture(url: string, gl: WebGL2RenderingContext): Promise<Float32Array> {
    const buffer = await makeRequest("GET", url, "arraybuffer") as ArrayBuffer;

    if (!buffer) throw "Could not load the texture data.";

    const floatArray = new Int16Array(buffer);

    const width = floatArray[0];
    const height = floatArray[1];
    const depth = floatArray[2];
    console.log(width, height, depth);

    // Normalize
    console.log("Calculating max");
    let max = 0;
    for (let i = 0; i < floatArray.length; ++i) {
        max = Math.max(max, floatArray[i]);
    }
    console.log("Max is ", max);

    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_3D, texture);

    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_BASE_LEVEL, 0);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAX_LEVEL, 0);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const volumeData = new Float32Array(floatArray.slice(3));
    const normalData = new Float32Array(volumeData.length * 3);

    for (let i = 0; i < volumeData.length; ++i) {
        volumeData[i] /= max;
    }
    //volumeData = volumeData.map(x=>x/max);
    gl.texImage3D(gl.TEXTURE_3D,
        0,
        gl.R16F,
        width,
        height,
        depth,
        0,
        gl.RED,
        gl.FLOAT,
        volumeData
    );

    const index = (x: number, y: number, z: number): number =>
        Math.max(Math.min(x + y * width + z * width * height, volumeData.length), 0);

    for (let i = 0; i < volumeData.length; ++i) {
        const x = Math.round((i)) % width;
        const y = Math.round((i / width)) % height;
        const z = Math.round((i / width / height)) % depth;
        normalData[i * 3] = (volumeData[index(x, y, z - 1)] - volumeData[index(x, y, z + 1)]) / 2.0;
        normalData[i * 3 + 1] = -(volumeData[index(x, y - 1, z)] - volumeData[index(x, y + 1, z)]) / 2.0;
        normalData[i * 3 + 2] = (volumeData[index(x - 1, y, z)] - volumeData[index(x + 1, y, z)]) / 2.0;

        const factor = Math.max(Math.abs(normalData[i * 3]), Math.max(Math.abs(normalData[i * 3 + 1]), Math.abs(normalData[i * 3 + 2])));
        if(factor > 0.025) {
            normalData[i * 3] /= factor;
            normalData[i * 3 + 1] /= factor;
            normalData[i * 3 + 2] /= factor;
        } else {
            normalData[i * 3] = 0.0;
            normalData[i * 3 + 1] = 0.0;
            normalData[i * 3 + 2] = 0.0;
        }
    }
    const texture2 = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_3D, texture2);

    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_BASE_LEVEL, 0);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAX_LEVEL, 0);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texImage3D(gl.TEXTURE_3D,
        0,
        gl.RGB16F,
        width,
        height,
        depth,
        0,
        gl.RGB,
        gl.FLOAT,
        normalData
    );

    return volumeData;
}
