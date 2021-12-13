#include "Settings.h"
#include <QSettings>

Settings settings;

void Settings::loadSettingsOrDefaults() {
    this->ka_value = 0.1;
    this->kd_value = 1.f;
    this->ks_value = 1.f;
    this->kr_value = 1.f;

    this->ambient_color_values[0] = 77, this->ambient_color_values[1] = 230, this->ambient_color_values[2] = 128;
}
