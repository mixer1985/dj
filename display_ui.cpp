#include "display_ui.h"

#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Wire.h>

#include "config.h"

namespace {
Adafruit_SSD1306 g_display(Config::kDisplayWidth,
                           Config::kDisplayHeight,
                           &Wire,
                           Config::kDisplayResetPin);
bool g_ready = false;

String wifiLine(bool connected, const String &ip) {
  if (!connected) {
    return "WiFi: offline";
  }
  return "WiFi: " + ip;
}

}  // namespace

namespace DisplayUI {

void begin() {
  if (!Config::kDisplayEnabled) {
    return;
  }

  if (!g_display.begin(SSD1306_SWITCHCAPVCC, Config::kDisplayI2cAddress)) {
    Serial.println("[DISPLAY] SSD1306 init fehlgeschlagen");
    g_ready = false;
    return;
  }

  g_ready = true;
  g_display.clearDisplay();
  g_display.setTextColor(SSD1306_WHITE);
  g_display.setTextSize(1);
  g_display.setCursor(0, 0);
  g_display.println(Config::kProjectName);
  g_display.println("Display bereit.");
  g_display.display();
}

void update(const TankLogic::SystemState &state,
            bool wifiConnected,
            const String &ip,
            const String &warningLine) {
  if (!Config::kDisplayEnabled || !g_ready) {
    return;
  }

  g_display.clearDisplay();
  g_display.setTextSize(1);
  g_display.setCursor(0, 0);
  g_display.println(Config::kProjectName);
  g_display.println(wifiLine(wifiConnected, ip));

  for (uint8_t i = 0; i < Config::kNumTanks; ++i) {
    g_display.print("T");
    g_display.print(i + 1);
    g_display.print(": ");
    g_display.println(TankLogic::statusToString(state.tanks[i].status));
  }

  if (!warningLine.isEmpty()) {
    g_display.println(warningLine);
  }

  g_display.display();
}

}  // namespace DisplayUI
