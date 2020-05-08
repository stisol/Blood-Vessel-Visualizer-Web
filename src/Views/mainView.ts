import View from '../view';
import RenderTarget from '../renderTarget';
import Settings from '../settings';
import { mat4, vec3, vec4 } from 'gl-matrix';
import Camera from '../camera';
import Mesh from '../mesh';
import createCubeMesh from '../meshes/cubeMesh';

import vert from "../shaders/source.vert";
import frag from "../shaders/source.frag";
import { initShaderProgram, LoadedTextureData } from '../shader';
import TransferFunctionController from '../transferFunction';
import Light from '../light';

export default class MainView implements View {

    private gl: WebGL2RenderingContext;
    private renderTarget: RenderTarget;

    private projectionMatrix: mat4 = mat4.create();
    private modelViewMatrix: mat4 = mat4.create();

    private mesh: Mesh = createCubeMesh();

    private programInfo: ProgramInfo;

    private deltaTime: number;
    private fpsLog: number[] = [];

    private maxResolutionWidth: number;
    private maxResolutionHeight: number;

    private paused = false;
    private prePauseRes: [number, number];

    private transferFunction: TransferFunctionController;
    private transferFunctionTexture: WebGLTexture;

    private lastSettingsUpdate = 0;

    private lights: Light;
    
