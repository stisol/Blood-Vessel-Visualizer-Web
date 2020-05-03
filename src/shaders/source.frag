#version 300 es

precision highp float;
precision highp int;
precision highp sampler3D;

in vec3 vray_dir;
in vec3 position;
flat in vec3 transformed_eye;

out lowp vec4 color;

uniform sampler3D textureData;
uniform sampler3D normalData;

uniform int colorAccumulationType;

uniform vec3 lightPos;

const vec3 clipPlanePos = vec3(0.5, 0.0, 0.0);
const vec3 clipPlaneNormal = vec3(1.0, 0.0, 0.0);

//const vec3 lightPos = vec3(4.0, 2.0, 0.5);

// TODO: Make these uniform
// value between (0.0, 1.0] that defines the step resoultion based on size
const float resolution = 0.1;
// Volume dimension
const vec3 volume_dim = vec3(244, 124, 257);


uniform float uDepth;
uniform sampler2D uTransferFunction;

vec2 intersect_box(vec3 orig, vec3 dir) {
	const vec3 box_min = vec3(0.0);
	const vec3 box_max = vec3(1);
	vec3 inv_dir = 1.0 / dir;
	vec3 tmin_tmp = (box_min - orig) * inv_dir;
	vec3 tmax_tmp = (box_max - orig) * inv_dir;
	vec3 tmin = min(tmin_tmp, tmax_tmp);
	vec3 tmax = max(tmin_tmp, tmax_tmp);
	float t0 = max(tmin.x, max(tmin.y, tmin.z));
	float t1 = min(tmax.x, min(tmax.y, tmax.z));
	return vec2(t0, t1);
}

vec3 normal(vec3 pos) {
    return normalize(texture(normalData, pos).rgb);
}

float calculateShadowCoeff(vec3 hit, vec3 ray_dir, float start, float end, float step_size) {
    //float lightness = 1.0;
    float solidity = 0.0;
    vec3 ray = hit + ray_dir * (step_size);
    for(float t = start+step_size; t < end; t+=step_size) {
        float val = texture(textureData, ray.xzy).r;
        float t_alpha = texture(uTransferFunction, vec2(val, 0.5)).a*0.95;
        t_alpha = 1.0 - pow(1.0 - t_alpha, resolution);
        solidity += (1.0 - solidity) * t_alpha;

        if(solidity >= 0.99) break;

        ray += ray_dir * step_size;
    }

    return (1.0-solidity);
}

// Returns hit location on the finished march (Will be the start of the ray if nothing was hit)
vec3 raymarch(in vec3 ray, in vec3 ray_dir, in float start, in float end, in float step_size) {

    vec3 color_hit = ray;
    for(float t = start; t < end; t += step_size) {
        
        float d = dot(ray - clipPlanePos, clipPlaneNormal);
        if(d < 0.0 || true) {
            // TODO: Make the data uniform and not dependent on max-size
            float val = texture(textureData, ray.xzy).r;

            vec4 val_color = texture(uTransferFunction, vec2(val, 0.5));
            //val_color.a = pow(val_color.a, 3.0);
            
            if(val_color.a == 0.0) {
                ray += ray_dir * step_size;
                continue;
            }

            // opacity correction
            val_color.a = 1.0 - pow(1.0 - val_color.a, resolution);

            if(colorAccumulationType == 0) {
                // Color compositing. Multiplicative
                color.rgb += (1.0 - color.a) * (val_color.a * val_color.rgb);
                color.a += (1.0 - color.a) * val_color.a;
                color_hit = ray;

                // Abort when integrated opacity is close to opaque
                if(color.a >= 0.95) {
                    break;
                }
                
            } else {
                if(length(color.a) < length(val)) {
                    color.rgba = vec4(val);
                    color.rgb *= val_color.rgb;
                    color_hit = ray;
                }
            }

        }

        ray += ray_dir * step_size;
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

    
	// Compute optimal step size
	vec3 dt_vec = 1.0 / (volume_dim * abs(ray_dir));
	float dt = min(dt_vec.x, min(dt_vec.y, dt_vec.z)) * resolution;

    vec3 ray = transformed_eye + ray_dir * hit.x;

    vec3 color_hit = raymarch(ray, ray_dir, hit.x, hit.y, dt);

    
    if(colorAccumulationType == 0) {
        vec3 light_dir = normalize(lightPos - color_hit);
        hit = intersect_box(color_hit, light_dir);
        
        if (hit.x > hit.y) {
            return;
        }

        // Ignore if behind view
        hit.x = max(hit.x, 0.0);

        float hit_light = calculateShadowCoeff(color_hit, light_dir, hit.x, hit.y, dt);
        color.rgb *= (hit_light + 0.3);
    } else {
    }

    gl_FragDepth = 40.0;
    if(color.a >= 0.99) {
        gl_FragDepth = length(abs(color_hit) - abs(transformed_eye)) / 40.0;
    }
    
    //color = texture(uTransferFunction, vec2(ray_dir.x, 0.5));
    //color.rgb = normal(color_hit);
    //color = vec4(abs(normal(ray - ray_dir*dt)), 1.0);
    //color = vec4(abs(normal(ray_dir * hit.x)), 1.0);
    //color = vec4(ray_dir.x, 0.0, 0.0, 1.0);
}