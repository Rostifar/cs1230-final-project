#include "Settings.h"
#include <QSettings>

Settings settings;

void Settings::loadSettingsOrDefaults() {
    this->ka_value = 0.1;
    this->kd_value = 1.f;
    this->ks_value = 1.f;

    this->ambient_color[0] = 77, this->ambient_color[1] = 230, this->ambient_color[2] = 128;
    this->base_color[0] = 255, this->base_color[1] = 255, this->base_color[2] = 255;
    this->xTrap_color[0] = 52, this->xTrap_color[1] = 52, this->xTrap_color[2] = 52, xTrap_color[3] = 0;
    this->yTrap_color[0] = 0, this->yTrap_color[1] = 255, this->yTrap_color[2] = 0, yTrap_color[3] = 255;
    this->zTrap_color[0] = 77, this->zTrap_color[1] = 230, this->zTrap_color[2] = 0, yTrap_color[3] = 255;
    this->oTrap_color[0] = 0, this->oTrap_color[1] = 26, this->oTrap_color[2] = 154, oTrap_color[3] = 255;
    this->orbitMix = 1.f;
    this->useLight1 = true;
    this->useLight2 = true;

    this->useFreeMode = true;
}
