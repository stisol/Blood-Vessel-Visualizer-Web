#version 300 es

precision highp float;
precision highp int;
precision highp sampler3D;

in vec3 vray_dir;
in vec4 position;
in float depth;
in vec2 screen_tex_coords;
flat in vec3 transformed_eye;

out lowp vec4 color;


uniform mat4 uLightMatrix;

uniform sampler3D textureData;
uniform sampler3D normalData;
uniform sampler2D uGodRaysTexture;

uniform int colorAccumulationType;
uniform vec3 uEyePosition;

uniform vec3 lightPos;
uniform mat4 uProjectionMatrix;

uniform vec3 box_min;
uniform vec3 box_max;

const vec3 clipPlanePos = vec3(0.0, 0.0, 0.0);
const vec3 clipPlaneNormal = vec3(1.0, 0.0, 0.0);

uniform mat4 uScaleMatrix;

uniform bool hasGodRays; 
uniform bool lowQuality; 
//const vec3 lightPos = vec3(4.0, 2.0, 0.5);

// TODO: Make these uniform
// value between (0.0, 1.0] that defines the step resoultion based on size
float resolution = 0.1;
// Volume dimension
const vec3 volume_dim = vec3(244, 124, 257);

const vec3 light_color = vec3(1.0, 0.0, 0.0);


uniform float uDepth;
uniform sampler2D uTransferFunction;

vec2 intersect_box(vec3 orig, vec3 dir) {
	vec3 inv_dir = 1.0 / dir;
	vec3 tmin_tmp = (box_min - orig) * inv_dir;
	vec3 tmax_tmp = (box_max - orig) * inv_dir;
	vec3 tmin = min(tmin_tmp, tmax_tmp);
	vec3 tmax = max(tmin_tmp, tmax_tmp);
	float t0 = max(tmin.x, max(tmin.y, tmin.z));
	float t1 = min(tmax.x, min(tmax.y, tmax.z));
	return vec2(t0, t1);
}

vec3 get_normal(vec3 pos) {
    return normalize(texture(normalData, pos/2.0 + 0.5).rgb);
}

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

float calculateAmbientOcclusionCoeff(vec3 hit) {
    
    mat4 inverseScale = inverse(uScaleMatrix);
    vec3 texSpaceRay = (inverseScale * vec4(hit, 1.0)).xyz;
    // Create orthogonal basis
    vec3 norm = get_normal(texSpaceRay);
    vec3 UP = vec3(0.0, 1.0, 0.0);
    if(norm.x < 0.5) {
        UP = vec3(1.0, 0.0, 0.0);
    }
    vec3 T = cross(norm, UP);
    vec3 S = cross(norm, T);

    float ambientOcclusion = 0.0;
    const int ambientOcclusionIterations = 64;
    for(int i = 0; i <= ambientOcclusionIterations; ++i) {
        float z = sqrt(rand(vec2(0.0, i)));
        float r = sqrt(1.0 - z*z);
        float theta = (rand(vec2(z, i)) * 2.0 - 1.0) * 3.1415;
        float x = r * cos(theta);
        float y = r * sin(theta);
        vec3 direction = normalize(x * T + y * S + z * norm) * 0.05;
        
        float val = texture(textureData, texSpaceRay/2.0+0.5 + direction).r;
        float t_alpha = texture(uTransferFunction, vec2(val, 0.5)).a;

        //color.rgb = vec3(val);
        //color.rgb = vec3(direction/0.01);

        ambientOcclusion += t_alpha;
    }
    ambientOcclusion /= float(ambientOcclusionIterations);
    return 1.0-ambientOcclusion;
}

float calculateShadowCoeff(vec3 hit, vec3 ray_dir, float start, float end, float step_size) {
    //float lightness = 1.0;
    float solidity = 0.0;
    vec3 ray = hit + ray_dir * (step_size);
    mat4 inverseScale = inverse(uScaleMatrix);
    vec3 texSpaceRay = (inverseScale * vec4(ray, 1.0)).xyz;
    vec3 texSpaceRayDir = (inverseScale * vec4(ray_dir, 1.0)).xyz;
    vec3 norm = get_normal(texSpaceRay);
    ray = clamp(ray + norm * 0.01, vec3(-1.0), vec3(1.0));
    texSpaceRay = clamp(texSpaceRay + norm * 0.01, vec3(-1.0), vec3(1.0));

    
    for(float t = start+step_size; t < end; t+=step_size) {
        float d = dot(ray - clipPlanePos, clipPlaneNormal);
        if(d < 0.0 || true) {
            float val = texture(textureData, texSpaceRay/2.0+0.5).r;
            float t_alpha = texture(uTransferFunction, vec2(val, 0.5)).a;
            t_alpha = 1.0 - pow(1.0 - t_alpha, resolution);
            solidity += (1.0 - solidity) * t_alpha;

            if(solidity >= 0.99) {
                break;
            }
        }

        ray += ray_dir * step_size;
        texSpaceRay += texSpaceRayDir * step_size;
    }

    return (1.0-solidity);
}

