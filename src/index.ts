//import {Parser} from "binary-parser";

import {Parser} from "binary-parser";

import vert from './source.vert';
import frag from './source.frag';
import { mat4 } from "gl-matrix";

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
        var byteArray = new Int16Array(buffer);
        var floatArray = new Float32Array(byteArray);

        var width = byteArray[0];
        var height = byteArray[1];
        var depth = byteArray[2];

        console.log(width, height, depth);
        //console.log(byteArray.slice(3).sort().reverse()[0]);

        var texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_3D, texture);
    
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_BASE_LEVEL, 0);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAX_LEVEL, 0);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        let volumeData = floatArray.slice(3);
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

async function Init() {

    const canvas = <HTMLCanvasElement>document.querySelector("#theCanvas");

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
          depth: gl.getUniformLocation(shaderProgram, "uDepth")
        },
      };
    

    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = canvas.clientWidth / canvas.clientHeight;
    console.log(canvas.width, canvas.height);
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
    //mat4.ortho(projectionMatrix, 0.0, 0.0, 1.0, 1.0, zNear, zFar);

    await loadData("./data/hand.dat", gl);
    
    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix, modelViewMatrix, [-.5,-0.5, -3.0]);

    let mesh = new Mesh();
    mesh.set_positions([
        0.0, 0.0, 0.0,
        0.0, 0.0, 1.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 1.0,
        1.0, 0.0, 0.0,
        1.0, 0.0, 1.0,
        1.0, 1.0, 0.0,
        1.0, 1.0, 1.0        
    ], [
        0,1,3,  0,2,3, // negative x
        4,5,7,  4,6,7, // positive x
        0,1,5,  0,4,5, // negative y
        2,3,7,  2,6,7, // positive y
        0,2,6,  0,4,6, // negative z
        1,3,7,  1,5,7, // positive z
    ]);
      
    let renderLoop = () => {
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
