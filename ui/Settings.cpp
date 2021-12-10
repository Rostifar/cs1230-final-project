#include "Settings.h"
#include <QSettings>

Settings settings;

void Settings::loadSettingsOrDefaults() {
    this->ka_value = 0.5;
}
