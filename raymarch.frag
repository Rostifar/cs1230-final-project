#version 400

in vec2 fragUV;
layout(location = 0) out vec4 color;

vec4 orbit = vec4(10000.f);


uniform vec2 iResolution;
uniform vec3 camEye;
uniform vec2 mousePos;

//uniform vec3 camUp;
//uniform float focalLen;

mat4 rotY(float ang) {
    float x = cos(ang);
    float y = sin(ang);

    return mat4(x, 0, y, 0,
                0, 1, 0, 0,
               -y, 0, x, 0,
                0, 0, 0, 1);
}

mat4 rotX(float ang) {
    float x = cos(ang);
    float y = sin(ang);

    return mat4(1, 0,  0, 0,
                0, x, -y, 0,
                0, y,  x, 0,
                0, 0,  0, 1);
}

int numSteps = 0;

#define SPHERE 0
#define PLANE 1
#define MANDELBULB 3
#define NO_INTERSECT 2
#define DISPLACEMENT_FACTOR 0.1

// Data structure for raymarching results
struct PrimitiveDist {
    float dist;
    int primitive; // Can be SPHERE, PLANE, or NO_INTERSECT
};

// Helper function for tri3.
float tri(in float x) {
        return abs(fract(x)-.5);
}

// Triangle noise. Use it as a sample displacement map for task 7.
vec3 tri3(in vec3 p) {
    return vec3(tri(p.z+tri(p.y*1.)),
                tri(p.z+tri(p.x*1.)),
                tri(p.y+tri(p.x*1.)));
}

// TODO [Task 8] Make a displacement map
// You can check out tri3 above and the functions in the handout as inspiration
float calcDisplacement(in vec3 p) {
    return cos(p.x - p.z);
}


// Signed distance to the twisted sphere.
float sdTwistedSphere(vec3 p) {
    vec3 spherePosition = vec3(0.0, 0.25, 0.0);
    float radius = 1.5;
    float primitive = length(p - spherePosition) - radius;
    return primitive + calcDisplacement(p);
}

float sdFloor(vec3 p) {
    return p.y;
}

float DE(vec3 p) {
    vec3 z = p;
    float dr = 1.0;
    float r = 0.0;
    float Bailout = 2.0;
    int Iterations = 64;
    float Power = 4;
    for (int i = 0; i < Iterations ; i++) {
            r = length(z);
            if (r>Bailout) break;

            // convert to polar coordinates
            float theta = acos(z.z/r);
            float phi = atan(z.y,z.x);
            dr =  pow( r, Power-1.0)*Power*dr + 1.0;

            // scale and rotate the point
            float zr = pow( r,Power);
            theta = theta*Power;
            phi = phi*Power;

            // convert back to cartesian coordinates
            z = zr*vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
            z+=p;
            orbit = min(orbit, abs(vec4(z, dot(z, z))));
    }
    return 0.5*log(r)*r/dr;
}

PrimitiveDist map(vec3 p) {
    p = (rotX(-mousePos.x * 0.1) * rotY(mousePos.y * 0.1) * rotY(0) * vec4(p, 1.0)).xyz;

    float mandelbulb = DE(p);
    return PrimitiveDist(mandelbulb, MANDELBULB);
//    if (plane < sphere) return PrimitiveDist(plane, PLANE);
//    else return PrimitiveDist(sphere, SPHERE);
}

// TODO [Task 4] Calculate surface normals
const float epsilon = 0.001;
vec2 e = vec2(epsilon, 0.0); // For swizzling
vec3 calcNormal(vec3 p) {
    vec3 res = vec3(0.f);
    res.x = map(p + e.xyy).dist - map(p - e.xyy).dist;
    res.y = map(p + e.yxy).dist - map(p - e.yxy).dist;
    res.z = map(p + e.yyx).dist - map(p - e.yyx).dist;
    return normalize(res);
}

float shadow(vec3 ro, vec3 rd, float k) {
    float marchDist = 0.001;
    float boundingVolume = 25.0;
    float darkness = 1.0;
    float threshold = 0.001;

    for(int i = 0; i < 30; i++) {
        if(marchDist > boundingVolume) continue;
        float h = map(ro + rd * marchDist).dist;
        // TODO [Task 7] Modify the loop to implement soft shadows
        if (h < threshold) {
            return darkness;
        }
        darkness = min(darkness, k * h / marchDist);
        marchDist += h * 0.7;
    }
    return darkness;
}


