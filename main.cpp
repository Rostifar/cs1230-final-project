#include <QApplication>
#include <QStyle>
#include <QDesktopWidget>
#include "mainwindow.h"

int main(int argc, char *argv[])
{
    QApplication app(argc, argv);
    MainWindow w;
    bool startFullscreen = false;

    w.show();

    if (startFullscreen) {
        // We cannot use w.showFullscreen() here because on Linux that creates the
        // window behind all other windows, so we have to set it to fullscreen after
        // it has been shown.
        w.setWindowState(w.windowState() | Qt::WindowFullScreen);
    }
    w.resize(1200, 800);
    w.setGeometry(QStyle::alignedRect(
                      Qt::LeftToRight,
                      Qt::AlignCenter,
                      w.size(),
                      qApp->desktop()->availableGeometry()
                  ));

    return app.exec();
}
