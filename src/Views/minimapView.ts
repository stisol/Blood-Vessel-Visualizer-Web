import View from "../view";
import Camera from "../camera";
import Settings from "../settings";
import { LoadedTextureData, initShaderProgram } from "../shader";
import TransferFunctionController from "../transferFunction";
import VolumeRenderer from "../renderer/VolumeRenderer";
import RenderTarget from "../renderTarget";
import { mat4, vec4, vec3 } from "gl-matrix";
import Light from "../light";
import Mesh from "../mesh";
import createSquareMesh from "../meshes/squareMesh";

import viewVert from "../shaders/view.vert";
import viewFrag from "../shaders/view.frag";
export default class MinimapView implements View {

    private gl: WebGL2RenderingContext;
    private volumeRenderer: VolumeRenderer;
    private renderTarget: RenderTarget;

    private projectionMatrix: mat4 = mat4.create();
    private modelViewMatrix: mat4 = mat4.create();

    private lights: Light;

    private outline: Mesh;
    private cameraOutline: Mesh;

    private viewInfo: any;

    private viewAspect: number;

    public constructor(gl: WebGL2RenderingContext, transferFunction: TransferFunctionController) {
        this.gl = gl;
        this.volumeRenderer = new VolumeRenderer(gl, transferFunction);
        this.renderTarget = new RenderTarget(gl, 256, 256);

        this.outline = createSquareMesh(-1.0, 1.0, true, 0.02);
        this.cameraOutline = createSquareMesh(-1.0, 1.0, true, 0.04);
        this.lights = new Light(gl);
        
        const viewProgram = initShaderProgram(gl, viewVert, viewFrag);
        this.viewInfo = {
            program: viewProgram,
            uniformLocations: {
                transform: gl.getUniformLocation(viewProgram, "uTransform"),
                disabledTexture: gl.getUniformLocation(viewProgram, "disabledTexture"),
            },
        };
        this.viewAspect = 1.0;
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

        gl.useProgram(this.viewInfo.program);

        gl.uniformMatrix4fv(
            this.viewInfo.uniformLocations.transform,
            false,
            mat4.create());

        gl.uniform1i(this.viewInfo.uniformLocations.disabledTexture, 1);

        this.outline.bindShader(gl, this.viewInfo.program);
        gl.drawElements(gl.TRIANGLES, this.outline.indiceCount(), gl.UNSIGNED_SHORT, 0);
        

        const cameraZoom = camera.getZoomFactor();
        const cameraOffset = camera.getTranslation();
        const nOffset = vec3.negate(vec3.create(), cameraOffset)
        const scaleVector =  vec3.fromValues(1/cameraZoom, 1/cameraZoom, 1/cameraZoom);
        const transform = mat4.create();
        mat4.scale(transform, transform, scaleVector);

        vec3.mul(nOffset, nOffset, scaleVector);

        mat4.translate(transform, transform, vec3.fromValues(nOffset[0], nOffset[1], 0.0));

        gl.uniformMatrix4fv(
            this.viewInfo.uniformLocations.transform,
            false,
            transform);

        this.cameraOutline.bindShader(gl, this.viewInfo.program);
        gl.drawElements(gl.TRIANGLES, this.cameraOutline.indiceCount(), gl.UNSIGNED_SHORT, 0);
    }

    setViewAspectRatio(aspect: number): void {
        this.viewAspect = aspect;
    }

    getRenderTarget(): RenderTarget {
        return this.renderTarget;
    }

}