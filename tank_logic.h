#pragma once

#include <Arduino.h>
#include "config.h"
#include "sensors.h"

namespace TankLogic {

enum class TankStatus : uint8_t {
  FULL,
  OK,
  LOW,
  CRITICAL,
  SENSOR_ERROR,
};

struct TankState {
  TankStatus status = TankStatus::SENSOR_ERROR;
  bool alarm = false;
  bool sensorError = false;
  bool lowWet = false;
  bool highWet = false;
  uint32_t lastChangeMs = 0;
  uint32_t lowDrySinceMs = 0;
};

struct SystemState {
  TankState tanks[Config::kNumTanks];
  bool globalAlarm = false;
  uint32_t updatedAtMs = 0;
  float phValue = NAN;  // placeholder
  float ecValue = NAN;  // placeholder
};

void begin();
void update(const Sensors::SensorSnapshot &snapshot);
const SystemState &state();
const char *statusToString(TankStatus status);

}  // namespace TankLogic
