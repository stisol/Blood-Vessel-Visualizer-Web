import makeRequest from "./util";
import { isNullOrUndefined } from "util";
import { mat4, vec3 } from "gl-matrix";
import {parse} from "ini";

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
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

export async function bindTexture(url: string, ini: string, gl: WebGL2RenderingContext): Promise<LoadedTextureData> {
    const buffer = await makeRequest("GET", url, "arraybuffer") as ArrayBuffer;
    const iniData = await makeRequest("GET", ini, "text");

    if (!buffer) throw "Could not load the texture data.";
    if (!iniData) throw "Could not load ini data.";
    const scale = mat4.create();
    const sizes = parse(iniData as string);

    const floatArray = new Int16Array(buffer);

    const width = floatArray[0];
    const height = floatArray[1];
    const depth = floatArray[2];

    const largestAxis = Math.max(width, Math.max(height, depth));

    const volumeScale = vec3.fromValues(width/largestAxis, height/largestAxis, depth/largestAxis);
    
    const datScaleX = parseFloat(sizes.DatFile["oldDat Spacing X"]);
    const datScaleY = parseFloat(sizes.DatFile["oldDat Spacing Y"]);
    const datScaleZ = parseFloat(sizes.DatFile["oldDat Spacing Z"]);
    const iniScale = vec3.fromValues(datScaleX, datScaleY, datScaleZ);

    const vscale = vec3.mul(vec3.create(), volumeScale, iniScale);
    vec3.normalize(vscale, vscale);

    mat4.scale(scale, scale, vscale);

    // Normalize
    let max = 0;
    for (let i = 0; i < floatArray.length; ++i) {
        max = Math.max(max, floatArray[i]);
    }

    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_3D, texture);

    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_BASE_LEVEL, 0);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAX_LEVEL, 0);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const volumeData = new Float32Array(floatArray.slice(3));
    let normalFactor = 1.0
    if(volumeData.length * 3 * 32 / 8 / 1024 / 1024 / 1024 > 2) {
        normalFactor = 0.5;
    }
    
    const nWidth = Math.round(width * normalFactor);
    const nHeight = Math.round(height * normalFactor);
    const nDepth = Math.round(depth * normalFactor);

    const normalData = new Float32Array(nWidth*nHeight*nDepth*3);
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

    const t0 = performance.now()
    const index = (x: number, y: number, z: number): number =>
        Math.max((x + y * nWidth / normalFactor + z * nWidth * nHeight / normalFactor / normalFactor), 0.0) / normalFactor;

    for (let i = 0; i < normalData.length; i += 3) {
        const x = Math.floor((i/3)) % nWidth;
        const y = Math.floor((i/3 / nWidth)) % nHeight;
        const z = Math.floor((i/3 / nWidth / nHeight)) % nDepth;
        normalData[i    ] = (volumeData[index(x - 1, y, z)] - volumeData[index(x + 1, y, z)]) / 2.0;
        normalData[i + 1] = (volumeData[index(x, y - 1, z)] - volumeData[index(x, y + 1, z)]) / 2.0;
        normalData[i + 2] = (volumeData[index(x, y, z - 1)] - volumeData[index(x, y, z + 1)]) / 2.0;

        const factor = Math.max(Math.abs(normalData[i]), Math.max(Math.abs(normalData[i + 1]), Math.abs(normalData[i + 2])));
            normalData[i] /= factor;
            normalData[i + 1] /= factor;
            normalData[i + 2] /= factor;
    }
    const t1 = performance.now()
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
        nWidth,
        nHeight,
        nDepth,
        0,
        gl.RGB,
        gl.FLOAT,
        normalData
    );

    return new LoadedTextureData(volumeData, height, width, depth, scale);
}

export class LoadedTextureData {
    public data: Float32Array;
    public height: number;
    public width: number;
    public depth: number;
    public scale: mat4;

    constructor(data: Float32Array, height: number, width: number, depth: number, scale: mat4) {
        this.data = data;
        this.height = height;
        this.width = width;
        this.depth = depth;
        this.scale = scale;
    }
}
