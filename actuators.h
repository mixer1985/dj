#pragma once

#include <Arduino.h>
#include "config.h"
#include "tank_logic.h"

namespace Actuators {

void begin();
void update(const TankLogic::SystemState &state);
void forceAllSafeOff();

}  // namespace Actuators
