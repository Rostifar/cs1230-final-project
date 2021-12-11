#ifndef VIEW_H
#define VIEW_H

#include "GL/glew.h"
#include <qgl.h>
#include <QTime>
#include <QTimer>
#include "gl/openglshape.h"
#include "camera/SimpleCamera.h"
#include "Mouse.h"
#include "camera/OrbitingCamera.h"


class View : public QGLWidget {
    Q_OBJECT

public:
    View(QWidget *parent);
    ~View();

private:
    // movement variables
    std::unique_ptr<SimpleCamera> m_camera;
    std::unique_ptr<Mouse> m_mouse;
    glm::vec4 m_cameraEye;
    bool m_captureMouse;

    // time variables
    float m_accTime;
    QTime m_time;
    QTimer m_timer;

    // opengl variables
    GLuint m_program;
    std::unique_ptr<OpenGLShape> m_quad;

    void initializeGL();
    void paintGL();
    void resizeGL(int w, int h);

    void moveLightingUniforms();
    void moveColoringUniforms();
    void moveFractalUniforms();

    void mousePressEvent(QMouseEvent *event);
    void mouseMoveEvent(QMouseEvent *event);
    void mouseReleaseEvent(QMouseEvent *event);
    void wheelEvent(QWheelEvent *event);

    void keyPressEvent(QKeyEvent *event);
    void keyReleaseEvent(QKeyEvent *event);

private slots:
    void tick();
};

#endif // VIEW_H
