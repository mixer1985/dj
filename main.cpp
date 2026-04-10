#include <Arduino.h>
#include <WiFi.h>
#include <esp_task_wdt.h>

#include "actuators.h"
#include "config.h"
#include "display_ui.h"
#include "sensors.h"
#include "tank_logic.h"
#include "web_ui.h"

namespace {

uint32_t g_lastUiMs = 0;
uint32_t g_lastSerialMs = 0;
uint32_t g_lastWifiAttemptMs = 0;

String currentIp() {
  if (WiFi.status() == WL_CONNECTED) {
    return WiFi.localIP().toString();
  }
  return "0.0.0.0";
}

void connectWifiIfNeeded() {
  const uint32_t now = millis();

  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  if (now - g_lastWifiAttemptMs < Config::kWifiRetryIntervalMs) {
    return;
  }

  g_lastWifiAttemptMs = now;
  Serial.printf("[WIFI] Verbinde mit %s ...\n", Config::kWifiSsid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(Config::kWifiSsid, Config::kWifiPassword);

  const uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - start) < Config::kWifiConnectTimeoutMs) {
    delay(200);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WIFI] Verbunden, IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("[WIFI] Verbindung fehlgeschlagen, späterer Retry.");
  }
}

String makeWarningLine(const TankLogic::SystemState &st) {
  if (!st.globalAlarm) {
    return "";
  }

  for (uint8_t i = 0; i < Config::kNumTanks; ++i) {
    if (st.tanks[i].sensorError) {
      return "WARN: Sensorfehler T" + String(i + 1);
    }
    if (st.tanks[i].alarm) {
      return "WARN: Niedrig/Kritisch T" + String(i + 1);
    }
  }
  return "WARN: Alarm aktiv";
}

void printDebug(const TankLogic::SystemState &st) {
  Serial.println("----- DWC STATUS -----");
  Serial.printf("WiFi: %s | IP: %s\n",
                WiFi.status() == WL_CONNECTED ? "online" : "offline",
                currentIp().c_str());

  for (uint8_t i = 0; i < Config::kNumTanks; ++i) {
    Serial.printf("Tank %u => %s | LOW:%s HIGH:%s | Alarm:%s\n",
                  i + 1,
                  TankLogic::statusToString(st.tanks[i].status),
                  st.tanks[i].lowWet ? "nass" : "trocken",
                  st.tanks[i].highWet ? "nass" : "trocken",
                  st.tanks[i].alarm ? "JA" : "nein");
  }

  Serial.printf("Globaler Alarm: %s\n", st.globalAlarm ? "JA" : "nein");
}

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.printf("\n[%s] Booting v%s\n", Config::kProjectName, Config::kFirmwareVersion);

  esp_task_wdt_init(8, true);
  esp_task_wdt_add(nullptr);

  Sensors::begin();
  TankLogic::begin();
  Actuators::begin();
  DisplayUI::begin();

  connectWifiIfNeeded();
  WebUI::setWifiStatus(WiFi.status() == WL_CONNECTED, currentIp());
  WebUI::begin();
}

void loop() {
  esp_task_wdt_reset();

  connectWifiIfNeeded();

  Sensors::update();
  const auto snap = Sensors::snapshot();
  TankLogic::update(snap);

  const auto &st = TankLogic::state();
  Actuators::update(st);

  WebUI::setWifiStatus(WiFi.status() == WL_CONNECTED, currentIp());
  WebUI::update();

  const uint32_t now = millis();
  if (now - g_lastUiMs >= Config::kUiRefreshMs) {
    g_lastUiMs = now;
    DisplayUI::update(st,
                      WiFi.status() == WL_CONNECTED,
                      currentIp(),
                      makeWarningLine(st));
  }

  if (now - g_lastSerialMs >= Config::kSerialReportMs) {
    g_lastSerialMs = now;
    printDebug(st);
  }

  delay(20);
}
