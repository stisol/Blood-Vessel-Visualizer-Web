import vert from "./source.vert";
import frag from "./source.frag";

import viewVert from "./viewsource.vert";
import viewFrag from "./viewsource.frag";

import { mat4 } from "gl-matrix";
import createCubeMesh from "./cubeMesh";
import createSquareMesh from "./squareMesh";
import { initShaderProgram, bindTexture } from "./shader";
import Settings from "./settings";
import Camera from "./camera";

async function Init(): Promise<void> {
    const canvas = document.querySelector("#theCanvas") as HTMLCanvasElement;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const gl = canvas.getContext("webgl2");
    if (gl === null) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return;
    }

    const targetTextureWidth = 512;
    const targetTextureHeight = targetTextureWidth;
    const targetTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, targetTexture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
        targetTextureWidth, targetTextureHeight, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, null);

    // set the filtering so we don't need mips
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    
    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, 0);

    const shaderProgram = initShaderProgram(gl, vert, frag);
    const programInfo = {
        program: shaderProgram,
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
            depth: gl.getUniformLocation(shaderProgram, "uDepth"),
            eyePos: gl.getUniformLocation(shaderProgram, "uEyePosition"),
            textureData: gl.getUniformLocation(shaderProgram, "textureData"),
            normalData: gl.getUniformLocation(shaderProgram, "normalData"),
            lowValColor: gl.getUniformLocation(shaderProgram, "lowValColor"),
            highValColor: gl.getUniformLocation(shaderProgram, "highValColor")
        },
    };
    
    const viewProgram = initShaderProgram(gl, viewVert, viewFrag);
    const viewInfo = {
        program: viewProgram,
        uniformLocations: {
        },
    };

    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    //mat4.ortho(projectionMatrix, -1.0, 1.0, 1.0, -1.0, zNear, zFar);
    //mat4.ortho(projectionMatrix, 0.0, 0.0, 1.0, 1.0, zNear, zFar);

    let [volume, normals] = await bindTexture("./data/hand.dat", gl);

    const modelViewMatrix = mat4.create();
    const mesh = createCubeMesh();
    const view = createSquareMesh();
    const modelCenter: [number, number, number] = [0.5, 0.5, 0.5];
    const camera = new Camera(modelCenter);
    const settings = new Settings();
    const renderLoop = (): void => {
            // render to the canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, targetTextureWidth, targetTextureHeight);

        if(settings.isOrtographicCamera()) {
            mat4.ortho(projectionMatrix, -1.0, 1.0, -1.0, 1.0, zNear, zFar);
        } else {
            mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
        }

        
        const eye = camera.position();
        mat4.lookAt(modelViewMatrix, eye, modelCenter, [0.0, 1.0, 0.0]);

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

        const c1 = settings.colorSkin();
        gl.uniform3f(programInfo.uniformLocations.lowValColor, c1[0], c1[1], c1[2]);
        const c2 = settings.colorBone();
        gl.uniform3f(programInfo.uniformLocations.highValColor, c2[0], c2[1], c2[2]);

        gl.uniformMatrix4fv(
            programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix);
            
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            modelViewMatrix);

            gl.uniform1i(programInfo.uniformLocations.textureData, 0);
            gl.uniform1i(programInfo.uniformLocations.normalData, 1);
        const depth = settings.skinOpacity();
        gl.uniform1f(programInfo.uniformLocations.depth, depth);
        {
            mesh.bindShader(gl, programInfo.program);
            gl.drawElements(gl.TRIANGLES, mesh.indiceCount(), gl.UNSIGNED_SHORT, 0);
        }

        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
         
        gl.useProgram(viewInfo.program);
        // render the cube with the texture we just rendered to
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, targetTexture);
            // Tell WebGL how to convert from clip space to pixels
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0,0,0, 1);   // clear to white
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        view.bindShader(gl, viewInfo.program);
        gl.drawElements(gl.TRIANGLES, view.indiceCount(), gl.UNSIGNED_SHORT, 0.0);

        requestAnimationFrame(renderLoop);
    };
    requestAnimationFrame(renderLoop);
}

Init();
