#version 300 es

precision highp float;
precision highp int;
precision highp sampler3D;

in vec3 vray_dir;
flat in vec3 transformed_eye;

out lowp vec4 color;

uniform sampler3D textureData;
uniform sampler3D normalData;
uniform vec3 lowValColor;
uniform vec3 highValColor;

uniform float uDepth;

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

	// Compute optimal step size
	vec3 dt_vec = vec3(0.001);
	float dt = min(dt_vec.x, min(dt_vec.y, dt_vec.z));

    vec3 ray = transformed_eye + ray_dir * hit.x;
    for(float t = hit.x; t < hit.y; t += dt) {
        // TODO: Make the data uniform and not dependent on max-size
        float val = texture(textureData, ray).r;

        // TODO: Change with transferfunction
        vec4 val_color = vec4(normalize(lowValColor), 0.0);
        if(val > 0.45) {
            val_color = vec4(normalize(highValColor), val);
        } else if(val > 0.2){
            val_color = vec4(normalize(lowValColor), uDepth * val);
        }
        // Color compositing. Multiplicative
        color.rgb += (1.0 - color.a) * (val_color.a * val_color.rgb);
        color.a += (1.0 - color.a) * val_color.a;

        // Abort when integrated opacity is close to opaque
        if(color.a >= 0.99) {
            break;
        }

        ray += ray_dir * dt;
    }
    
    color.rgb *= color.a;


    if(length(normal(ray)) > 0.001 && color.a >= 0.99) { 
        float diff = max(dot(normal(ray), ray_dir), 0.0);
        color.rgb = (0.5 + diff) * color.rgb;
    }
    //color = vec4(abs(normal(ray - ray_dir*dt)), 1.0);
}