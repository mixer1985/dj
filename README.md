# DWC-Überwachungs- und Automationssteuerung (ESP32)

Vollständiges, modulares ESP32-Projekt für **Arduino-IDE** oder **PlatformIO** zur Überwachung von 3 DWC-Tanks mit 8 Schwimmschaltern, lokaler Anzeige und Web-UI.

## 1) Projektüberblick

### Kernfunktionen
- Erfassung von Wasserständen je Tank (LOW/HIGH).
- Zustandsauswertung pro Tank:
  - **Voll**
  - **OK**
  - **Niedrig**
  - **Kritisch**
  - **Sensorfehler**
- Lokale Anzeige (SSD1306 OLED):
  - Tankstatus
  - WLAN-Status
  - IP-Adresse
  - Warnungen
- Weboberfläche (mobil-optimiert):
  - Übersicht aller 3 Tanks
  - Live-Status
  - Alarmstatus
  - Zeitstempel (ms seit Boot) letzter Änderung
- JSON-API:
  - `/api/status`
  - `/api/tanks`
  - `/api/config`
- Serielle Debug-Ausgabe
- Fail-safe Aktorlogik (standardmäßig AUS)
- Watchdog-Reset im Hauptloop

---

## 2) Dateistruktur

- `main.cpp`
- `config.h`
- `tank_logic.h` / `tank_logic.cpp`
- `web_ui.h` / `web_ui.cpp`
- `display_ui.h` / `display_ui.cpp`
- `sensors.h` / `sensors.cpp`
- `actuators.h` / `actuators.cpp`
- `README.md`

---

## 3) Verdrahtungsübersicht (Beispiel)

> Annahme: Schwimmschalter werden gegen **GND** geschaltet, Eingänge laufen mit `INPUT_PULLUP`.
> Dadurch gilt: **geschlossen = nass/aktiv**.

| Funktion | GPIO | Typ | Hinweis |
|---|---:|---|---|
| Tank 1 LOW | GPIO4 | Eingang | Schwimmschalter gegen GND |
| Tank 1 HIGH | GPIO16 | Eingang | Schwimmschalter gegen GND |
| Tank 2 LOW | GPIO17 | Eingang | Schwimmschalter gegen GND |
| Tank 2 HIGH | GPIO5 | Eingang | Schwimmschalter gegen GND |
| Tank 3 LOW | GPIO18 | Eingang | Schwimmschalter gegen GND |
| Tank 3 HIGH | GPIO19 | Eingang | Schwimmschalter gegen GND |
| Reserve 1 | GPIO32 | Eingang | Reserve-Schwimmschalter |
| Reserve 2 | GPIO33 | Eingang | Reserve-Schwimmschalter |
| OLED SDA | GPIO21* | I2C | Bei Bedarf auf andere Pins legen |
| OLED SCL | GPIO22* | I2C | Bei Bedarf auf andere Pins legen |
| Relais Tank 1 (optional) | GPIO25 | Ausgang | Standard: AUS |
| Relais Tank 2 (optional) | GPIO26 | Ausgang | Standard: AUS |
| Relais Tank 3 (optional) | GPIO27 | Ausgang | Standard: AUS |
| pH-Dosierpumpe (optional) | GPIO14 | Ausgang | Standard: AUS |
| pH-Sensor (Platzhalter) | GPIO34 | Analog In | später |
| EC-Sensor (Platzhalter) | GPIO35 | Analog In | später |

Hinweis: I2C (GPIO21/22) ist getrennt von den Reserve-Sensoren (GPIO32/33).

---

## 4) Sicherheits- und Fail-safe-Logik

- Wenn **LOW trocken** meldet: Alarm wird sofort gesetzt.
- Wenn **LOW trocken + HIGH nass**: unplausibel ⇒ **Sensorfehler**.
- Bei Alarm/Sensorfehler: **keine automatische Pumpensteuerung**.
- Aktoren starten stets im sicheren Zustand (**AUS**).
- Watchdog (`esp_task_wdt`) ist aktiv, Loop füttert regelmäßig.

### Statusregeln je Tank
- `LOW=wet`, `HIGH=wet` → **Voll**
- `LOW=wet`, `HIGH=dry` → **OK**
- `LOW=dry`, `HIGH=dry` → erst **Niedrig**, nach `kCriticalDelayMs` → **Kritisch**
- `LOW=dry`, `HIGH=wet` → **Sensorfehler**

---

## 5) Benötigte Bibliotheken

### In Arduino-IDE installieren
1. **Adafruit SSD1306**
2. **Adafruit GFX Library**
3. **ArduinoJson**

### Bereits über ESP32-Core vorhanden
- `WiFi.h`
- `WebServer.h`
- `Wire.h`
- `esp_task_wdt.h`

---

## 6) Einrichtung (Arduino-IDE)

1. ESP32 Boardpaket installieren (Espressif).
2. Projektdateien in ein Arduino-Projektverzeichnis legen.
3. In `config.h` anpassen:
   - WLAN SSID/Passwort
   - GPIO-Pins
   - Relais/Dosierung aktivieren/deaktivieren
4. Bibliotheken installieren (siehe oben).
5. ESP32 auswählen und hochladen.
6. Seriellen Monitor auf 115200 Baud öffnen.
7. Nach WLAN-Verbindung IP im Monitor oder auf Display ablesen.
8. Im Browser öffnen: `http://<IP-ADRESSE>/`

---

## 7) Einrichtung (PlatformIO)

Beispiel `platformio.ini`:

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200
lib_deps =
  bblanchon/ArduinoJson
  adafruit/Adafruit GFX Library
  adafruit/Adafruit SSD1306
```

Dateien unter `src/` und `include/` strukturieren (oder so belassen und Build-Umgebung entsprechend konfigurieren).

---

## 8) JSON-API Kurzbeschreibung

### `GET /api/status`
Liefert Gesamtstatus inkl. WLAN, Alarm und Tankdetails.

### `GET /api/tanks`
Liefert kompakte Tankliste mit Status/Alarm/Änderungszeit.

### `GET /api/config`
Liefert wichtige Laufzeitkonfigurationswerte (read-only).

---

## 9) Beispiel-GPIO-Belegung (empfohlen)

- Tank-Sensoren: 4, 16, 17, 5, 18, 19
- Reserve-Sensoren: 32, 33
- I2C OLED: SDA 21, SCL 22
- Relais: 25, 26, 27
- pH-Dosierpumpe: 14
- pH/EC Analog: 34/35

> Passe dafür `config.h` entsprechend an, besonders wenn OLED aktiv genutzt wird.

---

## 10) To-do für spätere pH-Dosierung

- [ ] pH-Sensor kalibrieren (2-/3-Punkt-Kalibrierung).
- [ ] Temperaturkompensation für pH/EC ergänzen.
- [ ] Sicherheitsfenster für Dosierung definieren (max. Laufzeit / Stunde).
- [ ] Anti-Overshoot-Strategie (kleine Pulse + Mischzeit + Re-Measurement).
- [ ] Dosierfreigabe nur bei stabilem Wasserstand (kein Alarm/Sensorfehler).
- [ ] Hardware-Interlock (Relais + Watchdog + Not-Aus).
- [ ] Ereignislogging (NVS/Datei/MQTT).
- [ ] Optional Cloud-/Home-Assistant-Integration.

---

## 11) Hinweise zur Anpassung

- Alle zentralen Parameter befinden sich in `config.h`.
- Auto-Dosierlogik ist vorbereitet, aber standardmäßig deaktiviert.
- Reserve-Schwimmschalter sind als Erweiterung vorgesehen (z. B. Leckage-/Sammelbehälter-Alarm).
