import vert from "./source.vert";
import frag from "./source.frag";
import { mat4, vec3 } from "gl-matrix";
import createCubeMesh from "./cubeMesh";
import { initShaderProgram, bindTexture } from "./shader";
import Settings from "./settings";

function resize(canvas: HTMLCanvasElement): void {
    const cWidth = canvas.clientWidth;
    const cHeight = canvas.clientHeight;
    if (cWidth != canvas.width || cHeight != canvas.height) {
        console.log("reized", cWidth, cHeight);
        canvas.width = cWidth;
        canvas.height = cHeight;
    }
}

async function Init(): Promise<void> {
    const canvas = document.querySelector("#theCanvas") as HTMLCanvasElement;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const gl = canvas.getContext("webgl2");
    if (gl === null) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return;
    }

    const shaderProgram = initShaderProgram(gl, vert, frag);
    const programInfo = {
        program: shaderProgram,
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
            depth: gl.getUniformLocation(shaderProgram, "uDepth"),
            eyePos: gl.getUniformLocation(shaderProgram, "uEyePosition")
        },
    };

    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();
    console.log(canvas.width, canvas.height);

    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
    //mat4.ortho(projectionMatrix, -1.0, 1.0, 1.0, -1.0, zNear, zFar);
    //mat4.ortho(projectionMatrix, 0.0, 0.0, 1.0, 1.0, zNear, zFar);

    await bindTexture("./data/hand.dat", gl);

    const modelViewMatrix = mat4.create();
    const mesh = createCubeMesh();

    let degree = 0.0;
    let settings = new Settings();
    const renderLoop = (): void => {
        resize(canvas);
        gl.viewport(0, 0, canvas.width, canvas.height);

        degree += 0.01;
        const eye: vec3 = [3.5 * Math.cos(degree), 3.5 * Math.sin(degree / 4.0), 3.5 * Math.sin(degree)];
        mat4.lookAt(modelViewMatrix, eye, [0.5, 0.5, 0.5], [0.0, 1.0, 0.0]);

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


        // Setup required OpenGL state for drawing the back faces and
        // composting with the background color
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        gl.useProgram(programInfo.program);
        gl.uniform3fv(programInfo.uniformLocations.eyePos, eye);

        gl.uniformMatrix4fv(
            programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix);
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            modelViewMatrix);
        const depth = settings.skinOpacity();
        gl.uniform1f(programInfo.uniformLocations.depth, depth);
        {
            mesh.bindShader(gl, programInfo.program);
            gl.drawElements(gl.TRIANGLES, mesh.indiceCount(), gl.UNSIGNED_SHORT, 0);
        }
        requestAnimationFrame(renderLoop);
    };
    requestAnimationFrame(renderLoop);
}

Init();
