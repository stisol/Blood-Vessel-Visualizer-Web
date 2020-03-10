export class Mesh {
    private positionBuffer: WebGLBuffer | null = null;
    private colorBuffer: WebGLBuffer | null = null;
    private indiceBuffer: WebGLBuffer | null = null;
    private texCoordsBuffer: WebGLBuffer | null = null;
    private dirty: boolean;

    public positionData: number[] = [];
    private indiceData: number[] = [];
    private colorData: number[] = [];
    private texCoordsData: number[] = [];

    constructor() {
        this.dirty = true;
    }

    public setPositions(positions: number[], indices: number[]): void {
        this.dirty = true;
        this.positionData = positions;
        this.indiceData = indices;
    }

    public setColors(colors: number[]): void {
        this.dirty = true;
        this.colorData = colors;
    }
    
    public setTexturePositions(texCoords: number[]): void {
        this.dirty = true;
        this.texCoordsData = texCoords;
    }

    private rebuildBuffers(gl: WebGL2RenderingContext): void {
        if (!this.dirty) return;

        if (this.positionData == null) {
            console.error("Position data must be set in mesh!");
            return;
        }

        if (this.positionData != null) {
            if (this.positionBuffer == null) {
                this.positionBuffer = gl.createBuffer();
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);

            gl.bufferData(gl.ARRAY_BUFFER,
                new Float32Array(this.positionData),
                gl.STATIC_DRAW);
        }

        if (this.indiceData != null) {
            if (this.indiceBuffer == null) {
                this.indiceBuffer = gl.createBuffer();
            }

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indiceBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indiceData), gl.STATIC_DRAW);

        }

        if(this.texCoordsData != null) {
            if(this.texCoordsBuffer == null) {
                this.texCoordsBuffer = gl.createBuffer();
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordsBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.texCoordsData), gl.STATIC_DRAW);
        }

        if (this.colorData != null) {
            if (this.colorBuffer == null) {
                this.colorBuffer = gl.createBuffer();
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);

            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.colorData), gl.STATIC_DRAW);
        }

        this.dirty = false;
    }

    public indiceCount(): number {
        return this.indiceData?.length ?? 0;
    }

    public bindShader(gl: WebGL2RenderingContext, shader: WebGLProgram): void {
        this.rebuildBuffers(gl);

        if (this.positionBuffer) {
            const vertexPosition = gl.getAttribLocation(shader, "aVertexPosition");
            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
            gl.vertexAttribPointer(vertexPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vertexPosition);
        }


        if (this.colorBuffer) {
            const colorPosition = gl.getAttribLocation(shader, "aColorPosition");
            if (colorPosition != -1) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
                gl.vertexAttribPointer(colorPosition, 4, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(colorPosition);
            }
        }

        if (this.indiceBuffer) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indiceBuffer);
        }

        if(this.texCoordsBuffer) {
            const texCoordPosition = gl.getAttribLocation(shader, "aTextureCoord");
            if (texCoordPosition != -1) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordsBuffer);
                gl.vertexAttribPointer(texCoordPosition, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(texCoordPosition);
            }
        }
    }
}

export default Mesh;
