#version 400

in vec2 fragUV;
layout(location = 0) out vec4 color;


uniform vec2 iResolution;
uniform vec3 camEye;
uniform vec2 mousePos;

uniform float bailout;
uniform float power;
uniform int deIterations;

uniform vec3 ambientColor;
uniform vec3 specularColor;
uniform vec3 diffuseColor;

uniform bool useLighting;

uniform vec3 bgColor;


vec3 lights[1] = {vec3(1.0, 0.6, 0.5)};
vec3 lightColors[1] = {vec3(1.f)};
int numLights = 1;


// transformation matrices used to reorient rays based on camera transforms
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



#define SPHERE 0
#define PLANE 1
#define NO_INTERSECT 2
#define MANDELBULB 3
#define DISPLACEMENT_FACTOR 0.1

// Data structure for raymarching results
struct PrimitiveDist {
    float dist;
    int primitive;
    int numSteps;
};


float calcDisplacement(in vec3 p) {
    return cos(p.x - p.z);
}


float mandelbulbDE(vec3 p) {
    vec3 z = p;
    float dr = 1.0;
    float r = 0.0;
    //int Iterations = 64;
    //float Power = 8;
    for (int i = 0; i < deIterations ; i++) {
            r = length(z);
            if (r > bailout) break;

            // convert to polar coordinates
            float theta = acos(z.z/r);
            float phi = atan(z.y,z.x);
            dr =  pow(r, power - 1.f) * power * dr + 1.f;

            // scale and rotate the point
            float zr = pow(r, power);
            theta = theta * power;
            phi = phi * power;

            // convert back to cartesian coordinates
            z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
            z += p;
    }
    return 0.5 * log(r) * r / dr;
}

PrimitiveDist map(vec3 p) {
    // reorient point based on camera transformation
    p = (rotX(-mousePos.x * 0.1) * rotY(mousePos.y * 0.1) * vec4(p, 1.0)).xyz;

    const float mandelbulb = mandelbulbDE(p);
    return PrimitiveDist(mandelbulb, MANDELBULB);
}

const float epsilon = 0.001;
vec2 e = vec2(epsilon, 0.0);
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
    float marchDist = 0.001;
    float boundingDist = 50.0;
    float threshold = 0.001;

    PrimitiveDist res;

    // Fill in the iteration count
    for (int i = 0; i < 1000; i++) {
       res = map(ro + rd * marchDist);

       if (res.dist < threshold) {
           res.dist = marchDist;
           break;
       }
       if (marchDist > boundingDist) {
           res.dist = marchDist;
           res.primitive = NO_INTERSECT;
           break;
       }
       marchDist += res.dist * 0.1;
    }
    return res;
}

vec3 phong(vec3 ro, vec3 rd, float t, int numLights) {
    vec3 pos = ro + rd * t;
    vec3 nor = calcNormal(pos);

    for (int i = 0; i < numLights; i++) {
        col =
        vec3 l = normalize(lights[i]);
        vec3 lColor = lightColors[i];
        float diffuseIntensity = ;
    }

    // Ambient
    float ambient = 0.1 * baseCol;
    // Diffuse
    float diffuse = clamp(dot(nor, lig), 0.0, 1.0);
    // Specular
    float shineness = 32.0;
    float specular = pow(clamp(dot(rd, reflect(lig, nor)), 0.0, 1.0), 32.0);

    float darkness = shadow(pos, lig, 18.0);
    // Applying the phong lighting model to the pixel.
    col *= vec3(((ambient + diffuse + specular) * darkness));
    return col;
}

void main() {
    float focalLength = 2.f;
    vec3 target = vec3(0.0);
    vec3 look = normalize(camEye - target);
    vec3 up = vec3(0, 1, 0);

    // camra params
    vec3 cameraForward = -look;
    vec3 cameraRight = normalize(cross(cameraForward, up));
    vec3 cameraUp = normalize(cross(cameraRight, cameraForward));

    // construct ray based on camera params
    vec2 uv = vec2(fragUV.x, fragUV.y);
    uv.x = 2.f * uv.x - 1.f;
    uv.y = 2.f * uv.y - 1.f;

    uv.x *= iResolution.x / iResolution.y;
    vec3 rayDirection = vec3(uv.x, uv.y, focalLength);

    rayDirection = rayDirection.x * cameraRight + rayDirection.y * cameraUp + rayDirection.z * cameraForward;
    rayDirection = normalize(rayDirection);


    PrimitiveDist rayMarchResult = raymarch(camEye, rayDirection);
    vec3 col = vec3(0.0);
    if (rayMarchResult.primitive != NO_INTERSECT) {
        if (useLighting) col = phong(camEye, rayDirection, rayMarchResult.dist, rayMarchResult.primitive);
        else col = ambientColor + diffuseColor;
    } else col = bgColor;

    color = vec4(col, 1.0);
}
