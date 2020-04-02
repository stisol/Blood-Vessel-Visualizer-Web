import Mesh from "../mesh";

export default function createSquareMesh(): Mesh {
    const mesh = new Mesh();
    const positions = [
        // Front face
        -1.0, -1.0, 1.0,
        1.0, -1.0, 1.0,
        1.0, 1.0, 1.0,
        -1.0, 1.0, 1.0,
    ];
    const faces = [
        0, 1, 2, 0, 2, 3,       // front
    ];
    const texCoords = [
        0,0,
        1,0,
        1,1,
        0,1
    ];
    mesh.setPositions(positions, faces);
    mesh.setTexturePositions(texCoords);
    return mesh;
}