// Returns hit location on the finished march (Will be the start of the ray if nothing was hit)
vec3 raymarch(in vec3 ray, in vec3 ray_dir, in float start, in float end, in float step_size) {
    vec3 color_hit = ray;
    mat4 inverseScale = inverse(uScaleMatrix);
    vec3 texSpaceRay = (inverseScale * vec4(ray, 1.0)).xyz;
    vec3 texSpaceRayDir = (inverseScale * vec4(ray_dir, 1.0)).xyz;

    float strength = 0.0;

    for(float t = start; t < end; t += step_size) {
        
        float d = dot(ray - clipPlanePos, clipPlaneNormal);
        if(d < 0.0 || true) {
            // TODO: Make the data uniform and not dependent on max-size
            float val = texture(textureData, texSpaceRay/2.0+0.5).r;

            vec4 val_color = texture(uTransferFunction, vec2(val, 0.5));
            //val_color.a = pow(val_color.a, 3.0);
            
            if(val_color.a == 0.0) {
                ray += ray_dir * step_size;
                texSpaceRay += texSpaceRayDir * step_size;
                continue;
            }

            // opacity correction
            val_color.a = 1.0 - pow(1.0 - val_color.a, resolution);

            if(colorAccumulationType == 0) {
                if(hasGodRays) {
                    /*vec3 lineRay = normalize(ray - lightPos);
                    vec3 planeNormal = normalize(-lightPos);
                    vec3 planePoint = lightPos  + planeNormal * 0.1;

                    vec3 rayDirection = normalize(lineRay);
                    vec3 rayPosition = ray;*/

                    /*vec3 planeNormal = normalize(-lightPos);
                    vec3 planePoint = lightPos + planeNormal * 0.1;

                    vec3 offsetPoint = ray-lightPos;

                    vec3 rayDirection = normalize(lightPos - ray);
                    vec3 rayPosition = ray;*/

                    /*vec3 planeNormal = vec3(0.0, 0.0, 1.0);
                    vec3 planePoint = vec3(0.0, 0.0, 0.1);

                    vec3 rayPosition = ray - lightPos;
                    vec3 rayDirection = normalize(rayPosition - planePoint);
                    */

                    /*float ndoty = dot(planeNormal, rayDirection);
                    vec3 w = rayPosition - planePoint;
                    float si = -dot(planeNormal, w);
                    vec3 psi = (w - si * rayDirection + planePoint);

                    color.rgb = vec3(psi.xy / planePoint.xy, 0.0);*/
                    //color.rgb = rayDirection;
                    //float godRayLightDistance = texture(uGodRaysTexture, psi.xy / 2.0 + 0.5).r;
                    //color.rgb = vec3(godRayLightDistance);

                    
                    vec4 test = uLightMatrix * uScaleMatrix * vec4(ray, 1.0);
                    vec3 projected = test.xyz / test.w;

                    vec2 screen = vec2(projected.x / 2.0 + 0.5, projected.y / 2.0 + 0.5);


                    //color.rgb = vec3(ndc.xy, 0.0);
                    /*float testast = texture(uGodRaysTexture, ndc.xy / 2.0 + 0.5).r;
                    color.rgb = vec3(testast);
                    break;*/
                    /*vec4 clip_coord = inverse(uLightMatrix * uScaleMatrix) * vec4(ray, 1.0);
                    vec3 depth_traced = test.xyz / test.w;
                        float far=gl_DepthRange.far; float near=gl_DepthRange.near;
                    vec3 screen = ((far - near) * (depth_traced) + near + far) / 2.0;*/
                    float godRayLightDistance = texture(uGodRaysTexture, screen.xy).r;
                    color.rgb = vec3(godRayLightDistance);
                    break;

                    //float lightDistance = length(lightPos - ray);

                    /*vec4 clip_coord = inverse(uLightMatrix * uScaleMatrix) * vec4(ray, 1.0);
                    float depth_traced = clip_coord.z / clip_coord.w;
                        float far=gl_DepthRange.far; float near=gl_DepthRange.near;
                    float lightDistance = ((far - near) * (depth_traced) + near + far) / 2.0;

                    float godrayCoeff = 1.0;
                    //color.rgb = vec3(godRayLightDistance);
                    //color.rgb = vec3(godRayLightDistance, 0.0, 0.0);
                    if(godRayLightDistance < lightDistance) {
                        godrayCoeff = 0.0;

                    //color.rgb = vec3(godrayCoeff);
                        //break;
                    }*/
                    // Color compositing. Multiplicative
                    color.rgb += (1.0 - color.a) * (val_color.a * (val_color.rgb ));
                    color.a += (1.0 - color.a) * val_color.a;
                    color_hit = ray - ray_dir * step_size / 2.0; // Assuming linear change
                }
                else {

                // Color compositing. Multiplicative
                color.rgb += (1.0 - color.a) * (val_color.a * val_color.rgb);
                color.a += (1.0 - color.a) * val_color.a;
                color_hit = ray - ray_dir * step_size / 2.0; // Assuming linear change
                }
                

                // Abort when integrated opacity is close to opaque
                if(color.a >= 0.95) {
                    break;
                }
                
            } else {
                if(length(strength) < length(val)) {
                    if(strength == 0.0) {
                        color_hit = ray;
                    }
                    strength = val;
                    color.rgb = val_color.rgb * strength;
                    color.a = val_color.a;
                }
            }

        }

        ray += ray_dir * step_size;
        texSpaceRay += texSpaceRayDir * step_size;
    }

    return color_hit;
}

