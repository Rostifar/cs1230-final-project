#version 400
#define USE_LOWPOWER_MODE 0
#define USE_FREEVIEW      1
#define USE_LIGHTING      2

#define MANDELBULB        50
#define MANDELBOX         51
#define NO_INTERSECT      52

#define PI 3.141592

// inputs and outputs
in vec2 fragUV;
layout(location = 0) out vec4 color;

struct Light {
    vec3 position;
    vec3 intensity;
    int type;
};


// constants
const float rayMarchEps     = 0.001;
const float normalEps       = 0.001;
const vec2 e                = vec2(normalEps, 0.0); // For swizzling
const float orbitTrapRadius = 1e4;

const float minDist = 0.f;
const float maxDist = 50.f;

// global variables
int numSteps = 0;


//float power = 8;
//int fractalIterations = 30;
//int colorIterations = fractalIterations;
//vec3 baseColor = vec3(1.f, 1.f, 1.f);
//float orbitMix = 1.f;

//vec4 xColor = vec4(0.2f, 0.2f, 0.2f, 0.0f);
//vec4 yColor = vec4(0.f, 1.f, 0.f, 1.f);
//vec4 zColor = vec4(0.3f, 0.9f, 0.f, 1.f);
//vec4 originColor = vec4(0.f, 0.1f, 0.6f, 1.f);

vec4 orbitTrap = vec4(orbitTrapRadius);

// movement, resolution, and time uniforms
uniform float iTime;
uniform vec2 iResolution;
uniform vec3 camEye;
uniform vec2 mousePos;

// mode uniforms
uniform int lowpowerMode;
uniform int useFreeView;


// lighting values
uniform float ka;
uniform float ks;
uniform float kd;
uniform float kr; // TODO
uniform int   useLighting; /* {0, 1} */

// coloring values
uniform vec3 ambientColor;     /* [0, 1]^3 */
uniform vec3 fractalBaseColor; /* [0, 1]^3 */
uniform vec4 xTrapColor;       /* [0, 1]^4 */
uniform vec4 yTrapColor;       /* [0, 1]^4 */
uniform vec4 zTrapColor;       /* [0, 1]^4 */
uniform vec4 originTrapColor;  /* [0, 1]^4 */

uniform float orbitMix; /* [0, 1] */
uniform float stepMix;  /* [0, 1] */

// fractal values
uniform float power;           /* [1, 28] */
uniform int raymarchSteps;     /* [500, 1229] */
uniform int fractalIterations; /* [1, 40] */
uniform float stepFactor;      /* (0, 1] */
uniform float bailout;


// <-------
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
// ------->


// Data structure for raymarching results
struct PrimitiveDist {
    float dist;
    int primitive; // Can be SPHERE, PLANE, or NO_INTERSECT
};


vec3 calcOrbitTrapColor() {
    orbitTrap.w = sqrt(orbitTrap.w);
    vec3 orbitColor = xTrapColor.xyz * xTrapColor.w * orbitTrap.x +
                      yTrapColor.xyz * yTrapColor.w * orbitTrap.y +
                      zTrapColor.xyz * zTrapColor.w * orbitTrap.z +
                      originTrapColor.xyz * originTrapColor.w * orbitTrap.w;
    return mix(fractalBaseColor, 1 * orbitColor,  orbitMix);
}

float DE(vec3 p) {
    vec3 z   = p;
    float dr = 1.0;
    float r  = 0.0;
    for (int i = 0; i < 30; i++) {
            r = length(z);
            if (r > 4) break;

            // convert to polar coordinates
            float theta = acos(z.z/r);
            float phi = atan(z.y,z.x);
            dr =  pow(r, power - 1.0) * power * dr + 1.0f;

            // scale and rotate the point
            float zr = pow(r, power);
            theta = theta * power;
            phi = phi * power;

            // convert back to cartesian coordinates
            z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
            z += p;
            orbitTrap = min(orbitTrap, abs(vec4(z.x, z.y, z.z, r * r)));
    }
    return 0.2f * log(r) * r / dr;
}

