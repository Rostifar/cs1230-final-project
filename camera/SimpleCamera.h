#ifndef SIMPLECAMERA_H
#define SIMPLECAMERA_H

#include "Camera.h"

class SimpleCamera : Camera
{
public:
    SimpleCamera(const glm::vec3 &start);

    virtual void setAspectRatio(float aspectRatio) {}

    virtual glm::mat4x4 getProjectionMatrix()  const { throw 0; }
    virtual glm::mat4x4 getViewMatrix()        const { throw 0; }
    virtual glm::mat4x4 getScaleMatrix()       const { throw 0; }
    virtual glm::mat4x4 getPerspectiveMatrix() const { throw 0; }
    virtual void mouseScrolled(int delta);

    glm::vec3 getEye();

private:
    glm::vec3 m_eye;
};

#endif // SIMPLECAMERA_H
