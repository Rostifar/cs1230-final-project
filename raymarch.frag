#   version 400
#define USE_LOWPOWER_MODE 0
#define USE_FREEVIEW      1
#define USE_LIGHTING      2

#define MANDELBULB        50
#define JULIA_QUATERNION  51
#define MANDELBOX         52
#define NO_INTERSECT      53

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
const float orbitTrapIntensityScale = 3.f;

const vec3 starLow = vec3(0.61, 0.69, 0.99);
const vec3 starHigh = vec3(0.99, 0.80, 0.43);

// global variables
int numSteps = 0;

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
//uniform int   useLighting; /* {0, 1} */ @deprecated
uniform int   useLight1; /* {0, 1} */
uniform int   useLight2; /* {0, 1}*/

// coloring values
uniform vec3 ambientColor;     /* [0, 1]^3 */
uniform vec3 fractalBaseColor; /* [0, 1]^3 */
uniform vec4 xTrapColor;       /* [0, 1]^4 */
uniform vec4 yTrapColor;       /* [0, 1]^4 */
uniform vec4 zTrapColor;       /* [0, 1]^4 */
uniform vec4 originTrapColor;  /* [0, 1]^4 */

uniform float orbitMix; /* [0, 1] */
//uniform float stepMix;  /* [0, 1] */ @deprecated

// fractal values
uniform float power;           /* [1, 28] */
uniform int raymarchSteps;     /* [500, 1229] */
uniform int fractalIterations; /* [1, 40] */
uniform float stepFactor;      /* (0, 1] */
uniform float bailout;         /* [1, 8]*/
uniform float aoStrength;      /* [0, 100] */
uniform int   fractalType;
uniform int   animate;


// <---HELPERS----
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

// rand function; src: https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
float rand(float i){
    return fract(sin(dot(vec2(i, i), vec2(32.9898,78.233))) * 43758.5453);
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
    return clamp(mix(fractalBaseColor, orbitTrapIntensityScale * orbitColor,  orbitMix), 0, 1);
}


float mandelbulbDE(vec3 p) {
    vec3 z   = p;
    float dr = 1.0;
    float r  = 0.0;
    float newPower = (animate == 1) ? clamp(cos(iTime / 2) * 8, 2, 30) : power;
    for (int i = 0; i < fractalIterations; i++) {
            r = length(z);
            if (r > bailout) break;

            // convert to polar coordinates
            float theta = acos(z.z/r);
            float phi = atan(z.y,z.x);
            dr = pow(r, newPower - 1.0) * newPower * dr + 1.0f;

            // scale and rotate the point
            float zr = pow(r, newPower);
            theta = theta * newPower;
            phi = phi * newPower;

            // convert back to cartesian coordinates
            z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
            z += p;
            orbitTrap = min(orbitTrap, abs(vec4(z.x, z.y, z.z, r * r)));
    }
    return 0.2f * log(r) * r / dr;
}

float juliaQuaternionDE(vec3 pos) {
    vec4 q1 = vec4(pos, 0.0);
    vec4 q2 = vec4(1.0, 0.0, 0.0, 0.0);
    for (int i = 0; i < fractalIterations; i++) {
        // quaternion multiplication
        q2 = 2.f * vec4(q1.x * q2.x - dot(q1.yzw, q2.yzw), q1.x * q2.yzw + q2.x * q1.yzw + cross(q1.yzw, q2.yzw));

        // quaternion sqrt
        q1 = vec4(q1.x * q1.x - dot(q1.yzw, q1.yzw), vec3(2.f * q1.x * q1.yzw)) + ((animate == 1) ? cos(iTime / 2) : 0.3f);
        float pDelta = dot(q1, q1);
        orbitTrap = min(orbitTrap, abs(vec4(q1.xyz, pDelta)));
        if (pDelta > bailout) break;
    }
    float r = length(q1);
    return 0.2f * r * log(r) / length(q2);
}

float mandelboxDE(vec3 pos) {
    // constants chosen empirically (combination of speed and aesthetics)
    vec4 scalevec = vec4(2.8f) / 0.2f;
    float c2 = pow(2.8f, float(1 - fractalIterations));

    vec4 p  = vec4(pos.xyz, 1.0);
    vec4 p0 = vec4(pos.xyz, 1.0);
    for(int i = 0; i < fractalIterations; i++) {
        // perform box folding
        p.xyz = clamp(p.xyz, -1.0, 1.0) * 2.0 - p.xyz;
        float r2 = dot(p.xyz, p.xyz);

        orbitTrap = min(orbitTrap, abs(vec4(p.xyz,r2)));

        // perform sphere folding
        p.xyzw *= clamp(max(0.2f / r2, 0.2f), 0.0, 1.0);
        p.xyzw = p*scalevec + p0;
    }
    return (length(p.xyz) - 1.8f) / p.w - c2;
}