PrimitiveDist map(vec3 p) {
    if (lowpowerMode == USE_LOWPOWER_MODE) {
        //p = (rotX(-(0.5 * mousePos.y / iResolution.y))  * vec4(p, 1.0)).xyz;
        //p = (rotY(-(0.5 * mousePos.x / iResolution.x))  * vec4(p, 1.0)).xyz;

    }

    float mandelbulb = DE(p);
    return PrimitiveDist(mandelbulb, MANDELBULB);
}


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

    PrimitiveDist res;
    vec3 p = ro + rd * marchDist;
    for (int i = 0; i < 1000; i++) {
        numSteps += 1;
        res = map(ro + rd * marchDist);
        if (res.dist < rayMarchEps) {
            res.dist = marchDist;
            break;
        }
        if (marchDist > boundingDist) {
            res.dist = marchDist;
            res.primitive = NO_INTERSECT;
            break;
        }
        marchDist += res.dist * stepFactor;
    }
    return res;
}


vec3 render(vec3 ro, vec3 rd, float t, int which) {
    vec3 pos = ro + rd * t;
    vec3 col = calcOrbitTrapColor();

    if (useLighting == USE_LIGHTING) {
        vec3 lig = normalize(vec3(5.0, 5.0, 5.0));
        vec3 nor = calcNormal(pos);

        float diffuse = clamp(dot(nor, lig), 0.0, 1.0);
        float shineness = 32.0;
        float specular = pow(clamp(dot(-rd, reflect(lig, nor)), 0.0, 1.0), shineness);
        //specular = 0.f;

        float darkness = shadow(pos, lig, 18.0);
        //darkness = 1.f;
        col = (ka * ambientColor) + vec3((kd * diffuse + ks * specular) * darkness) * col;
    }
    return clamp(col, 0, 1);
}

vec4 renderBackground() {
    //return mix(vec4(0.f), vec4(1.f), numSteps / 1000);
    return vec4(0, 0, 0, 1.f);
}

void main() {
    const float focalLength = 2.f;

    // transform camera eye so that it matches global position
    vec3 newEye = camEye;
    //newEye = (rotX(-(0.5 * mousePos.y / iResolution.y))  * vec4(newEye, 1.0)).xyz;
    //newEye = (rotY(-(0.5 * mousePos.x / iResolution.x))  * vec4(newEye, 1.0)).xyz;

    // Look vector (always looking at origin)
    vec3 look = normalize(newEye);

    // Up vector
    vec3 up = vec3(0, 1, 0);

    // compute cam params and ray for current fragment
    vec3 cameraForward = -look;
    vec3 cameraRight = normalize(cross(cameraForward, up));
    vec3 cameraUp = normalize(cross(cameraRight, cameraForward));

    vec2 uv = vec2(fragUV.x, fragUV.y);
    uv.x = 2.f * uv.x - 1.f;
    uv.y = 2.f * uv.y - 1.f;

    uv.x *= iResolution.x / iResolution.y;
    vec3 rayDirection = vec3(uv.x, uv.y, focalLength);

    rayDirection = rayDirection.x * cameraRight + rayDirection.y * cameraUp + rayDirection.z * cameraForward;
    rayDirection = (rotX(-(0.5 * mousePos.y / iResolution.y))  * vec4(rayDirection, 0.0)).xyz;
    rayDirection = (rotY(-(0.5 * mousePos.x / iResolution.x))  * vec4(rayDirection, 0.0)).xyz;
    rayDirection = normalize(rayDirection);
    newEye = (rotX(-(0.5 * mousePos.y / iResolution.y))  * vec4(newEye, 1.0)).xyz;
    newEye = (rotY(-(0.5 * mousePos.x / iResolution.x))  * vec4(newEye, 1.0)).xyz;


    PrimitiveDist rayMarchResult = raymarch(newEye, rayDirection);
    if (rayMarchResult.primitive != NO_INTERSECT) {
      color = vec4(render(newEye, rayDirection, rayMarchResult.dist, rayMarchResult.primitive), 1);
    } else {
      color = renderBackground();
    }
}