    public constructor(gl: WebGL2RenderingContext, transferFunction: TransferFunctionController) {
        this.gl = gl;

        this.maxResolutionWidth = 2048;
        this.maxResolutionHeight = this.maxResolutionWidth;
        this.prePauseRes = [this.maxResolutionWidth, this.maxResolutionHeight];
        this.renderTarget = new RenderTarget(gl, this.maxResolutionWidth, this.maxResolutionHeight);

        // Transfer function setup
        
        this.transferFunction = transferFunction;
        this.transferFunctionTexture = gl.createTexture() as WebGLTexture;
        
        this.lights = new Light(gl);

        this.deltaTime = 0.0;

        const shaderProgram = initShaderProgram(gl, vert, frag);
        this.programInfo = new ProgramInfo(gl, shaderProgram);
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    render(aspect: number, camera: Camera, settings: Settings, loadedData: LoadedTextureData): void {
        const gl = this.gl;
        
        this.renderTarget.bindFramebuffer();

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT);
        gl.viewport(0, 0, this.renderTarget.getWidth(), this.renderTarget.getHeight());

        const zNear = 0.1;
        const zFar = 40.0;
        if (settings.isOrtographicCamera()) {
            mat4.ortho(this.projectionMatrix, -1.0, 1.0, -1.0, 1.0, zNear, zFar);
        } else {
            const fieldOfView = 45 * Math.PI / 180;   // in radians
            mat4.perspective(this.projectionMatrix, fieldOfView, 
                aspect, zNear, zFar);
        }
        
        this.modelViewMatrix = mat4.copy(mat4.create(), camera.getTransform());
        //mat4.translate(this.modelViewMatrix, this.modelViewMatrix, vec3.negate(vec3.create(), this.modelCenter));

        const eye4 = vec4.transformMat4(vec4.create(), vec4.fromValues(0.0, 0.0, 0.0, 1.0), mat4.invert(mat4.create(), this.modelViewMatrix));
        const eye = vec3.fromValues(eye4[0], eye4[1], eye4[2]);

        const scale = loadedData.scale;

        const lightTransform = settings.lightTransform();
        const lightPos = vec3.fromValues(0.0, 0.0, settings.lightDistance());
        vec3.transformMat4(lightPos, lightPos, lightTransform);
        vec3.add(lightPos, lightPos, vec3.fromValues(0.0, 0.0, 0.0));
        
        gl.useProgram(this.programInfo.program);
        gl.uniform3fv(this.programInfo.uniformLocations.eyePos, eye);
        gl.uniform3fv(this.programInfo.uniformLocations.lightPosition, lightPos);
        
        const boxMin = vec3.transformMat4(vec3.create(), vec3.fromValues(-1.0,-1.0,-1.0), scale);
        const boxMax = vec3.transformMat4(vec3.create(), vec3.fromValues(1.0, 1.0, 1.0), scale);
        gl.uniform3fv(this.programInfo.uniformLocations.boxMin, boxMin);
        gl.uniform3fv(this.programInfo.uniformLocations.boxMax, boxMax);

        gl.uniform1i(this.programInfo.uniformLocations.lowQuality, this.paused ? 0 : 1);

        gl.uniform1i(this.programInfo.uniformLocations.colorAccumulationType, settings.accumulationMethod());
        const matrix = mat4.create();
        //mat4.multiply(matrix, this.modelViewMatrix, modelScale);
        mat4.multiply(matrix, this.projectionMatrix, this.modelViewMatrix);

        gl.uniformMatrix4fv(
            this.programInfo.uniformLocations.projectionMatrix,
            false,
            matrix);
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.scaleMatrix, false, scale);

            
        // Check for transfer function update
        const tf = this.transferFunction;
        if (tf.transferFunctionUpdated) {
            const tex = tf.getTransferFunctionTexture();
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, this.transferFunctionTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, tex);
        }
        else {
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, this.transferFunctionTexture);
        }
        gl.uniform1i(this.programInfo.uniformLocations.transferFunction, 2);

        gl.uniform1i(this.programInfo.uniformLocations.textureData, 0);
        gl.uniform1i(this.programInfo.uniformLocations.normalData, 1);
        gl.uniform1f(this.programInfo.uniformLocations.depth, 0);
        {
            this.mesh.bindShader(gl, this.programInfo.program);
            gl.drawElements(gl.TRIANGLES, this.mesh.indiceCount(), gl.UNSIGNED_SHORT, 0);
        }
        gl.disable(gl.CULL_FACE);

        const faceMatrix = mat4.create();
        const lightMatrix = mat4.create();

        mat4.targetTo(faceMatrix, lightPos, eye, [0.0, 1.0, 0.0]);
        mat4.multiply(lightMatrix, faceMatrix, lightMatrix);
        mat4.multiply(lightMatrix, this.modelViewMatrix, lightMatrix);
        mat4.multiply(lightMatrix, this.projectionMatrix, lightMatrix);

        this.lights.draw(lightMatrix, vec3.create());        
    }

    getRenderTarget(): RenderTarget {
        return this.renderTarget;
    }

    // Returns true if another frame should be rendered, false if we should sleep
    public updateFps(camera: Camera, settings: Settings, settingsUpdated: boolean): boolean {
        // FPS calculation.
        const optimalFps = 30;
        const newTime = window.performance.now();
        const fps = 1/Math.max(newTime - this.deltaTime, 1) * 1000;

        // First frame handling
        if(this.deltaTime == 0.0) {
            this.deltaTime = newTime;
            return true;
        }
        this.deltaTime = newTime;

        // Rolling log of framerates for average calculation
        const fpsLogLength = 5;
        this.fpsLog.push(fps);
        if(this.fpsLog.length > fpsLogLength) {
            this.fpsLog.shift();
        } 
        const avgFps = this.fpsLog.reduce((a, b) => a+b, 0) / fpsLogLength;
        
        // Check if it's time to pause rendering.
        const viewUpdated = settingsUpdated || camera.isUpdated();
        if (!viewUpdated && this.lastSettingsUpdate + 750 < Date.now()) {
            if (this.paused) return false;
            this.paused = true;
            settings.setFps("Paused");
            
            const w = this.renderTarget.getWidth();
            const h = this.renderTarget.getHeight();
            this.prePauseRes = [w, h];
            console.debug("PAUSE: " + w + "x" + h);
            
            // Reset resolution to max if needed and render 1 last frame
            //const needAnotherFrame = this.maxResolutionWidth != w || this.maxResolutionHeight != h;
            const needAnotherFrame = true;
            if (needAnotherFrame) {
                this.renderTarget.resize(this.maxResolutionWidth, this.maxResolutionHeight);
            }
            return needAnotherFrame;
        }
        settings.setFps(Math.round(avgFps).toString());

        // If the view has updated, store the time for later comparison.
        if(viewUpdated) this.lastSettingsUpdate = Date.now();

        // If we were just paused, reset resolution to pre-pause levels
        if (this.paused) {
            this.paused = false;
            this.renderTarget.resize(this.prePauseRes[0], this.prePauseRes[1]);
            return true;
        }
        
        // Check if framerate means a resolution drop should be made.
        const minimumResolutionFactor = 0.2;
        const minW = this.maxResolutionWidth * minimumResolutionFactor;
        const minH = this.maxResolutionHeight * minimumResolutionFactor;
        
        const currentWidth = this.renderTarget.getWidth();
        const currentHeight = this.renderTarget.getHeight();

        let factor = fps / optimalFps;
        factor = Math.round(factor * 10) / 10;         // Round it
        factor = Math.max(Math.min(factor, 1.0), 0.8); // Cap per-frame change
        if(factor < 1.0 && avgFps < optimalFps) {
            const renderWidth  = Math.round(Math.max(currentWidth * factor, minW));
            const renderHeight = Math.round(Math.max(currentHeight * factor, minH));
            this.renderTarget.resize(renderWidth, renderHeight);
        }
        console.debug("REND:  " + this.renderTarget.getWidth() + "x" + this.renderTarget.getHeight());
        return true;
    }
}

