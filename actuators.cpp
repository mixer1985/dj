#include "actuators.h"

namespace {

void writeRelay(uint8_t pin, bool on) {
  const bool level = Config::kRelayActiveHigh ? on : !on;
  digitalWrite(pin, level ? HIGH : LOW);
}

}  // namespace

namespace Actuators {

void forceAllSafeOff() {
  if (Config::kRelaysEnabled) {
    for (uint8_t i = 0; i < Config::kNumTanks; ++i) {
      writeRelay(Config::kRelayPins[i], false);
    }
  }

  if (Config::kPhDosingEnabled) {
    digitalWrite(Config::kPhDosingPumpPin, LOW);
  }
}

void begin() {
  if (Config::kRelaysEnabled) {
    for (uint8_t i = 0; i < Config::kNumTanks; ++i) {
      pinMode(Config::kRelayPins[i], OUTPUT);
    }
  }

  if (Config::kPhDosingEnabled) {
    pinMode(Config::kPhDosingPumpPin, OUTPUT);
  }

  // Fail-safe default: alles AUS
  forceAllSafeOff();
}

void update(const TankLogic::SystemState &state) {
  // Automatische Pumpensteuerung ist absichtlich standardmäßig deaktiviert.
  // Bei Alarm/Sensorfehler niemals automatisch schalten.
  (void)state;

  if (state.globalAlarm) {
    forceAllSafeOff();
    return;
  }

  // Placeholder für spätere, freigegebene Logik:
  // if (Config::kRelaysEnabled && safeToPump) { ... }
}

}  // namespace Actuators
