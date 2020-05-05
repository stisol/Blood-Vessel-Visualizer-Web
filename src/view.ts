import RenderTarget from './renderTarget';
import Camera from './camera';
import Settings from './settings';
import { LoadedTextureData } from './shader';

interface View {
    render(aspect: number, camera: Camera, settings: Settings, loadedData: LoadedTextureData): void;
    getRenderTarget(): RenderTarget;
}

export default View;