class ProgramInfo {
    program: WebGLShader;
    uniformLocations: UniformLocations;

    constructor(gl: WebGL2RenderingContext, program: WebGLShader) {
        this.program = program;
        this.uniformLocations = new UniformLocations(gl, program);
    }
}

class UniformLocations {
    projectionMatrix: WebGLUniformLocation;
    modelViewMatrix: WebGLUniformLocation;
    scaleMatrix: WebGLUniformLocation;
    depth: WebGLUniformLocation;
    transferFunction: WebGLUniformLocation;
    eyePos: WebGLUniformLocation;
    textureData: WebGLUniformLocation;
    normalData: WebGLUniformLocation;
    colorAccumulationType: WebGLUniformLocation;
    lightPosition: WebGLUniformLocation;
    boxMin: WebGLUniformLocation;
    boxMax: WebGLUniformLocation;
    lowQuality: WebGLUniformLocation;

    constructor(gl: WebGL2RenderingContext, shaderProgram: WebGLShader) {        
        this.projectionMatrix = 
            gl.getUniformLocation(shaderProgram, "uProjectionMatrix") as WebGLUniformLocation;
        this.modelViewMatrix = 
            gl.getUniformLocation(shaderProgram, "uModelViewMatrix") as WebGLUniformLocation;
        this.scaleMatrix = 
            gl.getUniformLocation(shaderProgram, "uScaleMatrix") as WebGLUniformLocation;
        this.depth = 
            gl.getUniformLocation(shaderProgram, "uDepth") as WebGLUniformLocation;
        this.transferFunction = 
            gl.getUniformLocation(shaderProgram, "uTransferFunction") as WebGLUniformLocation;
        this.eyePos = 
            gl.getUniformLocation(shaderProgram, "uEyePosition") as WebGLUniformLocation;
        this.textureData = 
            gl.getUniformLocation(shaderProgram, "textureData") as WebGLUniformLocation;
        this.normalData = 
            gl.getUniformLocation(shaderProgram, "normalData") as WebGLUniformLocation;
        this.colorAccumulationType = 
            gl.getUniformLocation(shaderProgram, "colorAccumulationType") as WebGLUniformLocation;
        this.lightPosition = 
            gl.getUniformLocation(shaderProgram, "lightPos") as WebGLUniformLocation;
        this.boxMin = 
            gl.getUniformLocation(shaderProgram, "box_min") as WebGLUniformLocation;
        this.boxMax = 
            gl.getUniformLocation(shaderProgram, "box_max") as WebGLUniformLocation;
        this.lowQuality = 
            gl.getUniformLocation(shaderProgram, "lowQuality") as WebGLUniformLocation;
    }
}