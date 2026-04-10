#pragma once

#include <Arduino.h>

namespace WebUI {

void begin();
void update();
void setWifiStatus(bool connected, const String &ipAddress);

}  // namespace WebUI
