#ifndef VIEW_H
#define VIEW_H

#include "GL/glew.h"
#include <qgl.h>
#include <QTime>
#include <QTimer>
#include "gl/openglshape.h"
#include <chrono>


class View : public QGLWidget {
    Q_OBJECT

public:
    View(QWidget *parent);
    ~View();

private:
    std::chrono::time_point<std::chrono::high_resolution_clock> m_t0;
    std::chrono::time_point<std::chrono::high_resolution_clock> m_t1;
    float m_globalTime;

    QTime m_time;
    QTimer m_timer;
    bool m_captureMouse;
    GLuint m_program;
    std::unique_ptr<OpenGLShape> m_quad;

    void initializeGL();
    void paintGL();
    void resizeGL(int w, int h);

    void mousePressEvent(QMouseEvent *event);
    void mouseMoveEvent(QMouseEvent *event);
    void mouseReleaseEvent(QMouseEvent *event);

    void keyPressEvent(QKeyEvent *event);
    void keyReleaseEvent(QKeyEvent *event);

private slots:
    void tick();
};

#endif // VIEW_H
