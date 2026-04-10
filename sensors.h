#pragma once

#include <Arduino.h>
#include "config.h"

namespace Sensors {

struct DebouncedInput {
  uint8_t pin = 0;
  bool activeLow = true;
  bool stableState = false;       // logical state: true = switch active
  bool lastRaw = false;
  uint32_t lastEdgeMs = 0;
  uint32_t lastChangeMs = 0;
};

struct SensorSnapshot {
  bool tankLow[Config::kNumTanks];
  bool tankHigh[Config::kNumTanks];
  bool reserve[2];
  uint32_t nowMs;
};

void begin();
void update();
SensorSnapshot snapshot();

}  // namespace Sensors
