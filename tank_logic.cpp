#include "tank_logic.h"

namespace {
TankLogic::SystemState g_state;

bool statusChanged(const TankLogic::TankState &oldS, const TankLogic::TankState &newS) {
  return oldS.status != newS.status || oldS.alarm != newS.alarm || oldS.sensorError != newS.sensorError;
}

TankLogic::TankState evaluateTank(const TankLogic::TankState &prev,
                                  bool lowWet,
                                  bool highWet,
                                  uint32_t now) {
  TankLogic::TankState next = prev;
  next.lowWet = lowWet;
  next.highWet = highWet;
  next.sensorError = false;

  // Unplausibel: HIGH kann nicht nass sein, wenn LOW trocken ist.
  if (!lowWet && highWet) {
    next.status = TankLogic::TankStatus::SENSOR_ERROR;
    next.sensorError = true;
    next.alarm = true;
    return next;
  }

  if (!lowWet) {
    // Sicherheitsanforderung: sofort Alarm, sobald LOW trocken.
    next.alarm = true;

    if (next.lowDrySinceMs == 0) {
      next.lowDrySinceMs = now;
    }

    if ((now - next.lowDrySinceMs) >= Config::kCriticalDelayMs) {
      next.status = TankLogic::TankStatus::CRITICAL;
    } else {
      next.status = TankLogic::TankStatus::LOW;
    }
    return next;
  }

  // LOW ist nass => Trockenzeit zurücksetzen
  next.lowDrySinceMs = 0;

  if (highWet) {
    next.status = TankLogic::TankStatus::FULL;
  } else {
    next.status = TankLogic::TankStatus::OK;
  }

  next.alarm = false;
  return next;
}

}  // namespace

namespace TankLogic {

void begin() {
  g_state = {};
  const uint32_t now = millis();
  for (uint8_t i = 0; i < Config::kNumTanks; ++i) {
    g_state.tanks[i].lastChangeMs = now;
  }
}

void update(const Sensors::SensorSnapshot &snapshot) {
  g_state.globalAlarm = false;
  g_state.updatedAtMs = snapshot.nowMs;

  for (uint8_t i = 0; i < Config::kNumTanks; ++i) {
    const TankState prev = g_state.tanks[i];

    TankState next = evaluateTank(prev, snapshot.tankLow[i], snapshot.tankHigh[i], snapshot.nowMs);

    if (statusChanged(prev, next)) {
      next.lastChangeMs = snapshot.nowMs;
    }

    g_state.tanks[i] = next;

    if (next.alarm || next.sensorError) {
      g_state.globalAlarm = true;
    }
  }

  // Placeholder sensor inputs for future pH/EC integration
  // g_state.phValue = readPhSensor();
  // g_state.ecValue = readEcSensor();
}

const SystemState &state() {
  return g_state;
}

const char *statusToString(TankStatus status) {
  switch (status) {
    case TankStatus::FULL:
      return "Voll";
    case TankStatus::OK:
      return "OK";
    case TankStatus::LOW:
      return "Niedrig";
    case TankStatus::CRITICAL:
      return "Kritisch";
    case TankStatus::SENSOR_ERROR:
      return "Sensorfehler";
    default:
      return "Unbekannt";
  }
}

}  // namespace TankLogic