PrimitiveDist raymarch(vec3 ro, vec3 rd) {

    // TODO [Task 2] Implement ray marching algorithm
    // Fill in parameters
    float marchDist = 0.001;
    float boundingDist = 50.0;
    float threshold = 0.001;

    PrimitiveDist res;

    // Fill in the iteration count
    for (int i = 0; i < 1000; i++) {
       numSteps += 1;
       res = map(ro + rd * marchDist);

       if (res.dist < threshold) {
           res.dist = marchDist;
           break;
       }
       if (marchDist > boundingDist) {
           res.dist = -1.f;
           res.primitive = NO_INTERSECT;
           break;
       }
       marchDist += res.dist * 0.1;
    }
    return res;
}



vec3 render(vec3 ro, vec3 rd, float t, int which) {
    vec3 pos = ro + rd * t;

    vec3 r = vec3(1, 0, 0);
    vec3 g = vec3(0, 1, 0);
    vec3 b = vec3(0, 0, 1);

    // Col is the final color of the current pixel.
    //vec3 col = vec3(pow(1 - float(numSteps) / 1000, 2));

    float sum = dot(pos, pos);
    vec3 col = r * pow(pos.x, 2) / sum + g * pow(pos.y, 2) / sum + b * pow(pos.z, 2) / sum;
    //col = clamp(col, 0, 0.7);
    // Light vector
    vec3 lig = normalize(vec3(10.0,0.6,0.5) - pos);

    // Normal vector
    vec3 nor = calcNormal(pos);

    // Ambient
    float ambient = 0.8;
    // Diffuse
    float diffuse = clamp(dot(nor, lig), 0.0, 1.0);
    // Specular
    float shineness = 32.0;
    float specular = pow(clamp(dot(-rd, reflect(lig, nor)), 0.0, 1.0), 8.0);
    //specular = 0.f;

    float darkness = shadow(pos, lig, 18.0);
    //darkness = 1.f;
    // Applying the phong lighting model to the pixel.
    col = (vec3(0.5, pow(1 - float(numSteps) / 1000, 5), 0.5) * (ambient + diffuse + specular) * darkness) * col;

    // TODO [Task 5] Assign different intersected objects with different materials
    // Make things pretty!
    //vec3 material = vec3(0.0);

    /*if (which == PLANE) {
        material = texCube(iChannel0, pos, nor);
    } else if (which == SPHERE) {
        material = texCube(iChannel1, pos, nor);
    } else {
        material = vec3(0.5);
    }*/

    // Blend the material color with the original color.
    //col = mix(col, material, 0.4);

    return col;
}

void main() {
    //vec3 rayOrigin = vec3(inverse(viewMat) * vec4(0.f, 0.f, 0.f, 1));
    float focalLength = 2.f;

    // The target we are looking at
    vec3 target = vec3(0.0);

    // Look vector
    vec3 look = normalize(camEye - target);

    // Up vector
    vec3 up = vec3(0, 1, 0);
    vec3 cameraForward = -look;
    vec3 cameraRight = normalize(cross(cameraForward, up));
    vec3 cameraUp = normalize(cross(cameraRight, cameraForward));

    // Set up camera matrix
    //vec3 cameraForward = vec3(viewMat[0][2], viewMat[1][2], viewMat[2][2]);
    //vec3 cameraRight = vec3(viewMat[0][0], viewMat[1][0], viewMat[2][0]);
    //vec3 cameraUp = vec3(viewMat[0][1], viewMat[1][1], viewMat[2][1]);

    vec2 uv = vec2(fragUV.x, fragUV.y);
    uv.x = 2.f * uv.x - 1.f;
    uv.y = 2.f * uv.y - 1.f;

    uv.x *= iResolution.x / iResolution.y;
    vec3 rayDirection = vec3(uv.x, uv.y, focalLength);

    rayDirection = rayDirection.x * cameraRight + rayDirection.y * cameraUp + rayDirection.z * cameraForward;
    rayDirection = normalize(rayDirection);


    PrimitiveDist rayMarchResult = raymarch(camEye, rayDirection);
    vec3 col = vec3(1.2) - vec3(float(numSteps) / 1000);
    if (rayMarchResult.primitive != NO_INTERSECT) {
      col = render(camEye, rayDirection, rayMarchResult.dist, rayMarchResult.primitive);
    }

    color = vec4(col, 1.0);
}
