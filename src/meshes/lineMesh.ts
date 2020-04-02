import Mesh from "../mesh";

export default function createLineMesh(width: number, length: number): Mesh {
    const mesh = new Mesh();
    const bo = -width / 2.0;
    const t = width/2.0;
    const l = 0;
    const r = length;
    const f = -width/2.0;
    const ba = width/2.0;
    const positions = [
        // Front face
        l, bo, f,
        r, bo, f,
        r, t,  f,
        l, t,  f,

        // Back face
        l, bo, ba,
        l, t, ba,
        r, t,  ba,
        r, bo,  ba,

        // Top face
        l, t, ba,
        l, t, f,
        r, t, f,
        r, t, ba,

        // Bottom face
        l, bo, f,
        r, bo, f,
        r, bo, ba,
        l, bo, ba,

        // Right face
        r, bo, ba,
        r, t, ba,
        r, t, f,
        r, bo, f,

        // Left face
        l, bo, ba,
        l, bo, f,
        l, t, f,
        l, t, ba,

    ];
    const faces = [
        0, 1, 2, 0, 2, 3,       // front
        4, 5, 6, 4, 6, 7,       // back
        8, 9, 10, 8, 10, 11,    // top
        12, 13, 14, 12, 14, 15, // bottom
        16, 17, 18, 16, 18, 19, // right
        20, 21, 22, 20, 22, 23, // left
    ];
    const texCoords = [
        0,0,
        1,0,
        0,1,
        1,1,
    ];
    mesh.setPositions(positions, faces);
    mesh.setTexturePositions(texCoords);
    return mesh;
}
