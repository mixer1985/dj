# Hydro Controller Starter (ESP32-S3)

Ja, ich habe dich verstanden ✅

Du willst auf deinem **ESP32-S3-Touch-LCD-7** zuerst ein lauffähiges Grundprogramm, das folgende Werte überwacht und Relais schaltet:

- Temperatur
- Wasserstand im Reservoir
- pH
- EC

Genau dafür ist dieses Starter-Projekt jetzt aufgebaut.

## Enthalten

- `dwc_controller.py`
  - zentrale Steuerlogik in `HydroController`
  - Regeln für Wasserstand, pH, EC und Temperatur
  - Sicherheits-Intervall zwischen Dosierungen
  - Mock-Sensoren und Mock-Relais zum lokalen Test ohne Hardware

## Steuerlogik (vereinfacht)

1. **Wasserstand zu niedrig** → `fill_water` Relais/Pumpe EIN (zeitgesteuert).
2. **pH zu niedrig** → `ph_plus` Relais/Pumpe EIN.
3. **pH zu hoch** → `ph_minus` Relais/Pumpe EIN.
4. **EC zu niedrig** → `nutrients` Relais/Pumpe EIN.
5. **Temperatur außerhalb Grenzbereich** → Temperatur-Relais EIN (Heizer/Kühler).

Alle Aktionen werden in kleinen Pulsen dosiert und durch ein Mindestintervall abgesichert.

## Schnellstart

```bash
python3 dwc_controller.py
```

## Nächster Schritt auf echter Hardware (ESP32)

Du ersetzt die Mock-Klassen durch echte Treiber:

- `MockSensors.read_*()` → echte Sensor-Library Calls (pH, EC, Temp, Level)
- `MockRelay.on/off()` → echte GPIO-Pin-Schaltung für deine Relais

Die Regel-Engine (`HydroController`) bleibt gleich.

## Sicherheit (wichtig)

- Mit kleinen Dosen starten und Sensoren kalibrieren.
- Pro Kanal Tages-Maximaldosis ergänzen.
- Bei Sensorfehlern: sichere Abschaltung (keine Dosierung).
- Erst mit Wasser-Only testen, dann Nährlösung/Chemie.
