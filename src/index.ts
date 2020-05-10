import viewVert from "./shaders/view.vert";
import viewFrag from "./shaders/view.frag";

import createSquareMesh from "./meshes/squareMesh";
import { initShaderProgram, bindTexture } from "./shader";
import TransferFunctionController from "./transferFunction";

import MainView from './Views/mainView';
import SliceView from './Views/sliceView';
import Camera from "./camera";
import Settings from "./settings";
import MinimapView from "./Views/minimapView";
import { mat4, vec3 } from "gl-matrix";
import RayCasterController from "./rayCaster";

async function Init(): Promise<void> {
    const canvas = document.querySelector("#theCanvas") as HTMLCanvasElement;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true });
    if (gl === null) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return;
    }

    let loadedData = await bindTexture("./data/hand.dat", "./data/hand.ini", gl);
    
    const settings = new Settings(loadedData);
    const sidebar = document.getElementById("sidebar") as HTMLDivElement;
    const transferFunction = new TransferFunctionController(sidebar, settings);
    const renderView = new MainView(gl, transferFunction);
    const renderSlice = new SliceView(gl, renderView.getRenderTarget(), settings);
    const camera = new Camera([0.5, 0.5, 0.5], document.getElementById("theCanvas") as HTMLCanvasElement);
    const view = createSquareMesh(-1.0, 1.0);
    const rayCasterController = new RayCasterController(loadedData, sidebar, settings, camera);

    const minimap = new MinimapView(gl, transferFunction);

    const viewProgram = initShaderProgram(gl, viewVert, viewFrag);
    const viewInfo = {
        program: viewProgram,
        uniformLocations: {
            transform: gl.getUniformLocation(viewProgram, "uTransform")
        },
    };

    let forceUpdate = false;
    let file = settings.getFile();
    let newFile = file;

    // eslint-disable-next-line no-constant-condition
    const renderLoop = (): void => {
        // render to the canvas
        // Setup required OpenGL state for drawing the back faces and
        // composting with the background color
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        
        const settingsUpdated = settings.isUpdated() || transferFunction.transferFunctionUpdated;
        const sliceUpdated = renderSlice.textureUpdated;
        const newFrame = renderView.updateFps(camera, settings, settingsUpdated);
        const aspect = canvas.clientWidth / canvas.clientHeight;
        rayCasterController.aspect = aspect;

        if (newFrame || settingsUpdated || sliceUpdated || forceUpdate) {
            forceUpdate = false;
            renderView.getRenderTarget().bindFramebuffer();
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clearDepth(1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            renderSlice.render(aspect, camera, settings, loadedData);
            renderView.render(aspect, camera, settings, loadedData);
            minimap.setViewAspectRatio(aspect);
            minimap.getRenderTarget().bindFramebuffer();
            minimap.render(1.0, camera, settings, loadedData);
        }

        //test = false;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.disable(gl.DEPTH_TEST);

        gl.useProgram(viewInfo.program);
        // render the cube with the texture we just rendered to
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, renderView.getRenderTarget().getTexture());

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0, 0, 0, 1);   
        
        gl.uniformMatrix4fv(
            viewInfo.uniformLocations.transform,
            false,
            mat4.create());// clear to white

        view.bindShader(gl, viewInfo.program);
        gl.drawElements(gl.TRIANGLES, view.indiceCount(), gl.UNSIGNED_SHORT, 0.0);


        gl.bindTexture(gl.TEXTURE_2D, minimap.getRenderTarget().getTexture());
        gl.viewport(0, 0, gl.canvas.width / aspect, gl.canvas.height);

        const minimapTransform = mat4.create();
        mat4.translate(minimapTransform, minimapTransform, vec3.fromValues(-0.8, 0.8, 0.0));
        mat4.scale(minimapTransform, minimapTransform, vec3.fromValues(0.2, 0.2, 0.2));
        gl.uniformMatrix4fv(
            viewInfo.uniformLocations.transform,
            false,
            minimapTransform);// clear to white
        gl.drawElements(gl.TRIANGLES, view.indiceCount(), gl.UNSIGNED_SHORT, 0.0);
        
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.enable(gl.DEPTH_TEST);

        requestAnimationFrame(renderLoop);
    };
    requestAnimationFrame(renderLoop);

    const reloadFileWatcher = async (): Promise<void> => {
        newFile = settings.getFile();
        if (file != newFile) {
            file = newFile;
            loadedData = await bindTexture(file + ".dat", file + ".ini", gl);
            settings.setLoadedData(loadedData);
            
            renderSlice.recalculate();
            transferFunction.recalculate();
            forceUpdate = true;
        }
        await new Promise(resolve => setTimeout(() => resolve(reloadFileWatcher()), 1000));
    }
    reloadFileWatcher();
}

Init();

