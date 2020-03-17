import RenderTarget from './renderTarget';
import Camera from './camera';
import Settings from './settings';

interface View {
    render(aspect: number, camera: Camera, settings: Settings): void;
    getRenderTarget(): RenderTarget;
}

export default View;