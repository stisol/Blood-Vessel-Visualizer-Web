

import viewVert from "./viewsource.vert";
import viewFrag from "./viewsource.frag";

import createSquareMesh from "./squareMesh";
import { initShaderProgram, bindTexture } from "./shader";
import TransferFunctionController from "./transferFunction";

import View from './view';
import MainView from './Views/mainView';

async function Init(): Promise<void> {
    const canvas = document.querySelector("#theCanvas") as HTMLCanvasElement;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true });
    if (gl === null) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return;
    }

    const renderView: View = new MainView(gl);



    const viewProgram = initShaderProgram(gl, viewVert, viewFrag);
    const viewInfo = {
        program: viewProgram,
        uniformLocations: {
        },
    };


    //mat4.ortho(projectionMatrix, -1.0, 1.0, 1.0, -1.0, zNear, zFar);
    //mat4.ortho(projectionMatrix, 0.0, 0.0, 1.0, 1.0, zNear, zFar);

    const volumeData = await bindTexture("./data/hand.dat", gl);

    const view = createSquareMesh();
    const sidebar = document.getElementById("sidebar") as HTMLDivElement
    
    // TEMP
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const transferFunction = new TransferFunctionController(volumeData, sidebar);

    const renderLoop = (): void => {
        // render to the canvas
        const renderTarget = renderView.getRenderTarget();
        renderTarget.bindFramebuffer();

        // Setup required OpenGL state for drawing the back faces and
        // composting with the background color
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        renderView.render(canvas.clientWidth / canvas.clientHeight);

        //test = false;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.clearColor(1.0, 0.0, 1.0, 1.0);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(viewInfo.program);
        // render the cube with the texture we just rendered to
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, renderTarget.getTexture());
        // Tell WebGL how to convert from clip space to pixels
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0, 0, 0, 1);   // clear to white

        view.bindShader(gl, viewInfo.program);
        gl.drawElements(gl.TRIANGLES, view.indiceCount(), gl.UNSIGNED_SHORT, 0.0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, null);

        requestAnimationFrame(renderLoop);
    };
    requestAnimationFrame(renderLoop);
}

Init();

