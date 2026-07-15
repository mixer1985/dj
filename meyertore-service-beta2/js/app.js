(function () {
  "use strict";

  const catalog = window.MEYER_CATALOG;
  const checklistLibrary = window.MEYER_CHECKLISTS;
  const JOBS_KEY = "meyer-tore-beta2-jobs";
  const CURRENT_KEY = "meyer-tore-beta2-current";
  const MAX_PHOTOS = 12;
  const TOTAL_STEPS = 9;

  let jobs = loadJobs();
  let currentStep = 1;
  let saveTimer = null;
  let toastTimer = null;
  let installPrompt = null;
  let job = loadInitialJob();
  const signatureCanvases = {};

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `mt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function localDate(date = new Date()) {
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
  }

  function makeOrderNumber() {
    const now = new Date();
    const date = localDate(now).replaceAll("-", "").slice(2);
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    return `MT-${date}-${hh}${mm}`;
  }

  function newJob() {
    const now = new Date().toISOString();
    return {
      schema: "meyer-tore-job",
      schemaVersion: 2,
      id: uid(),
      status: "draft",
      createdAt: now,
      updatedAt: now,
      completedAt: "",
      lastStep: 1,
      order: {
        number: makeOrderNumber(), date: localDate(), technician: "", type: "", appointment: "",
        priority: "Normal", reference: "", contract: "", description: ""
      },
      customer: { company: "", contact: "", number: "", street: "", zip: "", city: "", phone: "", email: "" },
      site: { sameAsCustomer: false, name: "", street: "", zip: "", city: "", assetNumber: "", position: "", access: "", usage: "", notes: "" },
      asset: {
        manufacturer: "Hörmann", category: "", model: "", customModel: "", year: "", serial: "", width: "", height: "",
        track: "", leaf: "", wicketDoor: false, manual: false, externalDoor: false
      },
      drive: { model: "", customModel: "", control: "", customControl: "", voltage: "", mode: "", serial: "", radio: "", safety: [] },
      work: { activities: [], description: "", checklist: {}, measurements: "", parts: "", defects: "", recommendation: "", hours: "" },
      evidence: { gps: null, photos: [] },
      signatures: { technician: "", customer: "" },
      report: { customerSigner: "", result: "", nextInspection: "", note: "" }
    };
  }

  function mergeDefaults(target, defaults) {
    if (!target || typeof target !== "object" || Array.isArray(target)) return structuredClone(defaults);
    const result = structuredClone(target);
    Object.keys(defaults).forEach((key) => {
      if (!(key in result)) result[key] = structuredClone(defaults[key]);
      else if (defaults[key] && typeof defaults[key] === "object" && !Array.isArray(defaults[key])) {
        result[key] = mergeDefaults(result[key], defaults[key]);
      }
    });
    return result;
  }

  function normalizeJob(value) {
    const normalized = mergeDefaults(value || {}, newJob());
    normalized.schema = "meyer-tore-job";
    normalized.schemaVersion = 2;
    normalized.evidence.photos = Array.isArray(normalized.evidence.photos) ? normalized.evidence.photos.slice(0, MAX_PHOTOS) : [];
    normalized.drive.safety = Array.isArray(normalized.drive.safety) ? normalized.drive.safety : [];
    normalized.work.activities = Array.isArray(normalized.work.activities) ? normalized.work.activities : [];
    normalized.work.checklist = normalized.work.checklist && typeof normalized.work.checklist === "object" ? normalized.work.checklist : {};
    return normalized;
  }

  function loadJobs() {
    try {
      const parsed = JSON.parse(localStorage.getItem(JOBS_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function loadInitialJob() {
    const currentId = localStorage.getItem(CURRENT_KEY);
    const found = jobs.find((entry) => entry.id === currentId);
    return normalizeJob(found || newJob());
  }

  function getPath(object, path) {
    return path.split(".").reduce((value, key) => (value == null ? undefined : value[key]), object);
  }

  function setPath(object, path, value) {
    const parts = path.split(".");
    const last = parts.pop();
    const parent = parts.reduce((cursor, key) => {
      if (!cursor[key] || typeof cursor[key] !== "object") cursor[key] = {};
      return cursor[key];
    }, object);
    parent[last] = value;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function display(value, fallback = "—") {
    if (Array.isArray(value)) return value.length ? value.join(", ") : fallback;
    return value === 0 || value ? String(value) : fallback;
  }

  function formatDate(value, withTime = false) {
    if (!value) return "—";
    const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("de-DE", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
  }

  function categoryLabel(id) {
    return catalog.categories.find((entry) => entry.id === id)?.label || id || "—";
  }

  function modelLabel() {
    if (job.asset.model === "other-model") return display(job.asset.customModel);
    return catalog.models.find((entry) => entry.id === job.asset.model)?.name || display(job.asset.model);
  }

  function driveLabel() {
    if (job.drive.model === "other-drive") return display(job.drive.customModel);
    return catalog.drives.find((entry) => entry.id === job.drive.model)?.name || display(job.drive.model);
  }

  function controlLabel() {
    if (job.drive.control === "other-control") return display(job.drive.customControl);
    return catalog.controls.find((entry) => entry.id === job.drive.control)?.name || display(job.drive.control);
  }

  function setSaveIndicator(mode, text) {
    const indicator = $("#saveIndicator");
    indicator.classList.remove("saving", "error");
    if (mode) indicator.classList.add(mode);
    indicator.innerHTML = `<span></span> ${escapeHtml(text)}`;
  }

  function scheduleSave() {
    setSaveIndicator("saving", "Speichert …");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveJob, 350);
  }

  function saveJob() {
    clearTimeout(saveTimer);
    job.updatedAt = new Date().toISOString();
    job.lastStep = currentStep;
    const index = jobs.findIndex((entry) => entry.id === job.id);
    if (index >= 0) jobs[index] = structuredClone(job);
    else jobs.push(structuredClone(job));
    try {
      localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
      localStorage.setItem(CURRENT_KEY, job.id);
      setSaveIndicator("", "Gespeichert");
      updateHeader();
    } catch (error) {
      setSaveIndicator("error", "Speicher voll");
      showToast("Speicher ist voll. Bitte Auftrag als Datei sichern oder Fotos reduzieren.", true);
      console.error(error);
    }
  }

  function showToast(message, error = false, duration = 2800) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.toggle("error", error);
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), duration);
  }

  function setupInstallation() {
    const button = $("#installApp");
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (standalone) return;

    if (isiOS) button.hidden = false;
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      installPrompt = event;
      button.hidden = false;
    });
    window.addEventListener("appinstalled", () => {
      installPrompt = null;
      button.hidden = true;
      showToast("Meyer Tore wurde installiert.");
    });
    button.addEventListener("click", async () => {
      if (installPrompt) {
        installPrompt.prompt();
        await installPrompt.userChoice;
        installPrompt = null;
        button.hidden = true;
      } else if (isiOS) {
        showToast("iPhone: Auf Teilen tippen und dann „Zum Home-Bildschirm“ wählen.", false, 6500);
      } else {
        showToast("Im Browser-Menü „App installieren“ oder „Zum Startbildschirm“ wählen.", false, 6000);
      }
    });
  }

  function updateHeader() {
    $("#headerOrderNumber").textContent = job.order.number || "Neuer Auftrag";
  }

  function fillBoundFields() {
    $$('[data-bind]').forEach((element) => {
      const value = getPath(job, element.dataset.bind);
      if (element.type === "radio") element.checked = value === element.value;
      else if (element.type === "checkbox") element.checked = Boolean(value);
      else element.value = value == null ? "" : value;
    });
    $$('[data-array]').forEach((element) => {
      const values = getPath(job, element.dataset.array) || [];
      element.checked = values.includes(element.value);
    });
    updateHeader();
  }

  function readBoundField(element) {
    const path = element.dataset.bind;
    if (!path) return;
    if (element.type === "radio") {
      if (element.checked) setPath(job, path, element.value);
    } else if (element.type === "checkbox") {
      setPath(job, path, element.checked);
    } else {
      setPath(job, path, element.value);
    }

    if (path.startsWith("customer.") && job.site.sameAsCustomer) syncCustomerAddress();
    if (path === "site.sameAsCustomer" && element.checked) syncCustomerAddress();
    if (path === "asset.category" || path === "asset.manufacturer") updateCatalogSelectors(path === "asset.category");
    if (path === "asset.model") updateModelDetails();
    if (path === "drive.model" || path === "drive.control") updateCustomDriveFields();
    scheduleSave();
    updateStepStates();
  }

  function readArrayField(element) {
    const path = element.dataset.array;
    const current = new Set(getPath(job, path) || []);
    if (element.checked) current.add(element.value);
    else current.delete(element.value);
    setPath(job, path, Array.from(current));
    scheduleSave();
  }

  function syncCustomerAddress() {
    job.site.street = job.customer.street;
    job.site.zip = job.customer.zip;
    job.site.city = job.customer.city;
    if (!job.site.name) job.site.name = job.customer.company;
    ["site.street", "site.zip", "site.city", "site.name"].forEach((path) => {
      const element = $(`[data-bind="${path}"]`);
      if (element) element.value = getPath(job, path) || "";
    });
  }

  function populateCategories() {
    const select = $("#doorCategory");
    let group = "";
    select.innerHTML = catalog.categories.map((entry) => {
      if (!entry.id) return `<option value="">${escapeHtml(entry.label)}</option>`;
      let prefix = "";
      if (entry.group !== group) {
        if (group) prefix += "</optgroup>";
        prefix += `<optgroup label="${escapeHtml(entry.group)}">`;
        group = entry.group;
      }
      return `${prefix}<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.label)}</option>`;
    }).join("") + (group ? "</optgroup>" : "");
    select.value = job.asset.category || "";
  }

  function updateCatalogSelectors(categoryChanged = false) {
    const isHoermann = job.asset.manufacturer === "Hörmann";
    const category = job.asset.category;
    const modelSelect = $("#doorModel");
    const oldModel = categoryChanged ? "" : job.asset.model;
    const models = isHoermann
      ? catalog.models.filter((entry) => entry.category === category || entry.category === "*")
      : catalog.models.filter((entry) => entry.id === "other-model");

    modelSelect.innerHTML = `<option value="">Bitte Modell wählen</option>${models.map((entry) =>
      `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.name)}${entry.era === "legacy" ? " · älter" : ""}</option>`
    ).join("")}`;
    if (models.some((entry) => entry.id === oldModel)) modelSelect.value = oldModel;
    else {
      job.asset.model = isHoermann ? "" : "other-model";
      modelSelect.value = job.asset.model;
    }

    populateCompatibleSelect($("#driveModel"), catalog.drives, job.drive.model, "Antrieb wählen");
    populateCompatibleSelect($("#driveControl"), catalog.controls, job.drive.control, "Steuerung wählen");
    updateModelDetails();
    updateCustomDriveFields();
    if (categoryChanged) renderChecklist();
  }

  function populateCompatibleSelect(select, entries, selected, placeholder) {
    const category = job.asset.category;
    const compatible = entries.filter((entry) => !category || entry.categories.includes(category));
    select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>${compatible.map((entry) =>
      `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.name)}${entry.era === "legacy" ? " · älter" : ""}</option>`
    ).join("")}`;
    if (compatible.some((entry) => entry.id === selected)) select.value = selected;
    else {
      const path = select.id === "driveModel" ? "drive.model" : "drive.control";
      setPath(job, path, "");
      select.value = "";
    }
  }

  function updateModelDetails() {
    const selected = catalog.models.find((entry) => entry.id === job.asset.model);
    const badge = $("#modelEra");
    const custom = $(".custom-model");
    custom.hidden = job.asset.model !== "other-model";
    if (!selected || selected.id === "other-model") {
      badge.hidden = true;
      $("#modelInfo").innerHTML = `<strong>Modellhinweis</strong><p>Modellbezeichnung möglichst vollständig vom Typenschild übernehmen.</p>`;
      return;
    }
    badge.hidden = false;
    badge.classList.toggle("legacy", selected.era === "legacy");
    badge.textContent = selected.era === "legacy" ? "Ältere Baureihe" : "Aktuell";
    $("#modelInfo").innerHTML = `<strong>${escapeHtml(selected.name)}</strong><p>${escapeHtml(selected.note)}</p>`;
  }

  function updateCustomDriveFields() {
    $(".custom-drive").hidden = job.drive.model !== "other-drive";
    $(".custom-control").hidden = job.drive.control !== "other-control";
  }

  function renderChecklist() {
    const template = checklistLibrary.templateFor(job.asset.category);
    $("#checklistTitle").textContent = template.title;
    $("#checklistHint").textContent = `${template.items.length} Prüfpunkte · Auswahl wird automatisch gespeichert`;
    let lastGroup = "";
    let html = "";
    template.items.forEach((entry, index) => {
      if (entry.group !== lastGroup) {
        html += `<tr class="group-row"><td colspan="3">${escapeHtml(entry.group)}</td></tr>`;
        lastGroup = entry.group;
      }
      const record = job.work.checklist[entry.id] || { status: "", note: "" };
      const issue = ["maintenance", "repair"].includes(record.status) ? " issue-row" : "";
      html += `<tr class="check-row${issue}" data-check-id="${escapeHtml(entry.id)}">
        <td><div class="point-label"><span class="point-number">${String(index + 1).padStart(2, "0")}</span><span>${escapeHtml(entry.label)}</span></div></td>
        <td><div class="status-buttons">${checklistLibrary.statuses.map((status) =>
          `<button type="button" data-status="${status.id}" class="${record.status === status.id ? "active" : ""}" title="${escapeHtml(status.label)}">${escapeHtml(status.short)}</button>`
        ).join("")}</div></td>
        <td><input class="check-note" value="${escapeHtml(record.note || "")}" placeholder="Bemerkung …" aria-label="Bemerkung zu ${escapeHtml(entry.label)}"></td>
      </tr>`;
    });
    $("#checklistRows").innerHTML = html;
  }

  function setChecklistStatus(id, status) {
    const record = job.work.checklist[id] || { status: "", note: "" };
    record.status = record.status === status ? "" : status;
    job.work.checklist[id] = record;
    renderChecklist();
    scheduleSave();
    updateStepStates();
  }

  function checklistStats() {
    const template = checklistLibrary.templateFor(job.asset.category);
    const records = template.items.map((entry) => job.work.checklist[entry.id] || {});
    return {
      total: template.items.length,
      checked: records.filter((record) => record.status).length,
      ok: records.filter((record) => record.status === "ok").length,
      maintenance: records.filter((record) => record.status === "maintenance").length,
      repair: records.filter((record) => record.status === "repair").length,
      na: records.filter((record) => record.status === "na").length
    };
  }

  function stepComplete(step) {
    const stats = checklistStats();
    switch (step) {
      case 1: return Boolean(job.order.number && job.order.date && job.order.technician && job.order.type);
      case 2: return Boolean(job.customer.company);
      case 3: return Boolean(job.site.name);
      case 4: return Boolean(job.asset.manufacturer && job.asset.category && job.asset.model && (job.asset.model !== "other-model" || job.asset.customModel));
      case 5: return Boolean(job.asset.manual || job.drive.model || job.drive.control);
      case 6: return stats.checked === stats.total && Boolean(job.work.activities.length || job.work.description);
      case 7: return Boolean(job.evidence.photos.length || job.evidence.gps || job.signatures.technician || job.signatures.customer);
      case 8: return Boolean(job.report.result);
      case 9: return job.status === "completed";
      default: return false;
    }
  }

  function updateStepStates() {
    $$("#stepNavigation button").forEach((button) => {
      const step = Number(button.dataset.step);
      button.classList.toggle("active", step === currentStep);
      button.classList.toggle("complete", step !== currentStep && stepComplete(step));
      button.setAttribute("aria-current", step === currentStep ? "step" : "false");
    });
  }

  function validateCurrentStep() {
    const panel = $(`[data-step-panel="${currentStep}"]`);
    const required = $$('[required]', panel);
    let firstInvalid = null;
    required.forEach((element) => {
      const invalid = !String(element.value || "").trim();
      element.classList.toggle("invalid", invalid);
      if (invalid && !firstInvalid) firstInvalid = element;
    });
    if (job.asset.model === "other-model" && currentStep === 4 && !job.asset.customModel.trim()) {
      const custom = $("#customDoorModel");
      custom.classList.add("invalid");
      firstInvalid = firstInvalid || custom;
    }
    if (firstInvalid) {
      firstInvalid.focus();
      showToast("Bitte die markierten Pflichtfelder ausfüllen.", true);
      return false;
    }
    return true;
  }

  function showStep(step, options = {}) {
    const next = Math.max(1, Math.min(TOTAL_STEPS, Number(step) || 1));
    currentStep = next;
    $$("[data-step-panel]").forEach((panel) => { panel.hidden = Number(panel.dataset.stepPanel) !== next; });
    $("#progressText").textContent = `${next} von ${TOTAL_STEPS}`;
    $("#mobileProgressLabel").textContent = `Schritt ${next} von ${TOTAL_STEPS}`;
    $("#mobileProgressBar").style.width = `${(next / TOTAL_STEPS) * 100}%`;
    $("#prevStep").disabled = next === 1;
    $("#prevStep").style.visibility = next === 1 ? "hidden" : "visible";
    $("#nextStep").textContent = next === 8 ? "Bericht erstellen →" : "Weiter →";
    $(".workspace-footer").style.display = next === 9 ? "none" : "flex";
    updateStepStates();
    if (next === 6) renderChecklist();
    if (next === 7) {
      renderGps();
      renderPhotos();
      requestAnimationFrame(prepareSignatureCanvases);
    }
    if (next === 8) renderReview();
    if (next === 9) renderReport();
    job.lastStep = next;
    if (!options.skipSave) scheduleSave();
    if (!options.keepScroll) window.scrollTo({ top: 0, behavior: "smooth" });
    const activeButton = $(`#stepNavigation button[data-step="${next}"]`);
    activeButton?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }

  function validationIssues() {
    const issues = [];
    if (!job.order.number) issues.push({ step: 1, text: "Auftragsnummer fehlt" });
    if (!job.order.date) issues.push({ step: 1, text: "Auftragsdatum fehlt" });
    if (!job.order.technician) issues.push({ step: 1, text: "Techniker fehlt" });
    if (!job.order.type) issues.push({ step: 1, text: "Auftragsart fehlt" });
    if (!job.customer.company) issues.push({ step: 2, text: "Kunde / Betreiber fehlt" });
    if (!job.site.name) issues.push({ step: 3, text: "Anlagenstandort fehlt" });
    if (!job.asset.category) issues.push({ step: 4, text: "Torart fehlt" });
    if (!job.asset.model || (job.asset.model === "other-model" && !job.asset.customModel)) issues.push({ step: 4, text: "Tormodell fehlt" });
    const stats = checklistStats();
    if (stats.checked < stats.total) issues.push({ step: 6, text: `${stats.total - stats.checked} Prüfpunkte sind noch offen` });
    if (!job.report.result) issues.push({ step: 8, text: "Abschließendes Ergebnis fehlt" });
    return issues;
  }

  function renderReview() {
    const stats = checklistStats();
    if (!job.report.result) {
      if (stats.repair > 0 || stats.maintenance > 0) job.report.result = "Anlage mit Beanstandungen";
      else if (stats.checked === stats.total && stats.total > 0) job.report.result = "Anlage ohne Beanstandung";
      fillBoundFields();
    }
    const issues = validationIssues();
    const summary = $("#validationSummary");
    if (issues.length) {
      summary.className = "validation-summary warn";
      summary.innerHTML = `<b>!</b><div><strong>${issues.length} Punkt${issues.length === 1 ? "" : "e"} bitte prüfen</strong><p>Der Bericht kann erstellt werden, ist aber noch nicht vollständig.</p><ul>${issues.slice(0, 8).map((entry) => `<li>${escapeHtml(entry.text)}</li>`).join("")}</ul></div>`;
    } else {
      summary.className = "validation-summary good";
      summary.innerHTML = `<b>✓</b><div><strong>Bericht ist vollständig</strong><p>Alle Pflichtangaben und Prüfpunkte sind erfasst.</p></div>`;
    }

    const cards = [
      { title: "Auftrag", step: 1, rows: [["Nummer", job.order.number], ["Art", job.order.type], ["Techniker", job.order.technician], ["Datum", formatDate(job.order.date)]] },
      { title: "Kunde & Standort", step: 2, rows: [["Betreiber", job.customer.company], ["Kontakt", job.customer.contact], ["Standort", job.site.name], ["Ort", [job.site.zip, job.site.city].filter(Boolean).join(" ")]] },
      { title: "Toranlage", step: 4, rows: [["Torart", categoryLabel(job.asset.category)], ["Modell", modelLabel()], ["Baujahr", job.asset.year], ["Fabrik-Nr.", job.asset.serial]] },
      { title: "Antrieb & Prüfung", step: 5, rows: [["Antrieb", driveLabel()], ["Steuerung", controlLabel()], ["Geprüft", `${stats.checked} / ${stats.total}`], ["Mängel", `${stats.repair} Reparatur · ${stats.maintenance} Wartung`]] }
    ];
    $("#reviewGrid").innerHTML = cards.map((card) => `<article class="review-card"><header><h3>${escapeHtml(card.title)}</h3><button type="button" data-go-step="${card.step}">Bearbeiten</button></header><dl>${card.rows.map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(display(value))}</dd>`).join("")}</dl></article>`).join("");
  }

  function renderGps() {
    const box = $("#gpsBox");
    if (!job.evidence.gps) {
      box.className = "gps-box";
      box.innerHTML = `<span class="gps-pin">⌖</span><div><strong>Noch kein Standort gespeichert</strong><small>Koordinaten und Zeitpunkt werden im Bericht dokumentiert.</small></div>`;
      return;
    }
    const gps = job.evidence.gps;
    box.className = "gps-box captured";
    box.innerHTML = `<span class="gps-pin">✓</span><div><strong>${gps.lat.toFixed(6)}, ${gps.lon.toFixed(6)}</strong><small>Genauigkeit ca. ${Math.round(gps.accuracy)} m · ${escapeHtml(formatDate(gps.capturedAt, true))}</small></div>`;
  }

  async function captureGps() {
    if (!navigator.geolocation) {
      showToast("Standorterfassung wird auf diesem Gerät nicht unterstützt.", true);
      return;
    }
    const button = $("#captureGps");
    button.disabled = true;
    button.textContent = "Ermittelt …";
    navigator.geolocation.getCurrentPosition((position) => {
      job.evidence.gps = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: position.coords.accuracy,
        capturedAt: new Date(position.timestamp || Date.now()).toISOString()
      };
      renderGps();
      scheduleSave();
      button.disabled = false;
      button.textContent = "Standort erneuern";
      showToast("Standort wurde gespeichert.");
    }, (error) => {
      button.disabled = false;
      button.textContent = "Standort erfassen";
      const message = error.code === 1 ? "Standortfreigabe wurde nicht erteilt." : "Standort konnte nicht ermittelt werden.";
      showToast(message, true);
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  }

  function compressPhoto(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden"));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("Bildformat wird nicht unterstützt"));
        image.onload = () => {
          const maxSide = 1100;
          const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
          const width = Math.max(1, Math.round(image.naturalWidth * scale));
          const height = Math.max(1, Math.round(image.naturalHeight * scale));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d");
          context.fillStyle = "#fff";
          context.fillRect(0, 0, width, height);
          context.drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", .68));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function addPhotos(files) {
    const available = MAX_PHOTOS - job.evidence.photos.length;
    if (available <= 0) {
      showToast(`Maximal ${MAX_PHOTOS} Fotos je Auftrag.`, true);
      return;
    }
    const selected = Array.from(files).slice(0, available);
    showToast(`${selected.length} Foto${selected.length === 1 ? "" : "s"} wird verarbeitet …`);
    for (const file of selected) {
      try {
        const dataUrl = await compressPhoto(file);
        job.evidence.photos.push({ id: uid(), name: file.name || "Foto", caption: "", dataUrl, createdAt: new Date().toISOString() });
      } catch (error) {
        showToast(`${file.name}: ${error.message}`, true);
      }
    }
    renderPhotos();
    saveJob();
  }

  function renderPhotos() {
    const grid = $("#photoGrid");
    if (!job.evidence.photos.length) {
      grid.innerHTML = `<div class="empty-photos"><strong>Noch keine Fotos</strong><small>Bis zu ${MAX_PHOTOS} komprimierte Bilder je Auftrag</small></div>`;
      return;
    }
    grid.innerHTML = job.evidence.photos.map((photo) => `<div class="photo-item" data-photo-id="${escapeHtml(photo.id)}"><img src="${photo.dataUrl}" alt="${escapeHtml(photo.caption || photo.name)}"><button type="button" data-remove-photo aria-label="Foto löschen">×</button><input value="${escapeHtml(photo.caption)}" placeholder="Bildbeschreibung"></div>`).join("");
  }

  function setupSignatureCanvas(canvas) {
    const key = canvas.dataset.signatureCanvas;
    signatureCanvases[key] = canvas;
    let drawing = false;
    let last = null;
    const point = (event) => {
      const rect = canvas.getBoundingClientRect();
      return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
    };
    canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      if (!canvas.width || canvas.width < 10) prepareSignatureCanvas(key);
      drawing = true;
      last = point(event);
      try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
      const context = canvas.getContext("2d");
      context.beginPath();
      context.arc(last.x, last.y, context.lineWidth / 2, 0, Math.PI * 2);
      context.fill();
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!drawing) return;
      event.preventDefault();
      const next = point(event);
      const context = canvas.getContext("2d");
      context.beginPath();
      context.moveTo(last.x, last.y);
      context.lineTo(next.x, next.y);
      context.stroke();
      last = next;
    });
    const end = () => {
      if (!drawing) return;
      drawing = false;
      job.signatures[key] = canvas.toDataURL("image/png");
      scheduleSave();
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    canvas.addEventListener("pointerleave", (event) => { if (event.pointerType === "mouse") end(); });
  }

  function prepareSignatureCanvas(key) {
    const canvas = signatureCanvases[key];
    if (!canvas || canvas.clientWidth < 10) return;
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const width = Math.round(canvas.clientWidth * ratio);
    const height = Math.round(canvas.clientHeight * ratio);
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.strokeStyle = "#152a35";
    context.fillStyle = "#152a35";
    context.lineWidth = Math.max(2, 2.2 * ratio);
    context.lineCap = "round";
    context.lineJoin = "round";
    const source = job.signatures[key];
    if (source) {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0, width, height);
      image.src = source;
    }
  }

  function prepareSignatureCanvases() {
    Object.keys(signatureCanvases).forEach(prepareSignatureCanvas);
  }

  function clearSignature(key) {
    const canvas = signatureCanvases[key];
    if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    job.signatures[key] = "";
    scheduleSave();
  }

  function reportHeader(pageTitle) {
    return `<header class="report-header"><div class="report-brand"><span class="report-logo"><i></i><i></i><i></i></span><span><strong>MEYER TORE</strong><small>Service · Wartung · Prüfung · Reparatur</small></span></div><div class="report-company">Meyer Tore<br>Am Stall 11 · 42369 Wuppertal<br>Tel. 0202 / 317 29 23</div></header><div class="report-titlebar"><div><small>Digitaler Servicebericht</small><h1>${escapeHtml(pageTitle)}</h1></div><span class="report-status ${reportStatusClass()}">${escapeHtml(job.status === "completed" ? "ABGESCHLOSSEN" : "ENTWURF")}</span></div>`;
  }

  function reportStatusClass() {
    if (job.report.result.includes("außer Betrieb")) return "danger";
    if (job.report.result.includes("Beanstandungen")) return "warning";
    if (job.report.result.includes("ohne")) return "ok";
    return "";
  }

  function reportPair(label, value) {
    return `<div class="report-pair"><span>${escapeHtml(label)}</span><strong>${escapeHtml(display(value))}</strong></div>`;
  }

  function reportFooter(page, total) {
    return `<footer class="report-footer"><span>Meyer Tore · Service-App Beta 2.0</span><span>Auftrag ${escapeHtml(display(job.order.number))} · Seite ${page} von ${total}</span></footer>`;
  }

  function renderReport() {
    const template = checklistLibrary.templateFor(job.asset.category);
    const photos = job.evidence.photos;
    const totalPages = photos.length ? 3 : 2;
    const gps = job.evidence.gps ? `${job.evidence.gps.lat.toFixed(6)}, ${job.evidence.gps.lon.toFixed(6)} · ± ${Math.round(job.evidence.gps.accuracy)} m` : "Nicht erfasst";
    const size = job.asset.width || job.asset.height ? `${display(job.asset.width, "?")} × ${display(job.asset.height, "?")} mm` : "—";
    const safety = job.drive.safety.length ? job.drive.safety.join(", ") : "Nicht erfasst";
    const activities = job.work.activities.length ? job.work.activities.join(", ") : "Nicht erfasst";
    const issueRecords = template.items.filter((entry) => ["maintenance", "repair"].includes(job.work.checklist[entry.id]?.status));
    const statusLabels = Object.fromEntries(checklistLibrary.statuses.map((entry) => [entry.id, entry.label]));

    const page1 = `<article class="report-page">${reportHeader("Service- und Prüfbericht")}
      <section class="report-section"><h2>Auftrag</h2><div class="report-data three">${reportPair("Auftragsnummer", job.order.number)}${reportPair("Datum / Termin", `${formatDate(job.order.date)}${job.order.appointment ? ` · ${job.order.appointment} Uhr` : ""}`)}${reportPair("Auftragsart", job.order.type)}${reportPair("Techniker", job.order.technician)}${reportPair("Kundenreferenz", job.order.reference)}${reportPair("Vertrag", job.order.contract)}</div></section>
      <section class="report-section"><h2>Kunde und Anlagenstandort</h2><div class="report-data">${reportPair("Betreiber", job.customer.company)}${reportPair("Ansprechpartner", job.customer.contact)}${reportPair("Kundenanschrift", [job.customer.street, [job.customer.zip, job.customer.city].filter(Boolean).join(" ")].filter(Boolean).join(", "))}${reportPair("Telefon / E-Mail", [job.customer.phone, job.customer.email].filter(Boolean).join(" · "))}${reportPair("Standort / Position", [job.site.name, job.site.position].filter(Boolean).join(" · "))}${reportPair("Standortanschrift", [job.site.street, [job.site.zip, job.site.city].filter(Boolean).join(" ")].filter(Boolean).join(", "))}</div></section>
      <section class="report-section"><h2>Toranlage</h2><div class="report-data three">${reportPair("Hersteller", job.asset.manufacturer)}${reportPair("Torart", categoryLabel(job.asset.category))}${reportPair("Modell", modelLabel())}${reportPair("Baujahr", job.asset.year)}${reportPair("Fabrik- / Seriennummer", job.asset.serial)}${reportPair("Größe", size)}${reportPair("Antrieb", driveLabel())}${reportPair("Steuerung", controlLabel())}${reportPair("Betriebsart", job.drive.mode)}</div></section>
      <section class="report-section"><h2>Arbeiten und Ergebnis</h2>${reportPair("Ausgeführte Tätigkeiten", activities)}<div class="report-text">${escapeHtml(display(job.work.description, "Keine zusätzliche Arbeitsbeschreibung."))}</div><div class="report-data three" style="margin-top:2.5mm">${reportPair("Ergebnis", job.report.result)}${reportPair("Nächster Prüftermin", formatDate(job.report.nextInspection))}${reportPair("Arbeitszeit", job.work.hours ? `${job.work.hours} Std.` : "—")}</div></section>
      <section class="report-section"><h2>Festgestellte Mängel / Empfehlung</h2><div class="report-data"><div><span style="font-size:6.5px;color:#78878e;text-transform:uppercase">Mängel</span><div class="report-text">${escapeHtml(display(job.work.defects, issueRecords.length ? issueRecords.map((entry) => entry.label).join("; ") : "Keine Mängel dokumentiert."))}</div></div><div><span style="font-size:6.5px;color:#78878e;text-transform:uppercase">Empfehlung</span><div class="report-text">${escapeHtml(display(job.work.recommendation, job.report.note || "Keine zusätzliche Empfehlung."))}</div></div></div></section>
      <section class="report-section"><h2>Nachweise</h2><div class="report-data three">${reportPair("GPS", gps)}${reportPair("Fotos", `${photos.length} gespeichert`)}${reportPair("Sicherheitsausstattung", safety)}</div></section>
      <div class="report-signatures"><div class="report-signature">${job.signatures.technician ? `<img src="${job.signatures.technician}" alt="Unterschrift Techniker">` : ""}<strong>${escapeHtml(display(job.order.technician, "Techniker"))}</strong><small>Datum, Unterschrift Techniker</small></div><div class="report-signature">${job.signatures.customer ? `<img src="${job.signatures.customer}" alt="Unterschrift Kunde">` : ""}<strong>${escapeHtml(display(job.report.customerSigner, job.customer.contact || "Kunde / Betreiber"))}</strong><small>Datum, Unterschrift Kunde / Betreiber</small></div></div>
      ${reportFooter(1, totalPages)}</article>`;

    let lastGroup = "";
    let rows = "";
    template.items.forEach((entry, index) => {
      if (entry.group !== lastGroup) {
        rows += `<tr><td colspan="4" style="background:#edf3f5;font-weight:bold;color:#375464">${escapeHtml(entry.group)}</td></tr>`;
        lastGroup = entry.group;
      }
      const record = job.work.checklist[entry.id] || {};
      const issue = ["maintenance", "repair"].includes(record.status) ? "issue" : "";
      rows += `<tr class="${issue}"><td>${index + 1}</td><td>${escapeHtml(entry.label)}</td><td class="report-check-status">${escapeHtml(statusLabels[record.status] || "offen")}</td><td>${escapeHtml(record.note || "")}</td></tr>`;
    });
    const page2 = `<article class="report-page">${reportHeader(template.title)}<section class="report-section"><h2>Prüfpunkte</h2><table class="report-table"><thead><tr><th style="width:6%">Nr.</th><th style="width:49%">Prüfpunkt</th><th style="width:18%">Status</th><th>Bemerkung</th></tr></thead><tbody>${rows}</tbody></table></section><section class="report-section"><h2>Messwerte und Ersatzteile</h2><div class="report-data"><div><span style="font-size:6.5px;color:#78878e;text-transform:uppercase">Kraftmessung / Messwerte</span><div class="report-text">${escapeHtml(display(job.work.measurements))}</div></div><div><span style="font-size:6.5px;color:#78878e;text-transform:uppercase">Ersatzteile</span><div class="report-text">${escapeHtml(display(job.work.parts))}</div></div></div></section>${reportFooter(2, totalPages)}</article>`;

    const page3 = photos.length ? `<article class="report-page">${reportHeader("Fotodokumentation")}<section class="report-section"><h2>${photos.length} Foto${photos.length === 1 ? "" : "s"}</h2><div class="report-photo-grid">${photos.map((photo, index) => `<figure class="report-photo"><img src="${photo.dataUrl}" alt="Foto ${index + 1}"><figcaption>${index + 1}. ${escapeHtml(photo.caption || photo.name || "Auftragsfoto")}</figcaption></figure>`).join("")}</div></section>${reportFooter(3, totalPages)}</article>` : "";
    $("#reportPreview").innerHTML = page1 + page2 + page3;
  }

  function downloadJson() {
    saveJob();
    const blob = new Blob([JSON.stringify(job, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const safeNumber = (job.order.number || "Auftrag").replace(/[^a-z0-9_-]+/gi, "_");
    link.download = `${safeNumber}_${localDate()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    showToast("Auftragsdatei wurde erstellt.");
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (parsed.schema !== "meyer-tore-job" && !parsed.order) throw new Error("Keine gültige Meyer-Tore-Auftragsdatei");
        const imported = normalizeJob(parsed);
        if (jobs.some((entry) => entry.id === imported.id)) imported.id = uid();
        imported.status = imported.status || "draft";
        imported.updatedAt = new Date().toISOString();
        job = imported;
        jobs.push(structuredClone(job));
        initializeJobView();
        saveJob();
        showToast("Auftrag wurde geladen.");
      } catch (error) {
        showToast(error.message || "Datei konnte nicht geladen werden.", true);
      }
    };
    reader.readAsText(file);
  }

  function renderJobs(filter = "") {
    const query = filter.trim().toLowerCase();
    const sorted = [...jobs].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).filter((entry) => {
      const haystack = [entry.order?.number, entry.customer?.company, entry.site?.name, entry.site?.city].join(" ").toLowerCase();
      return !query || haystack.includes(query);
    });
    const list = $("#jobList");
    if (!sorted.length) {
      list.innerHTML = `<div class="empty-jobs">${query ? "Keine passenden Aufträge gefunden." : "Noch keine Aufträge gespeichert."}</div>`;
      return;
    }
    list.innerHTML = sorted.map((entry) => `<article class="job-item ${entry.id === job.id ? "active" : ""}" data-job-id="${escapeHtml(entry.id)}"><div><strong>${escapeHtml(display(entry.order?.number, "Ohne Nummer"))}</strong><p>${escapeHtml(display(entry.customer?.company, "Kunde noch offen"))}${entry.site?.name ? ` · ${escapeHtml(entry.site.name)}` : ""}</p><small>Zuletzt ${escapeHtml(formatDate(entry.updatedAt, true))}</small></div><span class="job-state ${entry.status === "completed" ? "done" : ""}">${entry.status === "completed" ? "Fertig" : "Entwurf"}</span><div class="job-item-actions"><button type="button" data-duplicate-job>Duplizieren</button><button type="button" data-delete-job class="delete">Löschen</button></div></article>`).join("");
  }

  function openJobs() {
    saveJob();
    renderJobs($("#jobSearch").value);
    $("#drawerBackdrop").hidden = false;
    $("#jobsDrawer").classList.add("open");
    $("#jobsDrawer").setAttribute("aria-hidden", "false");
  }

  function closeJobs() {
    $("#jobsDrawer").classList.remove("open");
    $("#jobsDrawer").setAttribute("aria-hidden", "true");
    setTimeout(() => { $("#drawerBackdrop").hidden = true; }, 220);
  }

  function loadJobById(id) {
    const selected = jobs.find((entry) => entry.id === id);
    if (!selected) return;
    saveJob();
    job = normalizeJob(selected);
    initializeJobView();
    closeJobs();
    showToast(`Auftrag ${job.order.number || ""} geladen.`);
  }

  function createNewJob() {
    saveJob();
    job = newJob();
    jobs.push(structuredClone(job));
    initializeJobView();
    saveJob();
    closeJobs();
    showToast("Neuer Auftrag wurde angelegt.");
  }

  function duplicateJob(id) {
    const source = jobs.find((entry) => entry.id === id);
    if (!source) return;
    const copy = normalizeJob(structuredClone(source));
    copy.id = uid();
    copy.status = "draft";
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = copy.createdAt;
    copy.completedAt = "";
    copy.order.number = makeOrderNumber();
    copy.order.date = localDate();
    copy.evidence.photos = [];
    copy.evidence.gps = null;
    copy.signatures = { technician: "", customer: "" };
    jobs.push(copy);
    renderJobs($("#jobSearch").value);
    showToast("Auftrag wurde als neuer Entwurf dupliziert.");
  }

  function deleteJob(id) {
    const selected = jobs.find((entry) => entry.id === id);
    if (!selected || !confirm(`Auftrag ${selected.order?.number || ""} wirklich löschen?`)) return;
    jobs = jobs.filter((entry) => entry.id !== id);
    if (job.id === id) job = normalizeJob(jobs[0] || newJob());
    try { localStorage.setItem(JOBS_KEY, JSON.stringify(jobs)); } catch (_) {}
    initializeJobView();
    renderJobs($("#jobSearch").value);
    showToast("Auftrag wurde gelöscht.");
  }

  function initializeJobView() {
    fillBoundFields();
    populateCategories();
    updateCatalogSelectors(false);
    renderChecklist();
    renderGps();
    renderPhotos();
    showStep(Math.max(1, Math.min(TOTAL_STEPS, Number(job.lastStep) || 1)), { skipSave: true, keepScroll: true });
    updateStepStates();
    updateHeader();
  }

  function bindEvents() {
    $$('[data-bind]').forEach((element) => {
      const eventName = ["checkbox", "radio"].includes(element.type) || element.tagName === "SELECT" ? "change" : "input";
      element.addEventListener(eventName, () => readBoundField(element));
      element.addEventListener("input", () => element.classList.remove("invalid"));
    });
    $$('[data-array]').forEach((element) => element.addEventListener("change", () => readArrayField(element)));

    $$("#stepNavigation button").forEach((button) => button.addEventListener("click", () => showStep(Number(button.dataset.step))));
    $("#prevStep").addEventListener("click", () => showStep(currentStep - 1));
    $("#nextStep").addEventListener("click", () => { if (validateCurrentStep()) showStep(currentStep + 1); });

    $("#checklistRows").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-status]");
      if (!button) return;
      const row = button.closest("[data-check-id]");
      setChecklistStatus(row.dataset.checkId, button.dataset.status);
    });
    $("#checklistRows").addEventListener("input", (event) => {
      if (!event.target.classList.contains("check-note")) return;
      const id = event.target.closest("[data-check-id]").dataset.checkId;
      const record = job.work.checklist[id] || { status: "", note: "" };
      record.note = event.target.value;
      job.work.checklist[id] = record;
      scheduleSave();
    });
    $("#markAllOk").addEventListener("click", () => {
      checklistLibrary.templateFor(job.asset.category).items.forEach((entry) => {
        const record = job.work.checklist[entry.id] || { status: "", note: "" };
        if (!record.status) record.status = "ok";
        job.work.checklist[entry.id] = record;
      });
      renderChecklist();
      scheduleSave();
      showToast("Alle offenen Prüfpunkte wurden als o. B. markiert.");
    });
    $("#clearChecklist").addEventListener("click", () => {
      if (!confirm("Prüfstatus der aktuellen Liste wirklich leeren?")) return;
      checklistLibrary.templateFor(job.asset.category).items.forEach((entry) => delete job.work.checklist[entry.id]);
      renderChecklist();
      scheduleSave();
    });

    $("#captureGps").addEventListener("click", captureGps);
    $("#photoInput").addEventListener("change", (event) => {
      addPhotos(event.target.files);
      event.target.value = "";
    });
    $("#photoGrid").addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-photo]");
      if (!button) return;
      const id = button.closest("[data-photo-id]").dataset.photoId;
      job.evidence.photos = job.evidence.photos.filter((photo) => photo.id !== id);
      renderPhotos();
      scheduleSave();
    });
    $("#photoGrid").addEventListener("input", (event) => {
      if (event.target.tagName !== "INPUT") return;
      const id = event.target.closest("[data-photo-id]").dataset.photoId;
      const photo = job.evidence.photos.find((entry) => entry.id === id);
      if (photo) photo.caption = event.target.value;
      scheduleSave();
    });

    $$('[data-signature-canvas]').forEach(setupSignatureCanvas);
    $$(".clear-signature").forEach((button) => button.addEventListener("click", () => clearSignature(button.dataset.signature)));
    window.addEventListener("resize", () => { if (currentStep === 7) prepareSignatureCanvases(); });

    $("#reviewGrid").addEventListener("click", (event) => {
      const button = event.target.closest("[data-go-step]");
      if (button) showStep(Number(button.dataset.goStep));
    });
    $("#backToEdit").addEventListener("click", () => showStep(8));
    $("#printReport").addEventListener("click", () => { renderReport(); window.print(); });
    $("#finishJob").addEventListener("click", () => {
      const issues = validationIssues();
      if (issues.length && !confirm(`Der Bericht hat noch ${issues.length} offene Punkte. Trotzdem abschließen?`)) return;
      job.status = "completed";
      job.completedAt = new Date().toISOString();
      saveJob();
      renderReport();
      updateStepStates();
      showToast("Auftrag wurde abgeschlossen.");
    });

    $("#exportJob").addEventListener("click", downloadJson);
    $("#importJob").addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (file) importJson(file);
      event.target.value = "";
    });
    $("#openJobs").addEventListener("click", openJobs);
    $("#closeJobs").addEventListener("click", closeJobs);
    $("#drawerBackdrop").addEventListener("click", closeJobs);
    $("#newJob").addEventListener("click", createNewJob);
    $("#newJobDrawer").addEventListener("click", createNewJob);
    $("#jobSearch").addEventListener("input", (event) => renderJobs(event.target.value));
    $("#jobList").addEventListener("click", (event) => {
      const item = event.target.closest("[data-job-id]");
      if (!item) return;
      if (event.target.closest("[data-duplicate-job]")) duplicateJob(item.dataset.jobId);
      else if (event.target.closest("[data-delete-job]")) deleteJob(item.dataset.jobId);
      else loadJobById(item.dataset.jobId);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeJobs();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); downloadJson(); }
    });
    window.addEventListener("beforeunload", saveJob);
  }

  function start() {
    $("#catalogCount").textContent = `${catalog.models.filter((entry) => entry.id !== "other-model").length} Torbaureihen · ${catalog.drives.filter((entry) => entry.id !== "other-drive").length} Antriebe`;
    bindEvents();
    setupInstallation();
    initializeJobView();
    saveJob();
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
