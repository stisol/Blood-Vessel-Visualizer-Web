

class Mesh {
    private position_buffer: WebGLBuffer | null;
    private color_buffer: WebGLBuffer | null;
    private dirty: boolean;

    private position_data : number[] | null;
    private color_data : number[] | null;
    
    constructor() {
        this.position_buffer = null;
        this.color_buffer = null;
        this.dirty = true;
        this.position_data = null;
        this.color_data = null;
    }

    set_positions(positions: number[]) {
        this.dirty = true;
        this.position_data = positions;
    }
    
    set_colors(colors: number[]) {
        this.dirty = true;
        this.color_data = colors;
    }

    private rebuild_buffers(gl: WebGL2RenderingContext) {
        if(!this.dirty) return true;

        if(this.position_data == null) {
            console.error("Position data must be set in mesh!");
            return false;
        }

        if(this.position_data != null) {
            if(this.position_buffer == null) {
                this.position_buffer = gl.createBuffer();
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, this.position_buffer);
            
            gl.bufferData(gl.ARRAY_BUFFER,
                new Float32Array(this.position_data),
                gl.STATIC_DRAW);
        }

        if(this.color_data != null) {
            if(this.color_buffer== null) {
                this.color_buffer = gl.createBuffer();
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, this.color_buffer);

            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.color_data), gl.STATIC_DRAW);
        }

        this.dirty = false;
    }

    public bind_shader(gl: WebGL2RenderingContext, shader: WebGLProgram) {
        this.rebuild_buffers(gl);

        if(this.position_buffer) {
            let vertexPosition = gl.getAttribLocation(shader, "aVertexPosition");
            gl.bindBuffer(gl.ARRAY_BUFFER, this.position_buffer);
            gl.vertexAttribPointer(vertexPosition, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vertexPosition);
        }
        
        if(this.color_buffer) {
            let colorPosition = gl.getAttribLocation(shader, "aColorPosition");
            gl.bindBuffer(gl.ARRAY_BUFFER, this.color_buffer);
            gl.vertexAttribPointer(colorPosition, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(colorPosition);

        }
    }
}

export default Mesh;