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

    BIND(FloatBinding::bindSliderAndTextbox(ui->ka_horizontalSlider, ui->ka_lineEdit, settings.ka_value, 0.0, 1.0));
}

// assert(connect(_b, SIGNAL(dataChanged()), this, SLOT(settingsChanged()))); \
