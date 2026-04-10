#include "web_ui.h"

#include <ArduinoJson.h>
#include <WebServer.h>

#include "config.h"
#include "tank_logic.h"

namespace {
WebServer g_server(80);
bool g_wifiConnected = false;
String g_ip = "0.0.0.0";

String fmtUptime(uint32_t ms) {
  const uint32_t sec = ms / 1000;
  const uint32_t h = sec / 3600;
  const uint32_t m = (sec % 3600) / 60;
  const uint32_t s = sec % 60;
  char buf[20];
  snprintf(buf, sizeof(buf), "%02lu:%02lu:%02lu", h, m, s);
  return String(buf);
}

void sendJsonStatus() {
  const auto &st = TankLogic::state();

  StaticJsonDocument<1024> doc;
  doc["project"] = Config::kProjectName;
  doc["version"] = Config::kFirmwareVersion;
  doc["uptime_ms"] = millis();
  doc["uptime_hms"] = fmtUptime(millis());
  doc["wifi_connected"] = g_wifiConnected;
  doc["ip"] = g_ip;
  doc["global_alarm"] = st.globalAlarm;
  doc["updated_at_ms"] = st.updatedAtMs;

  JsonArray tanks = doc.createNestedArray("tanks");
  for (uint8_t i = 0; i < Config::kNumTanks; ++i) {
    JsonObject t = tanks.createNestedObject();
    t["id"] = i + 1;
    t["status"] = TankLogic::statusToString(st.tanks[i].status);
    t["alarm"] = st.tanks[i].alarm;
    t["sensor_error"] = st.tanks[i].sensorError;
    t["low_wet"] = st.tanks[i].lowWet;
    t["high_wet"] = st.tanks[i].highWet;
    t["last_change_ms"] = st.tanks[i].lastChangeMs;
  }

  String out;
  serializeJson(doc, out);
  g_server.send(200, "application/json", out);
}

void sendJsonTanks() {
  StaticJsonDocument<1024> doc;
  const auto &st = TankLogic::state();

  JsonArray tanks = doc.createNestedArray("tanks");
  for (uint8_t i = 0; i < Config::kNumTanks; ++i) {
    JsonObject t = tanks.createNestedObject();
    t["id"] = i + 1;
    t["status"] = TankLogic::statusToString(st.tanks[i].status);
    t["last_change_ms"] = st.tanks[i].lastChangeMs;
    t["alarm"] = st.tanks[i].alarm;
  }

  String out;
  serializeJson(doc, out);
  g_server.send(200, "application/json", out);
}

void sendJsonConfig() {
  StaticJsonDocument<512> doc;
  doc["project"] = Config::kProjectName;
  doc["version"] = Config::kFirmwareVersion;
  doc["num_tanks"] = Config::kNumTanks;
  doc["float_switches"] = Config::kNumFloatSwitches;
  doc["debounce_ms"] = Config::kDebounceMs;
  doc["critical_delay_ms"] = Config::kCriticalDelayMs;
  doc["relays_enabled"] = Config::kRelaysEnabled;
  doc["ph_dosing_enabled"] = Config::kPhDosingEnabled;

  String out;
  serializeJson(doc, out);
  g_server.send(200, "application/json", out);
}

void sendIndex() {
  String html = R"HTML(
<!doctype html><html lang="de"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>DWC Dashboard</title>
<style>
:root{--bg:#0f172a;--card:#1e293b;--ok:#22c55e;--warn:#f59e0b;--crit:#ef4444;--text:#e2e8f0}
body{font-family:system-ui;background:var(--bg);color:var(--text);margin:0;padding:16px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.card{background:var(--card);padding:12px;border-radius:12px;box-shadow:0 6px 18px #0004}
.badge{padding:2px 8px;border-radius:999px;font-size:12px}
.ok{background:#14532d}.warn{background:#78350f}.crit{background:#7f1d1d}
.small{font-size:12px;opacity:.85}
</style></head><body>
<h2>DWC Tankübersicht</h2>
<div id="meta" class="card small">Lade Status ...</div>
<div id="grid" class="grid"></div>
<script>
function clsFor(s){if(s==='Voll'||s==='OK')return 'ok';if(s==='Niedrig')return 'warn';return 'crit';}
async function load(){
  const r=await fetch('/api/status'); const d=await r.json();
  document.getElementById('meta').innerHTML =
    `WiFi: ${d.wifi_connected?'online':'offline'} | IP: ${d.ip} | Alarm: ${d.global_alarm?'JA':'nein'} | Uptime: ${d.uptime_hms}`;
  const grid=document.getElementById('grid'); grid.innerHTML='';
  d.tanks.forEach(t=>{
    const c=document.createElement('div'); c.className='card';
    c.innerHTML=`<h3>Tank ${t.id}</h3>
      <div class="badge ${clsFor(t.status)}">${t.status}</div>
      <p>Alarm: <b>${t.alarm?'JA':'nein'}</b></p>
      <p>LOW: ${t.low_wet?'nass':'trocken'} | HIGH: ${t.high_wet?'nass':'trocken'}</p>
      <p class="small">Letzte Änderung: ${t.last_change_ms} ms</p>`;
    grid.appendChild(c);
  });
}
setInterval(load,1500); load();
</script></body></html>)HTML";

  g_server.send(200, "text/html", html);
}

}  // namespace

namespace WebUI {

void begin() {
  g_server.on("/", HTTP_GET, sendIndex);
  g_server.on("/api/status", HTTP_GET, sendJsonStatus);
  g_server.on("/api/tanks", HTTP_GET, sendJsonTanks);
  g_server.on("/api/config", HTTP_GET, sendJsonConfig);

  g_server.begin();
  Serial.println("[WEB] Server gestartet auf Port 80");
}

void update() {
  g_server.handleClient();
}

void setWifiStatus(bool connected, const String &ipAddress) {
  g_wifiConnected = connected;
  g_ip = ipAddress;
}

}  // namespace WebUI
