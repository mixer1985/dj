#pragma once

#include <Arduino.h>
#include "tank_logic.h"

namespace DisplayUI {

void begin();
void update(const TankLogic::SystemState &state,
            bool wifiConnected,
            const String &ip,
            const String &warningLine);

}  // namespace DisplayUI
