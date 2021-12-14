#include "view.h"

#include "viewformat.h"
#include "Settings.h"

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
        QApplication::setOverrideCursor(Qt::BlankCursor);
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
    glUniform1f(kaUniformLoc, settings.ka_value);

    GLint kdUniformLoc = glGetUniformLocation(m_program, "kd");
    glUniform1f(kdUniformLoc, settings.kd_value);

    GLint ksUniformLoc = glGetUniformLocation(m_program, "ks");
    glUniform1f(ksUniformLoc, settings.ks_value);

    GLint useLight1UniformLoc = glGetUniformLocation(m_program, "useLight1");
    glUniform1i(useLight1UniformLoc, settings.useLight1 ? 1 : 0);
    GLint useLight2UniformLoc = glGetUniformLocation(m_program, "useLight2");
    glUniform1i(useLight2UniformLoc, settings.useLight2 ? 1 : 0);
}

void View::moveColoringUniforms() {
    GLint ambientColorUniformLoc = glGetUniformLocation(m_program, "ambientColor");
    glUniform3f(ambientColorUniformLoc, calibrate(settings.ambient_color[0]), calibrate(settings.ambient_color[1]), calibrate(settings.ambient_color[2]));

    GLint fractalBaseColorUniformLoc = glGetUniformLocation(m_program, "fractalBaseColor");
    glUniform3f(fractalBaseColorUniformLoc, calibrate(settings.base_color[0]), calibrate(settings.base_color[1]), calibrate(settings.base_color[2]));

    GLint xTrapColorUniformLoc = glGetUniformLocation(m_program, "xTrapColor");
    glUniform4f(xTrapColorUniformLoc, calibrate(settings.xTrap_color[0]), calibrate(settings.xTrap_color[1]), calibrate(settings.xTrap_color[2]), calibrate(settings.xTrap_color[3]));

    GLint yTrapColorUniformLoc = glGetUniformLocation(m_program, "yTrapColor");
    glUniform4f(yTrapColorUniformLoc, calibrate(settings.yTrap_color[0]), calibrate(settings.yTrap_color[1]), calibrate(settings.yTrap_color[2]), calibrate(settings.yTrap_color[3]));

    GLint zTrapColorUniformLoc = glGetUniformLocation(m_program, "zTrapColor");
    glUniform4f(zTrapColorUniformLoc, calibrate(settings.zTrap_color[0]), calibrate(settings.zTrap_color[1]), calibrate(settings.zTrap_color[2]), calibrate(settings.zTrap_color[3]));

    GLint originTrapColorUniformLoc = glGetUniformLocation(m_program, "originTrapColor");
    glUniform4f(originTrapColorUniformLoc, calibrate(settings.oTrap_color[0]), calibrate(settings.oTrap_color[1]), calibrate(settings.oTrap_color[2]), calibrate(settings.oTrap_color[3]));

    GLint orbitMixUniformLoc = glGetUniformLocation(m_program, "orbitMix");
    glUniform1f(orbitMixUniformLoc, settings.orbitMix);
}

void View::moveFractalUniforms() {
    GLint powerUniformLoc = glGetUniformLocation(m_program, "power");
    glUniform1f(powerUniformLoc, settings.power);

    GLint raymarchStepsUniformLoc = glGetUniformLocation(m_program, "raymarchSteps");
    glUniform1i(raymarchStepsUniformLoc, settings.raymarchSteps);

    GLint fractalIterationsUniformLoc = glGetUniformLocation(m_program, "fractalIterations");
    glUniform1i(fractalIterationsUniformLoc, settings.fractalIterations);

    GLint stepFactorUniformLoc = glGetUniformLocation(m_program, "stepFactor");
    glUniform1f(stepFactorUniformLoc, settings.stepFactor);

    GLint bailoutUniformLoc = glGetUniformLocation(m_program, "bailout");
    glUniform1f(bailoutUniformLoc, settings.bailout);

    GLint ambientOcclusionUniformLoc = glGetUniformLocation(m_program, "aoStrength");
    glUniform1f(ambientOcclusionUniformLoc, settings.ao);

    GLint fractalTypeUniformLoc = glGetUniformLocation(m_program, "fractalType");

    GLint animateUniformLoc = glGetUniformLocation(m_program, "animate");
    glUniform1i(animateUniformLoc, settings.animate == true ? 1 : 0);
    glUniform1i(fractalTypeUniformLoc, 50 + settings.fractalType);
}


void View::paintGL() {

    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glUseProgram(m_program);

    GLint screenResUniformLoc = glGetUniformLocation(m_program, "iResolution");
    GLint m_viewport[4];
    glGetIntegerv(GL_VIEWPORT, m_viewport);

    glUniform2f(screenResUniformLoc, static_cast<float>(m_viewport[2]), static_cast<float>(m_viewport[3]));

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
    glUniform1i(freeViewUniformLoc, settings.useFreeMode ? 1 : 0);

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
    if(m_captureMouse && !lowpowerMode && settings.useFreeMode) {
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
    if(!lowpowerMode && settings.useFreeMode) {
        m_camera->mouseScrolled(event->delta() * 0.3f);
        update();
    }
}


void View::keyPressEvent(QKeyEvent *event) {
    if (event->key() == Qt::Key_Escape) QApplication::quit();
    if (event->key() == Qt::Key_T) {
        if (m_captureMouse) {
            QApplication::setOverrideCursor(Qt::ArrowCursor);
            m_captureMouse = false;
        } else {
            QApplication::setOverrideCursor(Qt::BlankCursor);
            m_captureMouse = true;
        }
    }
}

void View::keyReleaseEvent(QKeyEvent *event) {
}

void View::tick() {
    // Get the number of seconds since the last tick (variable update rate)
    float seconds = m_time.restart() * 0.001f;
    m_accTime += seconds;
    update();
}


