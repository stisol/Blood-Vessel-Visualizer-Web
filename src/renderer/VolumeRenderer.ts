import TransferFunctionController from "../transferFunction";
import { LoadedTextureData, initShaderProgram } from "../shader";
import Settings from "../settings";
import Camera from "../camera";
import RenderTarget from "../renderTarget";

import vert from "../shaders/source.vert";
import frag from "../shaders/source.frag";
import { vec3, vec4, mat4 } from "gl-matrix";
import createCubeMesh from "../meshes/cubeMesh";
import Mesh from "../mesh";

export default class VolumeRenderer {

    private programInfo: ProgramInfo;

    private transferFunction: TransferFunctionController;

    private mesh: Mesh = createCubeMesh();

    private eye: vec3;
    private lightPos: vec3;
    private transform: mat4;

    public constructor(gl: WebGL2RenderingContext, transferFunction: TransferFunctionController) {
        const shaderProgram = initShaderProgram(gl, vert, frag);
        this.programInfo = new ProgramInfo(gl, shaderProgram);
        
        this.transferFunction = transferFunction;

        this.eye = vec3.create();
        this.lightPos = vec3.create();
        this.transform = mat4.create();
    }

    render(gl: WebGL2RenderingContext, settings: Settings): void {
        
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT);

        gl.useProgram(this.programInfo.program);

        this.bindUniforms(gl, settings);
        
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.transferFunction.getTransferFunctionTexture(gl));

        this.mesh.bindShader(gl, this.programInfo.program);
        gl.drawElements(gl.TRIANGLES, this.mesh.indiceCount(), gl.UNSIGNED_SHORT, 0);
            
        gl.disable(gl.CULL_FACE);
    }

    private bindUniforms(gl: WebGL2RenderingContext, settings: Settings): void {

        const scale = settings.getLoadedData().scale;
        gl.uniform3fv(this.programInfo.uniformLocations.eyePos, this.eye);
        gl.uniform3fv(this.programInfo.uniformLocations.lightPosition, this.lightPos);

        const boxMin = vec3.transformMat4(vec3.create(), vec3.fromValues(-1.0,-1.0,-1.0), scale);
        const boxMax = vec3.transformMat4(vec3.create(), vec3.fromValues(1.0, 1.0, 1.0), scale);

        gl.uniform3fv(this.programInfo.uniformLocations.boxMin, boxMin);
        gl.uniform3fv(this.programInfo.uniformLocations.boxMax, boxMax);

        gl.uniform1i(this.programInfo.uniformLocations.lowQuality, 0);

        gl.uniform1i(this.programInfo.uniformLocations.colorAccumulationType, settings.accumulationMethod());
        

        gl.uniformMatrix4fv(
            this.programInfo.uniformLocations.projectionMatrix,
            false,
            this.transform);

        gl.uniformMatrix4fv(this.programInfo.uniformLocations.scaleMatrix, false, scale);
        
        gl.uniform1i(this.programInfo.uniformLocations.transferFunction, 2);

        gl.uniform1i(this.programInfo.uniformLocations.textureData, 0);
        gl.uniform1i(this.programInfo.uniformLocations.normalData, 1);

        gl.uniform1f(this.programInfo.uniformLocations.depth, 0);
    }

    public setEyePos(eye: vec3): void {
        this.eye = eye;
    }
    
    public setLightPos(lightPos: vec3): void {
        this.lightPos = lightPos;
    }

    public setTransform(transform: mat4): void {
        this.transform = transform;
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