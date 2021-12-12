#include "Settings.h"
#include <QSettings>

Settings settings;

void Settings::loadSettingsOrDefaults() {
    this->ka_value = 0.1;
    this->kd_value = 1.f;
    this->ks_value = 1.f;
    this->kr_value = 1.f;
}
