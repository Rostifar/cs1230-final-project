uniform vec2 uScreenResolution;
varying vec2 vUV;

void main() {
    // vUV is equal to gl_FragCoord/uScreenResolution
    // do some pixel shader related work
    gl_FragColor = vec3(0.f, 0.f, 0.f);
}
