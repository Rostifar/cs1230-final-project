#include "mainwindow.h"
#include "ui_mainwindow.h"
#include "view.h"
#include "Databinding.h"
#include "Settings.h"
#include <QGLFormat>
#include <QtWidgets>


MainWindow::MainWindow(QWidget *parent) :
    QMainWindow(parent),
    ui(new Ui::MainWindow)
{
    settings.loadSettingsOrDefaults();
    ui->setupUi(this);
    databind();
}

MainWindow::~MainWindow()
{
    delete ui;
}

void MainWindow::databind() {
#define BIND(b) { \
    DataBinding *_b = (b); \
    m_bindings.push_back(_b); \
}
    QButtonGroup *fractalButtonGroup = new QButtonGroup;

    m_buttonGroups.push_back(fractalButtonGroup);

    BIND(FloatBinding::bindSliderAndTextbox(ui->ka_horizontalSlider, ui->ka_lineEdit, settings.ka_value, 0.0, 1.0));
    BIND(FloatBinding::bindSliderAndTextbox(ui->kd_horizontalSlider, ui->kd_lineEdit, settings.kd_value, 0.0, 1.0));
    BIND(FloatBinding::bindSliderAndTextbox(ui->ks_horizontalSlider, ui->ks_lineEdit, settings.ks_value, 0.0, 1.0));
    BIND(BoolBinding::bindCheckbox(ui->light1Toggle, settings.useLight1));
    BIND(BoolBinding::bindCheckbox(ui->light2Toggle, settings.useLight2));
    BIND(FloatBinding::bindSliderAndTextbox(ui->ao_horizontal_slider, ui->ao_lineEdit, settings.ao, 0, 5));

    BIND(IntBinding::bindTextbox(ui->ambient_lineEdit_r, settings.ambient_color[0]));
    BIND(IntBinding::bindTextbox(ui->ambient_lineEdit_g, settings.ambient_color[1]));
    BIND(IntBinding::bindTextbox(ui->ambient_lineEdit_b, settings.ambient_color[2]));
    BIND(IntBinding::bindTextbox(ui->base_lineEdit_r, settings.base_color[0]));
    BIND(IntBinding::bindTextbox(ui->base_lineEdit_g, settings.base_color[1]));
    BIND(IntBinding::bindTextbox(ui->base_lineEdit_b, settings.base_color[2]));
    BIND(IntBinding::bindTextbox(ui->xTrap_lineEdit_x, settings.xTrap_color[0]));
    BIND(IntBinding::bindTextbox(ui->xTrap_lineEdit_y, settings.xTrap_color[1]));
    BIND(IntBinding::bindTextbox(ui->xTrap_lineEdit_z, settings.xTrap_color[2]));
    BIND(IntBinding::bindTextbox(ui->xTrap_lineEdit_w, settings.xTrap_color[3]));
    BIND(IntBinding::bindTextbox(ui->yTrap_lineEdit_x, settings.yTrap_color[0]));
    BIND(IntBinding::bindTextbox(ui->yTrap_lineEdit_y, settings.yTrap_color[1]));
    BIND(IntBinding::bindTextbox(ui->yTrap_lineEdit_z, settings.yTrap_color[2]));
    BIND(IntBinding::bindTextbox(ui->yTrap_lineEdit_w, settings.yTrap_color[3]));
    BIND(IntBinding::bindTextbox(ui->zTrap_lineEdit_x, settings.zTrap_color[0]));
    BIND(IntBinding::bindTextbox(ui->zTrap_lineEdit_y, settings.zTrap_color[1]));
    BIND(IntBinding::bindTextbox(ui->zTrap_lineEdit_z, settings.zTrap_color[2]));
    BIND(IntBinding::bindTextbox(ui->zTrap_lineEdit_w, settings.zTrap_color[3]));
    BIND(IntBinding::bindTextbox(ui->oTrap_lineEdit_x, settings.oTrap_color[0]));
    BIND(IntBinding::bindTextbox(ui->oTrap_lineEdit_y, settings.oTrap_color[1]));
    BIND(IntBinding::bindTextbox(ui->oTrap_lineEdit_z, settings.oTrap_color[2]));
    BIND(IntBinding::bindTextbox(ui->oTrap_lineEdit_w, settings.oTrap_color[3]));
    BIND(FloatBinding::bindSliderAndTextbox(ui->orbit_mix_horizontalSlider, ui->orbit_mix_lineEdit, settings.orbitMix, 0.0, 1.0));

    BIND(FloatBinding::bindSliderAndTextbox(ui->power_horizontalSlider, ui->power_lineEdit, settings.power, 1.f, 28.f));

    BIND(IntBinding::bindSliderAndTextbox(ui->raymarch_steps_horizontalSlider, ui->raymarch_steps_lineEdit, settings.raymarchSteps, 500, 1229));
    BIND(IntBinding::bindSliderAndTextbox(ui->fractal_iterations_horizontalSlider, ui->fractal_iterations_lineEdit, settings.fractalIterations, 1, 40));
    BIND(FloatBinding::bindSliderAndTextbox(ui->step_factor_horizontalSlider, ui->step_factor_lineEdit, settings.stepFactor, 0, 1));
    BIND(FloatBinding::bindSliderAndTextbox(ui->bailout_horizontalSlider, ui->bailout_lineEdit, settings.bailout, 1.f, 8.f));

    BIND(ChoiceBinding::bindRadioButtons(fractalButtonGroup, 3, settings.fractalType, ui->mandelbulb, ui->julia_quaternion, ui->mandelbox));


    BIND(BoolBinding::bindCheckbox(ui->useFreeMode, settings.useFreeMode));
    BIND(BoolBinding::bindCheckbox(ui->animate, settings.animate));
}

