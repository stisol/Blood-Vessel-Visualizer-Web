import View from '../view';
import RenderTarget from '../renderTarget';
import Settings from '../settings';
import { mat4 } from 'gl-matrix';
import Camera from '../camera';
import Mesh from '../mesh';
import createCubeMesh from '../cubeMesh';

import vert from "../source.vert";
import frag from "../source.frag";
import { initShaderProgram } from '../shader';

class MainView implements View {

    private gl: WebGL2RenderingContext;
    private renderTarget: RenderTarget;

    private settings: Settings;
    private camera: Camera;

    private projectionMatrix: mat4 = mat4.create();
    private modelViewMatrix: mat4 = mat4.create();

    private mesh: Mesh = createCubeMesh();

    private programInfo: any;

    private modelCenter: [number, number, number] = [0.5, 0.5, 0.5];

    private deltaTime: number;
    private fpsLog: number[] = [];

    private maxResolutionWidth: number;
    private maxResolutionHeight: number;

    private lastSettingsUpdate = 0;
    
    public constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;

        this.maxResolutionWidth = 1024 ;
        this.maxResolutionHeight = this.maxResolutionWidth;
    
        this.renderTarget = new RenderTarget(gl, this.maxResolutionWidth, this.maxResolutionHeight);

        this.settings = new Settings();
        this.camera = new Camera(this.modelCenter);

        this.deltaTime = 0.0;

        const shaderProgram = initShaderProgram(gl, vert, frag);
        this.programInfo = {
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
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    render(aspect: number): void {
        const gl = this.gl;
        if(this.updateFps()) {

            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clearDepth(1.0);
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LEQUAL);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.viewport(0, 0, this.renderTarget.getWidth(), this.renderTarget.getHeight());

            const zNear = 0.1;
            const zFar = 100.0;
            if (this.settings.isOrtographicCamera()) {
                mat4.ortho(this.projectionMatrix, -1.0, 1.0, -1.0, 1.0, zNear, zFar);
            } else {
                const fieldOfView = 45 * Math.PI / 180;   // in radians
                mat4.perspective(this.projectionMatrix, fieldOfView, 
                    aspect, zNear, zFar);
            }

            const eye = this.camera.position();
            mat4.lookAt(this.modelViewMatrix, eye, this.modelCenter, [0.0, 1.0, 0.0]);
            
            gl.useProgram(this.programInfo.program);
            gl.uniform3fv(this.programInfo.uniformLocations.eyePos, eye);

            const c1 = this.settings.colorSkin();
            gl.uniform3f(this.programInfo.uniformLocations.lowValColor, c1[0], c1[1], c1[2]);
            const c2 = this.settings.colorBone();
            gl.uniform3f(this.programInfo.uniformLocations.highValColor, c2[0], c2[1], c2[2]);

            gl.uniformMatrix4fv(
                this.programInfo.uniformLocations.projectionMatrix,
                false,
                this.projectionMatrix);

            gl.uniformMatrix4fv(
                this.programInfo.uniformLocations.modelViewMatrix,
                false,
                this.modelViewMatrix);

            gl.uniform1i(this.programInfo.uniformLocations.textureData, 0);
            gl.uniform1i(this.programInfo.uniformLocations.normalData, 1);
            const depth = this.settings.skinOpacity();
            gl.uniform1f(this.programInfo.uniformLocations.depth, depth);
            {
                this.mesh.bindShader(gl, this.programInfo.program);
                gl.drawElements(gl.TRIANGLES, this.mesh.indiceCount(), gl.UNSIGNED_SHORT, 0);
            }
        }
    }

    getRenderTarget(): RenderTarget {
        return this.renderTarget;
    }


    private updateFps(): boolean {

        const newTime = window.performance.now();
        const fps = 1/(newTime - this.deltaTime) * 1000;
        if(this.deltaTime == 0.0) {
            this.deltaTime = newTime;
            return true;
        }
        this.deltaTime = newTime;

        this.fpsLog.push(fps);
        if(this.fpsLog.length > 5) {
            this.fpsLog.shift();
        } 
        this.settings.setFps(Math.round(fps).toString());
        
        const viewUpdated = this.settings.isUpdated() || this.camera.isUpdated();
        if (!viewUpdated && this.lastSettingsUpdate + 1000 < Date.now()) {
            const doUpdate = this.maxResolutionWidth != this.renderTarget.getWidth() ||
                this.maxResolutionHeight != this.renderTarget.getHeight();
            this.renderTarget.resize(this.maxResolutionWidth, this.maxResolutionHeight);
            return doUpdate;
        }

        if(viewUpdated) {
            this.lastSettingsUpdate = Date.now();
        }
        
        let  factor = fps / 30.0;
        factor = Math.max(Math.min(Math.sqrt(factor), 1.0), 0.1);
        let newFactor = Math.round(factor * 10) / 10;
        newFactor = Math.max(Math.min(newFactor, 1.0), 0.1);
        if(newFactor < 1.0) {
            const renderWidth = Math.round(this.renderTarget.getWidth() * newFactor);
            const renderHeight = Math.round(this.renderTarget.getHeight() * newFactor);

            this.renderTarget.resize(renderWidth, renderHeight);
        }
        return true;
    }
}

export default MainView;