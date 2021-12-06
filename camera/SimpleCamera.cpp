#include "SimpleCamera.h"

SimpleCamera::SimpleCamera(const glm::vec3 &start) : m_eye(start)
{}

void SimpleCamera::mouseScrolled(int delta) {
    m_eye.z *= powf(0.999f, delta);
}


glm::vec3 SimpleCamera::getEye() {
    return m_eye;
}

