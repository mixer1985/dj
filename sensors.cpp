#include "sensors.h"

namespace {
using namespace Sensors;

DebouncedInput g_tankLow[Config::kNumTanks];
DebouncedInput g_tankHigh[Config::kNumTanks];
DebouncedInput g_reserve[2];

bool readLogical(const DebouncedInput &in) {
  int raw = digitalRead(in.pin);
  if (in.activeLow) {
    return raw == LOW;
  }
  return raw == HIGH;
}

void setupInput(DebouncedInput &in, uint8_t pin, bool activeLow) {
  in.pin = pin;
  in.activeLow = activeLow;
  pinMode(pin, INPUT_PULLUP);
  const bool state = readLogical(in);
  in.stableState = state;
  in.lastRaw = state;
  in.lastEdgeMs = millis();
  in.lastChangeMs = millis();
}

void updateInput(DebouncedInput &in, uint32_t now) {
  const bool raw = readLogical(in);

  if (raw != in.lastRaw) {
    in.lastRaw = raw;
    in.lastEdgeMs = now;
  }

  if (raw != in.stableState && (now - in.lastEdgeMs) >= Config::kDebounceMs) {
    in.stableState = raw;
    in.lastChangeMs = now;
  }
}

}  // namespace

namespace Sensors {

void begin() {
  for (uint8_t i = 0; i < Config::kNumTanks; ++i) {
    setupInput(g_tankLow[i], Config::kTankPins[i].low, Config::kFloatSwitchActiveLow);
    setupInput(g_tankHigh[i], Config::kTankPins[i].high, Config::kFloatSwitchActiveLow);
  }

  for (uint8_t i = 0; i < 2; ++i) {
    setupInput(g_reserve[i], Config::kReserveSwitchPins[i], Config::kFloatSwitchActiveLow);
  }
}

void update() {
  const uint32_t now = millis();

  for (uint8_t i = 0; i < Config::kNumTanks; ++i) {
    updateInput(g_tankLow[i], now);
    updateInput(g_tankHigh[i], now);
  }

  for (uint8_t i = 0; i < 2; ++i) {
    updateInput(g_reserve[i], now);
  }
}

SensorSnapshot snapshot() {
  SensorSnapshot s{};
  s.nowMs = millis();

  for (uint8_t i = 0; i < Config::kNumTanks; ++i) {
    s.tankLow[i] = g_tankLow[i].stableState;
    s.tankHigh[i] = g_tankHigh[i].stableState;
  }

  for (uint8_t i = 0; i < 2; ++i) {
    s.reserve[i] = g_reserve[i].stableState;
  }

  return s;
}

}  // namespace Sensors
