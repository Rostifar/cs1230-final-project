#include "view.h"

#include "viewformat.h"
#include <QApplication>
#include <QKeyEvent>
#include <iostream>
#include "gl/resourceloader.h"
#include "gl/openglshape.h"
#include "gl/shaders/ShaderAttribLocations.h"
#include <glm/gtc/type_ptr.hpp>

extern const bool lowpowerMode;

View::View(QWidget *parent) : QGLWidget(ViewFormat(), parent),
    m_time(), m_timer(), m_captureMouse(true)
{
    m_camera = std::unique_ptr<SimpleCamera>(new SimpleCamera(glm::vec3(0.f, 0.f, -5.f)));
    //m_camera = std::unique_ptr<OrbitingCamera>(new OrbitingCamera());
    m_mouse  = std::unique_ptr<Mouse>(new Mouse(glm::vec2(0.f)));

    // View needs all mouse move events, not just mouse drag events
    setMouseTracking(true);

    // Hide the cursor
    if (m_captureMouse) {
        // QApplication::setOverrideCursor(Qt::BlankCursor);
    }

    // View needs keyboard focus
    setFocusPolicy(Qt::StrongFocus);

    // The update loop is implemented using a timer
    connect(&m_timer, SIGNAL(timeout()), this, SLOT(tick()));
}

View::~View()
{}

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
}

void View::moveLightingUniforms() {
    GLint kaUniformLoc = glGetUniformLocation(m_program, "ka");
    glUniform1f(kaUniformLoc, 0.2f);

    GLint kdUniformLoc = glGetUniformLocation(m_program, "kd");
    glUniform1f(kdUniformLoc, 1.f);

    GLint ksUniformLoc = glGetUniformLocation(m_program, "ks");
    glUniform1f(ksUniformLoc, 1.f);

    GLint krUniformLoc = glGetUniformLocation(m_program, "kr");
    glUniform1f(krUniformLoc, 1.f);

    GLint useLightingUniformLoc = glGetUniformLocation(m_program, "useLighting");
    glUniform1i(useLightingUniformLoc, 2);
}

void View::moveColoringUniforms() {
    GLint ambientColorUniformLoc = glGetUniformLocation(m_program, "ambientColor");
    glUniform3f(ambientColorUniformLoc, 1.f, 1.f, 1.f);

    GLint fractalBaseColorUniformLoc = glGetUniformLocation(m_program, "fractalBaseColor");
    glUniform3f(fractalBaseColorUniformLoc, 1.f, 1.f, 1.f);

    GLint xTrapColorUniformLoc = glGetUniformLocation(m_program, "xTrapColor");
    glUniform4f(xTrapColorUniformLoc, 0.2f, 0.2f, 0.2f, 0.0f);

    GLint yTrapColorUniformLoc = glGetUniformLocation(m_program, "yTrapColor");
    glUniform4f(yTrapColorUniformLoc, 0.f, 1.f, 0.f, 1.f);

    GLint zTrapColorUniformLoc = glGetUniformLocation(m_program, "zTrapColor");
    glUniform4f(zTrapColorUniformLoc, 0.3f, 0.9f, 0.f, 1.f);

    GLint originTrapColorUniformLoc = glGetUniformLocation(m_program, "originTrapColor");
    glUniform4f(originTrapColorUniformLoc, 0.f, 0.1f, 0.6f, 1.f);

    GLint orbitMixUniformLoc = glGetUniformLocation(m_program, "orbitMix");
    glUniform1f(orbitMixUniformLoc, 1.f);

    GLint stepMixUniformLoc = glGetUniformLocation(m_program, "stepMix");
    glUniform1f(stepMixUniformLoc, 0.2f);
}

