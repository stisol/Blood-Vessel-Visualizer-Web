//import {Parser} from "binary-parser";

import {Parser} from "binary-parser";

import vert from './source.vert';
import frag from './source.frag';
import { mat4, vec3 } from "gl-matrix";

import Mesh from './mesh';

console.debug("Hello, world!");

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl : WebGL2RenderingContext, vsSource:string, fsSource:string) {
    const vertexShader = <WebGLShader>loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = <WebGLShader>loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
  
    // Create the shader program
  
    const shaderProgram = <WebGLProgram>gl.createProgram();
    
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
  
    // If creating the shader program failed, alert
  
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
      return null;
    }
  
    return shaderProgram;
  }
  
  //
  // creates a shader of the given type, uploads the source and
  // compiles it.
  //
  function loadShader(gl : WebGL2RenderingContext, type : number, source : string) {
    const shader = <WebGLShader>gl.createShader(type);
  
    // Send the source to the shader object
    gl.shaderSource(shader, source);
  
    // Compile the shader program
    gl.compileShader(shader);
  
    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  function makeRequest(method:string, url:string, responseType: XMLHttpRequestResponseType) {
    return new Promise(function (resolve, reject) {
        let xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.responseType = responseType;
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                resolve(xhr.response);
            } else {
                reject({
                    status: this.status,
                    statusText: xhr.statusText
                });
            }
        };
        xhr.onerror = function () {
            reject({
                status: this.status,
                statusText: xhr.statusText
            });
        };
        xhr.send();
    });
}

async function loadData(url: string, gl: WebGL2RenderingContext) {

    let buffer = <ArrayBuffer>await makeRequest("GET", url, "arraybuffer");
    
    if(buffer) {
        var floatArray = new Int16Array(buffer);

        var width = floatArray[0];
        var height = floatArray[1];
        var depth = floatArray[2];
        

        console.log(width, height, depth);
        // Normalize
        console.log("Calculating max");
        let max = 0;
        for(let i = 0; i < floatArray.length; ++i) {
            max = Math.max(max, floatArray[i]);
        }
        console.log("Max is ", max);

        var texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_3D, texture);
    
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_BASE_LEVEL, 0);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAX_LEVEL, 0);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        console.log("Transforming to float");
        var volumeData = new Float32Array(floatArray.slice(3));
        console.log("Success");
        for(let i = 0; i < volumeData.length; ++i) {
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
            volumeData);
    }

}

async function resize(canvas: HTMLCanvasElement) {
    let cWidth = canvas.clientWidth;
    let cHeight = canvas.clientHeight;
    if(cWidth != canvas.width || cHeight != canvas.height) {
        console.log("reized", cWidth, cHeight);
        canvas.width = cWidth;
        canvas.height = cHeight;
    }
}

async function Init() {

    const canvas = <HTMLCanvasElement>document.querySelector("#theCanvas");
    
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const gl = canvas.getContext("webgl2");
    if (gl === null) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return;
    }
    
    let shaderProgram = <WebGLProgram>initShaderProgram(gl, vert, frag);
    const programInfo = {
        program: shaderProgram,
        uniformLocations: {
          projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
          modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
          depth: gl.getUniformLocation(shaderProgram, "uDepth"),
          eye_pos: gl.getUniformLocation(shaderProgram, "uEyePosition")
        },
      };
    

    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = canvas.clientWidth / canvas.clientHeight;
    console.log(canvas.width, canvas.height);
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
    //mat4.ortho(projectionMatrix, -1.0, 1.0, 1.0, -1.0, zNear, zFar);
    //mat4.ortho(projectionMatrix, 0.0, 0.0, 1.0, 1.0, zNear, zFar);

    await loadData("./data/hand.dat", gl);
    
    const modelViewMatrix = mat4.create();
    let mesh = new Mesh();
    mesh.set_positions([
        // Front face
        0.0, 0.0,  1.0,
        1.0, 0.0,  1.0,
        1.0,  1.0,  1.0,
        0.0,  1.0,  1.0,
        
        // Back face
        0.0, 0.0, 0.0,
        0.0,  1.0, 0.0,
        1.0,  1.0, 0.0,
        1.0, 0.0, 0.0,
        
        // Top face
        0.0,  1.0, 0.0,
        0.0,  1.0,  1.0,
        1.0,  1.0,  1.0,
        1.0,  1.0, 0.0,
        
        // Bottom face
        0.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, 0.0,  1.0,
        0.0, 0.0,  1.0,
        
        // Right face
        1.0, 0.0, 0.0,
        1.0,  1.0, 0.0,
        1.0,  1.0,  1.0,
        1.0, 0.0,  1.0,
        
        // Left face
        0.0, 0.0, 0.0,
        0.0, 0.0,  1.0,
        0.0,  1.0,  1.0,
        0.0,  1.0, 0.0,     
    ], [
        0,  1,  2,      0,  2,  3,    // front
        4,  5,  6,      4,  6,  7,    // back
        8,  9,  10,     8,  10, 11,   // top
        12, 13, 14,     12, 14, 15,   // bottom
        16, 17, 18,     16, 18, 19,   // right
        20, 21, 22,     20, 22, 23,   // left
    ]);
      
    let degree = 0.0;
    let renderLoop = () => {
        resize(canvas);
        gl.viewport(0,0,canvas.width,canvas.height);

        degree += 0.01;
        let eye : vec3 = [3.5 * Math.cos(degree),  3.5 * Math.sin(degree/4.0), 3.5 * Math.sin(degree)];
        mat4.lookAt(modelViewMatrix, eye, [0.5, 0.5, 0.5], [0.0, 1.0, 0.0]);

        gl.clearColor(0.0,0.0,0.0,1.0);
        gl.clearDepth(1.0);  
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        

        // Setup required OpenGL state for drawing the back faces and
        // composting with the background color
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        gl.useProgram(programInfo.program);
        gl.uniform3fv(programInfo.uniformLocations.eye_pos, eye);
        
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix);
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            modelViewMatrix);
        let depth = (<HTMLElement>document.getElementById("myRange")).value;
        gl.uniform1f(programInfo.uniformLocations.depth,depth);
        {
            mesh.bind_shader(gl, programInfo.program);
            gl.drawElements(gl.TRIANGLES, mesh.get_count(), gl.UNSIGNED_SHORT, 0);
        }
        requestAnimationFrame(renderLoop);
    };
    requestAnimationFrame(renderLoop);
}


Init();

/*
fetch("./data/hand.dat")
.then((response) => {
    return response.text();
    
}).then(parseData)
.catch(console.error);*/
