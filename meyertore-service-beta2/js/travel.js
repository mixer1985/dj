(function () {
  "use strict";

  const EARTH_RADIUS_KM = 6371.0088;

  function point(value) {
    const lat = Number(value?.lat);
    const lon = Number(value?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error("Ungültige Koordinaten");
    return { lat, lon };
  }

  function haversineKm(from, to) {
    const start = point(from);
    const end = point(to);
    const radians = (degrees) => degrees * Math.PI / 180;
    const lat1 = radians(start.lat);
    const lat2 = radians(end.lat);
    const deltaLat = radians(end.lat - start.lat);
    const deltaLon = radians(end.lon - start.lon);
    const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
    return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function durationMinutes(start, end = Date.now()) {
    const from = new Date(start).getTime();
    const to = new Date(end).getTime();
    if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
    return Math.max(0, Math.round((to - from) / 60000));
  }

  function personHours(minutes, crewSize = 1) {
    const value = Math.max(0, Number(minutes) || 0) / 60 * Math.max(1, Number(crewSize) || 1);
    return Math.round(value * 100) / 100;
  }

  function formatDuration(minutes) {
    const total = Math.max(0, Math.round(Number(minutes) || 0));
    if (total < 1) return "unter 1 Min.";
    const hours = Math.floor(total / 60);
    const rest = total % 60;
    if (!hours) return `${rest} Min.`;
    return `${hours} Std.${rest ? ` ${rest} Min.` : ""}`;
  }

  async function roadDistanceKm(from, to, options = {}) {
    const start = point(from);
    const end = point(to);
    const fetchFn = options.fetchFn || globalThis.fetch;
    if (typeof fetchFn !== "function") throw new Error("Kein Routendienst verfügbar");
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeout = setTimeout(() => controller?.abort(), options.timeout || 12000);
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=false&steps=false`;
    try {
      const response = await fetchFn(url, controller ? { signal: controller.signal } : undefined);
      if (!response.ok) throw new Error(`Routendienst antwortet mit ${response.status}`);
      const data = await response.json();
      const meters = Number(data?.routes?.[0]?.distance);
      if (!Number.isFinite(meters)) throw new Error("Keine Straßenroute gefunden");
      return Math.round(meters / 100) / 10;
    } finally {
      clearTimeout(timeout);
    }
  }

  window.MEYER_TRAVEL = Object.freeze({
    durationMinutes,
    formatDuration,
    haversineKm,
    personHours,
    roadDistanceKm
  });
})();
