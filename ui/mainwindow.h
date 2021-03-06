#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <memory>
#include <QMainWindow>
#include <QButtonGroup>

class View;

namespace Ui {
    class MainWindow;
}

class DataBinding;

/**
 * @class MainWindow
 *
 * The main graphical user interface class (GUI class) for our application.
 */
class MainWindow : public QMainWindow {
    Q_OBJECT
public:
    MainWindow(QWidget *parent = 0);
    ~MainWindow();

private:
    // Auto-generated by Qt. DO NOT RENAME!
    Ui::MainWindow *ui;

    void databind();

    // [C++ Note] private members start with m_
    QList<DataBinding*> m_bindings;
    QList<QButtonGroup*> m_buttonGroups;
};

#endif // MAINWINDOW_H
