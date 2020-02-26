

class Mesh {
    private position_buffer: WebGLBuffer | null;
    private color_buffer: WebGLBuffer | null;
    private indices_buffer: WebGLBuffer | null;
    private dirty: boolean;

    public position_data : number[] | null;
    private indices_data: number[] | null;
    private color_data : number[] | null;
    
    constructor() {
        this.position_buffer = null;
        this.color_buffer = null;
        this.dirty = true;
        this.position_data = null;
        this.color_data = null;
        this.indices_data = null;
        this.indices_buffer = null;
    }

    set_positions(positions: number[], indices: number[]) {
        this.dirty = true;
        this.position_data = positions;
        this.indices_data = indices;
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

        if(this.indices_data != null) {
            if(this.indices_buffer == null) {
                this.indices_buffer = gl.createBuffer();
            }

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indices_buffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices_data), gl.STATIC_DRAW);

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

    public get_count() {
        return <number>this.indices_data?.length;
    }

    public bind_shader(gl: WebGL2RenderingContext, shader: WebGLProgram) {
        this.rebuild_buffers(gl);

        if(this.position_buffer) {
            let vertexPosition = gl.getAttribLocation(shader, "aVertexPosition");
            gl.bindBuffer(gl.ARRAY_BUFFER, this.position_buffer);
            gl.vertexAttribPointer(vertexPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vertexPosition);
        }

        
        if(this.color_buffer) {
            let colorPosition = gl.getAttribLocation(shader, "aColorPosition");
            if(colorPosition != -1) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.color_buffer);
                gl.vertexAttribPointer(colorPosition, 4, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(colorPosition);
            }
        }

        if(this.indices_buffer) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indices_buffer);
        }
    }
}

export default Mesh;