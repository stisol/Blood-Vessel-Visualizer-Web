import Mesh from "../mesh";

export default function createSphereMesh(radius: number, rings: number, sectors: number, isWireframe: boolean): Mesh {
    sectors = Math.round(sectors);
    rings = Math.round(rings);
    if(rings <= 0) throw new Error("Rings has to be a number larger than 0");
    if(sectors <= 0) throw new Error("Sectors has to be a number larger than 0");

    const mesh = new Mesh();

    const positions: number[] = [];
    const faces: number[] = [];
    const texCoords: number[] = [];
    const normals: number[] = [];
    
    const R = 1.0 / (rings - 1.0);
    const S = 1.0 / (sectors - 1.0);
    for(let r = 0; r < rings; ++r) {
        for(let s = 0; s < sectors; ++s) {
            const y = Math.sin(-Math.PI/2.0 + Math.PI * r * R);
            const x = Math.cos(2*Math.PI * s * S) * Math.sin(Math.PI * r * R);
            const z = Math.sin(2*Math.PI * s * S) * Math.sin(Math.PI * r * R);

            texCoords.push(s * S);
            texCoords.push(r * R);

            positions.push(x * radius);
            positions.push(y * radius);
            positions.push(z * radius);

            normals.push(x);
            normals.push(y);
            normals.push(z);
            
            const curRow = r * sectors;
            const nextRow = (r+1) * sectors;
            const nextS = (s+1) % sectors;

            if(r < rings-1) {
                if(!isWireframe) {
                    faces.push(curRow + s);
                    faces.push(nextRow + s);
                    faces.push(nextRow + nextS);
                    
                    faces.push(curRow + s);
                    faces.push(nextRow + nextS);
                    faces.push(curRow + nextS);
                } else {
                    faces.push(curRow + s);
                    faces.push(nextRow + s);
                    
                    faces.push(nextRow + s);
                    faces.push(nextRow + nextS);
                    
                    
                    faces.push(nextRow + nextS);
                    faces.push(curRow + nextS);
                }
            }
        }
    }


    mesh.setPositions(positions, faces);
    mesh.setTexturePositions(texCoords);
    mesh.setNormals(normals);
    return mesh;
}
