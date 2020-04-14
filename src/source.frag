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

const vec3 clipPlanePos = vec3(0.5, 0.0, 0.0);
const vec3 clipPlaneNormal = vec3(1.0, 0.0, 0.0);

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

void main() {

    vec3 ray_dir= normalize(vray_dir);
    vec2 hit = intersect_box(transformed_eye, ray_dir);
    
	if (hit.x > hit.y) {
		discard;
	}

    // Ignore if behind view
    hit.x = max(hit.x, 0.0);

    // TODO: Make these uniform
    // value between (0.0, 1.0] that defines the step resoultion based on size
    const float resolution = 0.1;
    // Volume dimension
    const vec3 volume_dim = vec3(244, 124, 257);
    
	// Compute optimal step size
	vec3 dt_vec = 1.0 / (volume_dim * abs(ray_dir));
	float dt = min(dt_vec.x, min(dt_vec.y, dt_vec.z)) * resolution;

    vec3 ray = transformed_eye + ray_dir * hit.x;
    vec3 color_hit = ray;
    for(float t = hit.x; t < hit.y; t += dt) {
        
        float d = dot(ray - clipPlanePos, clipPlaneNormal);
        if(d < 0.0 || true) {
            // TODO: Make the data uniform and not dependent on max-size
            float val = texture(textureData, ray).r;

            vec4 val_color = texture(uTransferFunction, vec2(val, 0.5));
            //val_color.a = val_color.a * val_color.a * val_color.a;
            /*
            if(val > 0.45) {
                val_color.a = val;
            } else if(val > 0.2){
                val_color.a = val * uDepth;
            } else {

            }*/

            
            // opacity correction
            val_color.a = 1.0 - pow(1.0 - val_color.a, resolution);

            if(colorAccumulationType == 0) {
                // Color compositing. Multiplicative
                color.rgb += (1.0 - color.a) * (val_color.a * val_color.rgb);
                color.a += (1.0 - color.a) * val_color.a;
                color_hit = ray;
                // Abort when integrated opacity is close to opaque
                if(color.a >= 0.99) {
                    break;
                }
                
            } else {
                if(length(color.rgb) < length(val_color.rgb * val_color.a)) {
                    color.rgba = val_color;
                    color.rgb *= color.a;
                    color_hit = ray;
                }
            }

        }

        ray += ray_dir * dt;

    }

    if(length(normal(color_hit)) > 0.001) { 
        float diff = max(dot(normal(color_hit), ray_dir), 0.0);
        color.rgb = (0.2 + diff) * color.rgb;
    }

    gl_FragDepth = 40.0;
    if(color.a >= 0.99) {
        gl_FragDepth = length(abs(color_hit) - abs(transformed_eye)) / 40.0;
    }
    //color = vec4(abs(normal(ray - ray_dir*dt)), 1.0);
    //color = vec4(abs(normal(ray_dir * hit.x)), 1.0);
}