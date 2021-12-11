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


// constants
const float rayMarchEps     = 0.001;
const float normalEps       = 0.001;
const vec2 e                = vec2(normalEps, 0.0); // For swizzling
const float orbitTrapRadius = 1e4;

const float minDist = 0.f;
const float maxDist = 50.f;

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


// coloring values
uniform vec3 ambientColor;
uniform vec3 fractalBaseColor; /* [0, 1]^3 */
uniform vec4 xTrapColor;       /* [0, 1]^4 */
uniform vec4 yTrapColor;       /* [0, 1]^4 */
uniform vec4 originTrapColor;  /* [0, 1]^4 */

uniform float orbitMix; /* [0, 1] */
uniform float stepMix;  /* [0, 1] */
uniform int   useLighting; /* {0, 1} */

// fractal values
uniform float power;           /* [1, 28] */
uniform int raymarchSteps;     /* [500, 1229] */
uniform int fractaliterations; /* [1, 40] */


//struct Light {
//    vec3 position;
//    vec3 intensity;
//    int type;
//};


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

int numSteps = 0;


// Data structure for raymarching results
struct PrimitiveDist {
    float dist;
    int primitive; // Can be SPHERE, PLANE, or NO_INTERSECT
};


float sdFloor(vec3 p) {
    float h = 1;
    float r = 0.5;
    vec2 d = abs(vec2(length(p.xz),p.y)) - vec2(h,r);
    return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}

vec3 calcOrbitTrapColor() {
        orbitTrap.w = sqrt(orbitTrap.w);
        vec3 orbitColor = xColor.xyz * xColor.w * orbitTrap.x +
                          yColor.xyz * yColor.w * orbitTrap.y +
                          zColor.xyz * zColor.w * orbitTrap.z +
                          originColor.xyz * originColor.w * orbitTrap.w;
        return mix(baseColor, 3 * orbitColor,  orbitMix);
}

float DE(vec3 p) {
    vec3 z = p;
    float dr = 1.0;
    float r = 0.0;
    float Bailout = 4.0;
    int Iterations = 30;
    float Power = 10;
    for (int i = 0; i < fractalIterations ; i++) {
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
            orbitTrap = min(orbitTrap, abs(vec4(z.x,z.y,z.z,r*r)));
    }
    return 0.2*log(r)*r/dr;
}

PrimitiveDist map(vec3 p) {
    if (lowpowerMode == USE_LOWPOWER_MODE) {
        p = (rotX(-(0.5 * mousePos.y / iResolution.y))  * vec4(p, 1.0)).xyz;
        p = (rotY(-(0.5 * mousePos.x / iResolution.x)) * vec4(p, 1.0)).xyz;
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
    float boundingDist = 20.0;

    PrimitiveDist res;

    vec3 p = ro + rd * marchDist;
    for (int i = 0; i < raymarchSteps; i++) {
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
        marchDist += res.dist * 0.2;
    }
    return res;
}



vec3 render(vec3 ro, vec3 rd, float t, int which) {
    vec3 pos = ro + rd * t;

    vec3 col = calcOrbitTrapColor();

    if (useLighting == USE_LIGHTING) {
        vec3 lig = normalize(vec3(0,0,0.5) - pos);

        // Normal vector
        vec3 nor = calcNormal(pos);

        float ambient = 0.1;
        float diffuse = clamp(dot(nor, lig), 0.0, 1.0);
        float shineness = 32.0;
        float specular = pow(clamp(dot(pos - camEye, reflect(lig, nor)), 0.0, 1.0), 32.0);
        specular = 0.f;

        float darkness = shadow(pos, lig, 18.0);
        darkness = 1.f;
        // Applying the phong lighting model to the pixel.
        col = (ka * ambientColor) + vec3((kd * diffuse + ks * specular) * darkness) * col;

    }
    return clamp(col, 0, 1);
}

void main() {
    const float focalLength = 2.f;
    vec3 newEye = camEye;

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
    rayDirection = normalize(rayDirection);

    PrimitiveDist rayMarchResult = raymarch(newEye, rayDirection);
    if (rayMarchResult.primitive != NO_INTERSECT) {
      color = vec4(render(newEye, rayDirection, rayMarchResult.dist, rayMarchResult.primitive), 1);
    } else {
      color = mix(vec4(0.f), vec4(1.f), numSteps / 90);
    }
}
