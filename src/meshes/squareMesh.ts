import Mesh from "../mesh";

export default function createSquareMesh(min: number, max: number, wireframe = false, wireframeThickness = 1.0): Mesh {
    if(!wireframe) {
        const mesh = new Mesh();
        const positions = [
            // Front face
            min, min, 0.0,
            max, min, 0.0,
            max, max, 0.0,
            min, max, 0.0,
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
    } else {
        const d = wireframeThickness;
        const mesh = new Mesh();
        const positions = [
            // top
            min, max, 0.0,
            min, max-d, 0.0,
            max, max-d, 0.0,
            max, max, 0.0,
            
            // bottom
            min, min, 0.0,
            min, min+d, 0.0,
            max, min+d, 0.0,
            max, min, 0.0,
            
            // left
            min,   min, 0.0,
            min+d, min, 0.0,
            min+d, max, 0.0,
            min,   max, 0.0,
            
            // right
            max,   min, 0.0,
            max-d, min, 0.0,
            max-d, max, 0.0,
            max,   max, 0.0,
        ]

        const faces = [
            0, 1, 2, 0, 2, 3,       // top
            4, 5, 6, 4, 6, 7,       // bottom
            8, 9, 10, 8, 10, 11,       // left
            12, 13, 14, 12, 14, 15,       // right
        ];
        mesh.setPositions(positions, faces);
        return mesh;
    }
}
