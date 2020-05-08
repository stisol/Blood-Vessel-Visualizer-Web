import View from "../view";
import Camera from "../camera";
import Settings from "../settings";
import { LoadedTextureData } from "../shader";
import TransferFunctionController from "../transferFunction";
import VolumeRenderer from "../renderer/VolumeRenderer";
import RenderTarget from "../renderTarget";
import { mat4, vec4, vec3 } from "gl-matrix";
import Light from "../light";

export default class MinimapView implements View {

    private gl: WebGL2RenderingContext;
    private volumeRenderer: VolumeRenderer;
    private renderTarget: RenderTarget;

    private projectionMatrix: mat4 = mat4.create();
    private modelViewMatrix: mat4 = mat4.create();

    private lights: Light;

    public constructor(gl: WebGL2RenderingContext, transferFunction: TransferFunctionController) {
        this.gl = gl;
        this.volumeRenderer = new VolumeRenderer(gl, transferFunction);
        this.renderTarget = new RenderTarget(gl, 256, 256);


        this.lights = new Light(gl);
    }

    render(aspect: number, camera: Camera, settings: Settings, loadedData: LoadedTextureData): void {
        const gl = this.gl;

        this.renderTarget.bindFramebuffer();
        gl.viewport(0, 0, this.renderTarget.getWidth(), this.renderTarget.getHeight());
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


        const zNear = 0.1;
        const zFar = 40.0;
        if (settings.isOrtographicCamera()) {
            mat4.ortho(this.projectionMatrix, -1.0, 1.0, -1.0, 1.0, zNear, zFar);
        } else {
            const fieldOfView = 45 * Math.PI / 180;   // in radians
            mat4.perspective(this.projectionMatrix, fieldOfView, 
                aspect, zNear, zFar);
        }
        
        this.modelViewMatrix = mat4.create();
        mat4.translate(this.modelViewMatrix, this.modelViewMatrix, vec3.fromValues(0.0, 0.0, -4.0));
        mat4.mul(this.modelViewMatrix, this.modelViewMatrix, camera.getRotation());
        settings.multiplyLightTransform(camera.getTransform());
        //mat4.translate(this.modelViewMatrix, this.modelViewMatrix, vec3.negate(vec3.create(), this.modelCenter));

        const eye4 = vec4.transformMat4(vec4.create(), vec4.fromValues(0.0, 0.0, 0.0, 1.0), mat4.invert(mat4.create(), this.modelViewMatrix));
        const eye = vec3.fromValues(eye4[0], eye4[1], eye4[2]);

        const lightTransform = settings.lightTransform();
        const lightPos = vec3.fromValues(0.0, 0.0, settings.lightDistance());
        vec3.transformMat4(lightPos, lightPos, lightTransform);
        vec3.add(lightPos, lightPos, vec3.fromValues(0.0, 0.0, 0.0));
        
        const matrix = mat4.create();
        //mat4.multiply(matrix, this.modelViewMatrix, modelScale);
        mat4.multiply(matrix, this.projectionMatrix, this.modelViewMatrix);

        // Setup and render the volume
        this.volumeRenderer.setEyePos(eye);
        this.volumeRenderer.setLightPos(lightPos);
        this.volumeRenderer.setTransform(matrix);
        this.volumeRenderer.render(gl, settings);

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

}