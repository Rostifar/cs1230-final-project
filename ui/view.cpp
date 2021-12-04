#include "view.h"

#include "viewformat.h"
#include <QApplication>
#include <QKeyEvent>
#include <iostream>
#include "gl/resourceloader.h"
#include "gl/openglshape.h"
#include "gl/shaders/ShaderAttribLocations.h"

View::View(QWidget *parent) : QGLWidget(ViewFormat(), parent),
    m_time(), m_timer(), m_captureMouse(false), m_isDragging(false),
    m_oldPosX(0), m_oldPosY(0), m_oldPosZ(0), m_oldRotU(0), m_oldRotV(0), m_oldRotN(0)
{
    m_camera = std::unique_ptr<OrbitingCamera>(new OrbitingCamera);

    // View needs all mouse move events, not just mouse drag events
    setMouseTracking(true);

    // Hide the cursor
    if (m_captureMouse) {
        QApplication::setOverrideCursor(Qt::BlankCursor);
    }

    // View needs keyboard focus
    setFocusPolicy(Qt::StrongFocus);

    // The update loop is implemented using a timer
    connect(&m_timer, SIGNAL(timeout()), this, SLOT(tick()));
}

View::~View()
{
}

void View::initializeGL() {
    // All OpenGL initialization *MUST* be done during or after this
    // method. Before this method is called, there is no active OpenGL
    // context and all OpenGL calls have no effect.

    //initialize glew
    glewExperimental = GL_TRUE;
    GLenum err = glewInit();
    if (GLEW_OK != err) {
        /* Problem: glewInit failed, something is seriously wrong. */
        std::cerr << "Something is very wrong, glew initialization failed." << std::endl;
    }
    std::cout << "Using GLEW " <<  glewGetString( GLEW_VERSION ) << std::endl;

    // Start a timer that will try to get 60 frames per second (the actual
    // frame rate depends on the operating system and other running programs)
    m_time.start();
    m_timer.start(1000 / 60);

    glEnable(GL_DEPTH_TEST);
    glEnable(GL_CULL_FACE);

    // resize
    resizeGL(width(), height());

    // Set the color to set the screen when the color buffer is cleared.
    glClearColor(0.0f, 0.0f, 0.0f, 0.0f);

    // Creates the shader program that will be used for drawing.
    m_program = ResourceLoader::createShaderProgram(":/shaders/raymarch.vert", ":/shaders/raymarch.frag");

    // vertex coordinates followed by uv
    std::vector<float> quad = {
        -1,  1, 0, 0, 1,
        -1, -1, 0, 0, 0,
         1,  1, 0, 1, 1,
         1, -1, 0, 1, 0
    };

    // construct a fullscreen quad
    m_quad = std::make_unique<OpenGLShape>();
    m_quad->setVertexData(&quad[0], quad.size(), VBO::GEOMETRY_LAYOUT::LAYOUT_TRIANGLE_STRIP, quad.size() / 5);
    m_quad->setAttribute(ShaderAttrib::POSITION, 3, 0, VBOAttribMarker::DATA_TYPE::FLOAT, false);
    m_quad->setAttribute(ShaderAttrib::TEXCOORD0, 2, 12, VBOAttribMarker::DATA_TYPE::FLOAT, false);
    m_quad->buildVAO();

    m_camera->updateMatrices();
}

void View::paintGL() {

    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glUseProgram(m_program);

    GLint screenResUniformLoc = glGetUniformLocation(m_program, "iResolution");
    GLint m_viewport[4];
    glGetIntegerv(GL_VIEWPORT, m_viewport);

    // assert(m_viewport[2] == width() && m_viewport[3] == height());
    glUniform2f(screenResUniformLoc, static_cast<float>(m_viewport[2]), static_cast<float>(m_viewport[3]));

    GLint timeUniformLoc = glGetUniformLocation(m_program, "iTime");
    glUniform1f(timeUniformLoc, 0.f);

    GLint camEyeUniformLoc = glGetUniformLocation(m_program, "camEye");
    glUniform3f(camEyeUniformLoc, m_camera->);


    uniform vec3 camEye;
    uniform vec3 camUp;
    uniform float focalLen;

    m_quad->draw();
    glUseProgram(0);
}

void View::resizeGL(int w, int h) {
    float ratio = static_cast<QGuiApplication *>(QCoreApplication::instance())->devicePixelRatio();
    w = static_cast<int>(w / ratio);
    h = static_cast<int>(h / ratio);
    glViewport(0, 0, w, h);
    //m_camera->setAspectRatio();
}

void View::mousePressEvent(QMouseEvent *event) {
    if (event->button() == Qt::RightButton) {
        m_camera->mouseDown(event->x(), event->y());
        m_isDragging = true;
        update();
    }
}

void View::mouseMoveEvent(QMouseEvent *event) {
    // This starter code implements mouse capture, which gives the change in
    // mouse position since the last mouse movement. The mouse needs to be
    // recentered after every movement because it might otherwise run into
    // the edge of the screen, which would stop the user from moving further
    // in that direction. Note that it is important to check that deltaX and
    // deltaY are not zero before recentering the mouse, otherwise there will
    // be an infinite loop of mouse move events.
    if(m_captureMouse) {
        int deltaX = event->x() - width() / 2;
        int deltaY = event->y() - height() / 2;
        if (!deltaX && !deltaY) return;
        QCursor::setPos(mapToGlobal(QPoint(width() / 2, height() / 2)));

        // TODO: Handle mouse movements here
    }

    if (m_isDragging) {
        m_camera->mouseDragged(event->x(), event->y());
        update();
    }
}

void View::mouseReleaseEvent(QMouseEvent *event) {
    if (m_isDragging && event->button() == Qt::RightButton) {
            m_camera->mouseUp(event->x(), event->y());
            m_isDragging = false;
            update();
    }
}

void View::keyPressEvent(QKeyEvent *event) {
    if (event->key() == Qt::Key_Escape) QApplication::quit();

    // TODO: Handle keyboard presses here
}

void View::keyReleaseEvent(QKeyEvent *event) {

}

void View::tick() {
    // Get the number of seconds since the last tick (variable update rate)
    float seconds = m_time.restart() * 0.001f;

    // TODO: Implement the demo update here

    // Flag this view for repainting (Qt will call paintGL() soon after)
    update();
}