PrimitiveDist map(vec3 p) {
    PrimitiveDist dist;
    if (fractalType == JULIA_QUATERNION) {
        dist = PrimitiveDist(juliaQuaternionDE(p), JULIA_QUATERNION);
    }
    else if (fractalType == MANDELBOX) {
        dist = PrimitiveDist(mandelboxDE(p), MANDELBOX);
    }
    else {
        dist = PrimitiveDist(mandelbulbDE(p), MANDELBULB);
    }
    return dist;
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

float ambientOcclusion(vec3 p, vec3 n) {
    float aoEps = 0.001;
    float delta = 2.f * aoEps;

    float ao = 0;
    float denom = 0.5f;

    for (int i = 1; i < 6; i++) {
        float fd = map(p + n * delta * i).dist;
        ao += (delta * i - fd) / denom;
        denom *= 0.5;
        delta = delta * 2.0 - aoEps;
    }
    ao *= aoStrength;
    return clamp(1 - ao, 0.0, 1.0);
}


PrimitiveDist raymarch(vec3 ro, vec3 rd) {
    float marchDist = 0.001;
    float boundingDist = 50.0;

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
        marchDist += res.dist * stepFactor;
    }
    return res;
}


vec3 render(vec3 ro, vec3 rd, float t, int which) {
    vec3 pos = ro + rd * t;
    vec3 col = calcOrbitTrapColor();

    if (useLight1 == 1 || useLight2 == 0) {
        vec3 lig1 = normalize(vec3(5.f, 5.f, 5.f) - pos);
        vec3 lig2 = normalize(vec3(-5.0, -5.0, -5.0) - pos);

        vec3 nor = calcNormal(pos);

        float diffuse = 0.f;
        float shineness = 32.0;
        float specular = 0.f;

        float lightCol = 0.f;
        if (useLight1 == 1) {
            float darkness = shadow(pos, lig1, 18.0);
            diffuse = clamp(dot(nor, lig1), 0.0, 1.0);
            specular = pow(clamp(dot(-rd, reflect(lig1, nor)), 0.0, 1.0), shineness);
            lightCol += darkness * (kd * diffuse + ks * specular);
        }

        if (useLight2 == 1) {
            float darkness = shadow(pos, lig2, 18.0);
            diffuse = clamp(dot(nor, lig2), 0.0, 1.0);
            specular = pow(clamp(dot(-rd, reflect(lig2, nor)), 0.0, 1.0), shineness);
            lightCol += darkness * (kd * diffuse + ks * specular);
        }

        float ao = ambientOcclusion(pos, nor);
        //ao = 1;
        col = ((ao * ka * ambientColor) + vec3(lightCol) * col);
    }
    return clamp(col, 0, 1);
}

vec4 renderBackground() {
    vec4 star = vec4(rand(fragUV.x * fragUV.y));
    star *= pow(rand(fragUV.x * fragUV.y), 132.f);
    star.xyz *= mix(starLow, starHigh, rand(fragUV.x + fragUV.y));
    return star * cos(iTime * rand(fragUV.x / iResolution.x));
}


void main() {
    const float focalLength = 2.f;

    // transform camera eye so that it matches global position
    vec3 newEye = camEye;
    if (useFreeView != USE_FREEVIEW) {
        newEye =  vec3(sin(iTime) * 4, 0, cos(iTime) * 4);
    }

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
    rayDirection = normalize(rayDirection);
    rayDirection = rayDirection.x * cameraRight + rayDirection.y * cameraUp + rayDirection.z * cameraForward;

    if (useFreeView == USE_FREEVIEW) {
        rayDirection = (rotX(-(0.5 * mousePos.y / iResolution.y))  * vec4(rayDirection, 0.0)).xyz;
        rayDirection = (rotY(-(0.5 * mousePos.x / iResolution.x))  * vec4(rayDirection, 0.0)).xyz;

        newEye = (rotX(-(0.5 * mousePos.y / iResolution.y))  * vec4(newEye, 1.0)).xyz;
        newEye = (rotY(-(0.5 * mousePos.x / iResolution.x))  * vec4(newEye, 1.0)).xyz;
    }

    PrimitiveDist rayMarchResult = raymarch(newEye, rayDirection);
    if (rayMarchResult.primitive != NO_INTERSECT) {
      color = vec4(render(newEye, rayDirection, rayMarchResult.dist, rayMarchResult.primitive), 1);
    } else {
      color = renderBackground();
    }
}