void View::moveFractalUniforms() {
    GLint powerUniformLoc = glGetUniformLocation(m_program, "power");
    glUniform1f(powerUniformLoc, 6.f);

    GLint raymarchStepsUniformLoc = glGetUniformLocation(m_program, "raymarchSteps");
    glUniform1i(raymarchStepsUniformLoc, 768);

    GLint fractalIterationsUniformLoc = glGetUniformLocation(m_program, "fractalIterations");
    glUniform1i(fractalIterationsUniformLoc, 30);

    GLint stepFactorUniformLoc = glGetUniformLocation(m_program, "stepFactor");
    glUniform1f(stepFactorUniformLoc, 0.2f);

    GLint bailoutUniformLoc = glGetUniformLocation(m_program, "bailout");
    glUniform1f(bailoutUniformLoc, 2.f);

    GLint ambientOcclusionUniformLoc = glGetUniformLocation(m_program, "aoStrength");
    glUniform1f(ambientOcclusionUniformLoc, 1.f);
}


void View::paintGL() {

    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glUseProgram(m_program);

    GLint screenResUniformLoc = glGetUniformLocation(m_program, "iResolution");
    GLint m_viewport[4];
    glGetIntegerv(GL_VIEWPORT, m_viewport);

    glUniform2f(screenResUniformLoc, static_cast<float>(m_viewport[2]), static_cast<float>(m_viewport[3]));

    // TODO: do we really need to change these all of the time?
    GLint timeUniformLoc = glGetUniformLocation(m_program, "iTime");
    glUniform1f(timeUniformLoc, m_accTime);

    GLint camEyeUniformLoc = glGetUniformLocation(m_program, "camEye");
    const glm::vec3 eye = m_camera->getEye();
    glUniform3f(camEyeUniformLoc, eye.x, eye.y, eye.z);

    GLint mousePosUniformLoc = glGetUniformLocation(m_program, "mousePos");
    const glm::vec2 mousePos = m_mouse->getPos();
    glUniform2f(mousePosUniformLoc, mousePos.x, mousePos.y);

    GLint lowpowerModeUniformLoc = glGetUniformLocation(m_program, "lowerpowerMode");
    glUniform1i(lowpowerModeUniformLoc, lowpowerMode ? 1 : 0);

    moveLightingUniforms();
    moveColoringUniforms();
    moveFractalUniforms();
    GLint freeViewUniformLoc = glGetUniformLocation(m_program, "useFreeView");
    glUniform1i(freeViewUniformLoc, 1);

    m_quad->draw();
    glUseProgram(0);
}

void View::resizeGL(int w, int h) {
    float ratio = static_cast<QGuiApplication *>(QCoreApplication::instance())->devicePixelRatio();
    w = static_cast<int>(w / ratio);
    h = static_cast<int>(h / ratio);
    glViewport(0, 0, w, h);
}

void View::mousePressEvent(QMouseEvent *event) {
}

void View::mouseMoveEvent(QMouseEvent *event) {
    // This starter code implements mouse capture, which gives the change in
    // mouse position since the last mouse movement. The mouse needs to be
    // recentered after every movement because it might otherwise run into
    // the edge of the screen, which would stop the user from moving further
    // in that direction. Note that it is important to check that deltaX and
    // deltaY are not zero before recentering the mouse, otherwise there will
    // be an infinite loop of mouse move events.
    if(m_captureMouse && !lowpowerMode) {
        int deltaX = event->x() - width() / 2;
        int deltaY = event->y() - height() / 2;
        if (!deltaX && !deltaY) return;
        QCursor::setPos(mapToGlobal(QPoint(width() / 2, height() / 2)));
        m_mouse->translate(deltaX , deltaY);
        update();
    }
}

void View::mouseReleaseEvent(QMouseEvent *event) {
}


void View::wheelEvent(QWheelEvent *event) {
    if(!lowpowerMode) {
        m_camera->mouseScrolled(event->delta() * 0.3f);
        update();
    }
}


void View::keyPressEvent(QKeyEvent *event) {
    if (event->key() == Qt::Key_Escape) QApplication::quit();
}

void View::keyReleaseEvent(QKeyEvent *event) {
}

void View::tick() {
    // Get the number of seconds since the last tick (variable update rate)
    float seconds = m_time.restart() * 0.001f;
    m_accTime += seconds;
    update();
}
