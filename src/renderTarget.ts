export default class RenderTarget {

    private targetTexture: WebGLTexture;
    //private depthTexture: WebGLTexture;
    private frameBuffer: WebGLFramebuffer;
    private gl: WebGL2RenderingContext;

    private width: number;
    private height: number;

    public constructor(gl: WebGL2RenderingContext, width: number, height: number) {
        const tex = gl.createTexture();
        if(tex == null) {
            throw "Failed to create texture for render target";
        }
        
        const fb = gl.createFramebuffer();
        if(fb == null) {
            throw "Failed to create framebuffer for render target";
        }

        this.targetTexture = tex;
        this.frameBuffer = fb;
        this.gl = gl;
        this.width = width;
        this.height = height;
        
        gl.bindTexture(gl.TEXTURE_2D, this.targetTexture);
    
        // set the filtering so we don't need mips
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
            width, height, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, null);
    
        // Create the depth buffer
        /*const dB = gl.createTexture();
        if(dB == null) {
            throw "REEEEE";
        }
        this.depthTexture = dB;
        gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT16, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);*/

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
    
        const attachmentPoint = gl.COLOR_ATTACHMENT0;
        gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, this.targetTexture, 0);
        //gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTexture, 0);
    }

    public resize(width: number, height: number): void {
        
        if(this.width == width && this.height == height) return;

        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.targetTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
            width, height, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, null);
            
        /*gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT16, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);*/

        this.width = width;
        this.height = height;
    }

    public bindFramebuffer(): void {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
    }

    public getTexture(): WebGLTexture {
        return this.targetTexture;
    }

    /*public getDepthTexture(): WebGLTexture {
        return this.depthTexture;
    }*/

    public getWidth(): number {
        return this.width;
    }

    public getHeight(): number {
        return this.height;
    }
}