void main() {

    vec3 ray_dir= normalize(vray_dir);
    vec2 hit = intersect_box(transformed_eye, ray_dir);
    
	if (hit.x > hit.y) {
		discard;
	}

    // Ignore if behind view
    hit.x = max(hit.x, 0.0);

    if(lowQuality) {
        resolution = 0.2;
    }
    
	// Compute optimal step size
	vec3 dt_vec = 1.0 / (volume_dim);
	float dt = min(dt_vec.x, min(dt_vec.y, dt_vec.z)) * resolution;


    vec3 ray = transformed_eye + ray_dir * hit.x;

    vec3 color_hit = raymarch(ray, ray_dir, hit.x, hit.y, dt);

    
    if(colorAccumulationType == 0) {
        vec3 light_dir = normalize(lightPos - color_hit);
        hit = intersect_box(color_hit, light_dir);
        
        if (hit.x > hit.y) {
            return;
        }
        if(!lowQuality || true) {

            // Ignore if behind view
            hit.x = max(hit.x, 0.0);

            //float hit_light = calculateShadowCoeff(color_hit, light_dir, hit.x, hit.y, dt)*0.7;
            //float ambient = calculateAmbientOcclusionCoeff(color_hit) * 0.5 + 0.5;
            //color.rgb *= (hit_light + 0.3) * ambient;
        } 
        else {

            mat4 inverseScale = inverse(uScaleMatrix);
            vec3 texSpaceRayDir = (inverseScale * vec4(color_hit, 1.0)).xyz;
            vec3 normal = get_normal(texSpaceRayDir);
            float diff = max(dot(normal, light_dir), 0.0);
            color.rgb *= diff+0.3;
        }

        //color.rgb *= ambient;
    } else {
    }

    gl_FragDepth = gl_DepthRange.far;
    if(color.a >= 0.95) {
        vec4 clip_coord = uProjectionMatrix * uScaleMatrix * vec4(color_hit, 1.0);
        float depth_traced = clip_coord.z / clip_coord.w;
            float far=gl_DepthRange.far; float near=gl_DepthRange.near;
        gl_FragDepth = ((far - near) * (depth_traced) + near + far) / 2.0;
    }

    /*if(hasGodRays) {
        vec4 test = texture(uGodRaysTexture, screen_tex_coords);
        color = test;
    }*/
    //color.xyz = vec3(screen_tex_coords, 0.0);
    //color = texture(uTransferFunction, vec2(ray_dir.x, 0.5));
    //color.rgb = normal(color_hit);
    //color = vec4(abs(normal(ray - ray_dir*dt)), 1.0);
    //color = vec4(abs(normal(ray_dir * hit.x)), 1.0);
    //color = vec4(ray_dir.x, 0.0, 0.0, 1.0);
}