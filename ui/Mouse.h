#ifndef MOUSE_H
#define MOUSE_H

#include <glm.hpp>


class   Mouse
{
public:
    Mouse(const glm::vec2 &initalPos);
    void translate(float dx, float dy);
    glm::vec2 getPos();
private:
    glm::vec2 m_pos;
};

#endif // MOUSE_H
