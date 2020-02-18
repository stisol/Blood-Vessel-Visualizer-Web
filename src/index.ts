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

function parseData(data: string) {
    var dataParser = new Parser()
    .endianess("little")
    .uint8("width")
    .uint8("depth")
    .uint8("height")
    .array("src", {
        type: "uint8",
        readUntil: "eof"
    });

    var buf = Buffer.from(data);

    var parsedData = dataParser.parse(buf);
    console.log(parsedData.width);
    console.log(parsedData.height);
    console.log(parsedData.depth);
}

function Init() {

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
        },
      };
    
    gl.clearColor(0.0,0.0,0.0,1.0);
    gl.clearDepth(1.0);  
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    
    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix, modelViewMatrix, [0.0,0.0, -2.0]);

    let mesh = new Mesh();
    mesh.set_positions([-1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0]);
    mesh.set_colors([1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0]);
    mesh.bind_shader(gl, programInfo.program);
  
    gl.useProgram(programInfo.program);
    
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix);
    {
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}


Init();

/*
fetch("./data/hand.dat")
.then((response) => {
    return response.text();
    
}).then(parseData)
.catch(console.error);*/

var req = new XMLHttpRequest();
req.open("GET", "./data/hand.dat", true);
req.responseType = "arraybuffer";

req.onload = function(event) {
    var buffer = req.response;
    if(buffer) {
        var byteArray = new Uint8Array(buffer);

        var width = byteArray[0] + byteArray[1] * 256;
        var height = byteArray[2] + byteArray[3] * 256;
        var depth = byteArray[4] + byteArray[5] * 256   ;

        console.log(width, height, depth);


    }
}
req.send(null);