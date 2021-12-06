#include "Mouse.h"

Mouse::Mouse(const glm::vec2 &initalPos) : m_pos(initalPos)
{}

void Mouse::translate(float dx, float dy) {
    m_pos += dx;
    m_pos += dy;
}

glm::vec2 Mouse::getPos() {
    return m_pos;
}

