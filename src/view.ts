import RenderTarget from './renderTarget';

interface View {
    render(aspect: number): void;
    getRenderTarget(): RenderTarget;
}

export default View;