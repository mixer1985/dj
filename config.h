#pragma once

#include <Arduino.h>

namespace Config {

// ===== Build / Version =====
static constexpr const char *kProjectName = "DWC Controller";
static constexpr const char *kFirmwareVersion = "0.1.0";

// ===== WiFi =====
static constexpr const char *kWifiSsid = "DEIN_WLAN_NAME";
static constexpr const char *kWifiPassword = "DEIN_WLAN_PASSWORT";
static constexpr uint32_t kWifiConnectTimeoutMs = 15000;
static constexpr uint32_t kWifiRetryIntervalMs = 10000;

// ===== I/O General =====
static constexpr uint8_t kNumTanks = 3;
static constexpr uint8_t kNumFloatSwitches = 8;

// Float switch wiring assumption:
// - PinMode INPUT_PULLUP
// - Float switch closes to GND when "WET" (water present)
// - Therefore raw LOW => active
static constexpr bool kFloatSwitchActiveLow = true;

// Debounce and plausibility timing
static constexpr uint32_t kDebounceMs = 50;
static constexpr uint32_t kCriticalDelayMs = 30000;  // LOW dry for this long => CRITICAL
static constexpr uint32_t kSensorStaleMs = 600000;   // Reserved for future sensor health checks

// ===== Tank float switch mapping =====
struct TankPins {
  uint8_t low;
  uint8_t high;
};

// Example GPIO assignment (adapt as needed)
static constexpr TankPins kTankPins[kNumTanks] = {
    {4, 16},   // Tank 1: LOW, HIGH
    {17, 5},   // Tank 2: LOW, HIGH
    {18, 19},  // Tank 3: LOW, HIGH
};

// Reserve float switches
static constexpr uint8_t kReserveSwitchPins[2] = {32, 33};

// ===== Display (SSD1306 I2C 128x64) =====
static constexpr bool kDisplayEnabled = true;
static constexpr uint8_t kDisplayWidth = 128;
static constexpr uint8_t kDisplayHeight = 64;
static constexpr int8_t kDisplayResetPin = -1;
static constexpr uint8_t kDisplayI2cAddress = 0x3C;

// ===== Optional relay outputs =====
static constexpr bool kRelaysEnabled = false;
static constexpr uint8_t kRelayPins[kNumTanks] = {25, 26, 27};
static constexpr bool kRelayActiveHigh = true;

// ===== Optional dosing pump (pH minus) =====
static constexpr bool kPhDosingEnabled = false;    // default OFF for safety
static constexpr uint8_t kPhDosingPumpPin = 14;    // optional
static constexpr uint32_t kPhDosePulseMs = 1000;   // future use

// ===== Placeholder analog inputs =====
static constexpr int kPhSensorPin = 34;
static constexpr int kEcSensorPin = 35;

// ===== Scheduler =====
static constexpr uint32_t kUiRefreshMs = 1000;
static constexpr uint32_t kSerialReportMs = 2000;

}  // namespace Config
