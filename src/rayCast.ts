import { vec3, vec2, mat4 } from "gl-matrix";
import { LoadedTextureData } from "./shader";

const resolution = 0.05;

function intersectBox(orig: vec3, dir: vec3, boxMin: vec3, boxMax: vec3): vec2 {
	const invDir: vec3 = oneOver(dir);
	const tminTmp: vec3 = vec3.mul(vec3.create(), vec3.subtract(vec3.create(), boxMin, orig), invDir);
	const tmaxTmp: vec3 = vec3.mul(vec3.create(), vec3.subtract(vec3.create(), boxMax, orig), invDir);
	const tmin: vec3 = vec3.min(vec3.create(), tminTmp, tmaxTmp);
	const tmax: vec3 = vec3.max(vec3.create(), tminTmp, tmaxTmp);
	const t0: number = Math.max(tmin[0], Math.max(tmin[1], tmin[2]));
	const t1: number = Math.min(tmax[0], Math.min(tmax[1], tmax[2]));
	return [t0, t1];
}

function lookup(volumeData: LoadedTextureData, pos: vec3): number | undefined {
    const x = Math.round(pos[0] * volumeData.width / 2 + volumeData.width / 2);
    const y = Math.round(pos[1] * volumeData.height / 2 + volumeData.height / 2);
    const z = Math.round(pos[2] * volumeData.depth / 2 + volumeData.depth / 2);
    const xOff = x;
    const yOff = y * volumeData.width;
    const zOff = z * volumeData.width * volumeData.height;
    return volumeData.data[xOff + yOff + zOff];
}

// Returns hit location on the finished march (Will be the start of the ray if nothing was hit)
function raymarch(
    volumeData: LoadedTextureData,
    ray: vec3,
    rayDir: vec3,
    start: number,
    end: number,
    stepSize: number,
    uScaleMatrix: mat4
): number[] {
    const res: number[] = [];
    const inverseScale: mat4 = mat4.invert(mat4.create(), uScaleMatrix);
    const texSpaceRay: vec3 = vec3.transformMat4(ray, ray, inverseScale);
    const texSpaceRayDir: vec3 = vec3.transformMat4(rayDir, rayDir, inverseScale);
    for (let t = start; t < end; t += stepSize) {
        // TODO: Make the data uniform and not dependent on max-size
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const ray = vec3.scaleAndAdd(vec3.create(), [0.5, 0.5, 0.5], texSpaceRay, 0.2);
        const val = lookup(volumeData, ray);
        if (val != undefined)
            res.push(val);

        //val_color: vec4 = texture(uTransferFunction, vec2(val, 0.5));
        //val_color.a = pow(val_color.a, 3.0);

        // if(val_color.a == 0.0) {
        //     ray += ray_dir * step_size;
        //     texSpaceRay += texSpaceRayDir * step_size;
        //     continue;
        // }            

        const step = vec3.scale(vec3.create(), rayDir, stepSize);
        vec3.add(ray, ray, step);
        const texSpaceStep = vec3.scale(vec3.create(), texSpaceRayDir, stepSize);
        vec3.add(texSpaceRay, texSpaceRay, texSpaceStep);
    }
    return res;
}

function abs(v: vec3): vec3 {
    return [Math.abs(v[0]), Math.abs(v[1]), Math.abs(v[2])];
}

function oneOver(v: vec3): vec3 {
    return [1 / v[0], 1 / v[1], 1 / v[2]];
}

export default function main(
    volumeData: LoadedTextureData,
    position: vec3,
    transformedEye: vec3,
    volumeDim: vec3,
    uScaleMatrix: mat4,
    boxMin: vec3,
    boxMax: vec3
): number[] {
    const vrayDir = vec3.transformMat4(vec3.create(), position, uScaleMatrix)
    vec3.subtract(vrayDir, vrayDir, transformedEye);

    const rayDir: vec3 = vec3.normalize(vrayDir, vrayDir);
    const hit: vec2 = intersectBox(transformedEye, rayDir, boxMin, boxMax);

	if (hit[0] > hit[1]) {
		return [];
	}

    // Ignore if behind view
    hit[0] = Math.max(hit[0], 0.0);

	// Compute optimal step size
	const dtVec: vec3 = oneOver(vec3.multiply(vec3.create(), volumeDim, abs(rayDir)));
	const dt: number = Math.min(dtVec[0], Math.min(dtVec[1], dtVec[2])) * resolution;
    
    const ray: vec3 = vec3.scale(vec3.create(), vec3.multiply(vec3.create(), transformedEye, rayDir), hit[0]);
    return raymarch(volumeData, ray, rayDir, hit[0], hit[1], dt, uScaleMatrix);
}
