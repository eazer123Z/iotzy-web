/**
 * assets/js/app.js
 * ─────────────────────────────────────────────────────────────────
 * ORCHESTRATOR UTAMA IoTzy Frontend.
 * Berisi HANYA: Global State, Config, Utility functions, API wrapper,
 * data bootstrap, dan real-time sync. Semua logika UI spesifik
 * ada di masing-masing file dalam /modules/.
 *
 * Urutan load (footer.php):
 *   1. app.js          ← ini (pondasi, harus pertama)
 *   2. navigation.js
 *   3. overview-manager.js
 *   4. mqtt-manager, device-manager, sensor-manager
 *   5. log-manager, schedule-manager
 *   6. automation-engine, automation-ui
 *   7. camera-manager, cv-config, cv-detector, light-analyzer, cv-manager, cv-ui
 *   8. settings-manager, ai-chat
 */

/* ============================================================
   KONFIGURASI GLOBAL
   ============================================================ */
const CONFIG = {
  mqtt: {
    broker:         "broker.hivemq.com",
    port:           8884,
    path:           "/mqtt",
    maxReconnect:   5,
    reconnectDelay: 3000,
  },
  app: {
    maxLogs: 500,
    liveSyncInterval: 5000,
    fullSyncInterval: 15000,
    analyticsSyncInterval: 30000,
    cameraSettingsSyncInterval: 45000,
    syncBackoffMax: 30000,
  },
};

/* ============================================================
   STATE APLIKASI (Reactive-like store)
   ============================================================ */
const STATE = {
  devices:             {},
  deviceStates:        {},
  deviceTopics:        {},
  deviceOnAt:          {},
  deviceExtras:        {},
  deviceTemplates:     [],
  deviceTemplatesPromise: null,
  sensors:             {},
  sensorData:          {},
  sensorHistory:       {},
  sensorTemplates:     [],
  sensorTemplatesPromise: null,
  automationRules:     {},
  schedules:           [],
  schedulesLoaded:     false,
  scheduleLoadPromise: null,
  logs:                [],
  logFilter:           "",
  logSearchFilter:     "",
  analyticsDate:       new Date().toISOString().slice(0, 10),
  analytics:           null,
  quickControlDevices: [],
  mqtt: { client: null, connected: false, reconnectAttempts: 0, templates: [] },
  camera: {
    stream:           null,
    active:           false,
    selectedDeviceId: null,
    availableDevices: [],
    defaultMeta:      null,
    settings:         {},
  },
  cvAutoStartRequested: false,
  sessionStart: Date.now(),
  cv: {
    personCount:    0,
    personPresent:  false,
    lightCondition: "unknown",
    brightness:     0,
  },
  sync: {
    timer:                 null,
    failureCount:          0,
    lastFullSyncAt:        0,
    lastAnalyticsSyncAt:   0,
    lastCameraSettingsAt:  0,
  },
};

/* ============================================================
   KONFIGURASI COMPUTER VISION (state runtime)
   ============================================================ */
const CV = {
  modelLoaded:   false,
  modelLoading:  false,
  detecting:     false,
  model:         null,
  fpsTimer:      null,
  fps:           0,
  frameCount:    0,
  overlayCanvas: null,
  overlayCtx:    null,
  showBoxes:     true,
  showDebug:     true,
  confidence:    0.6,
  humanPresent:  false,
  humanTimer:    null,
  lightCondition:"unknown",
  lightTimer:    null,
  cvRules: {
    human: { enabled: true, onDetect: [], onAbsent: [], delay: 3000 },
    light: { enabled: true, onDark:   [], onBright: [], delay: 2000 },
  },
};


/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */

function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const icons = {
    success: "fa-check-circle", error: "fa-times-circle",
    warning: "fa-exclamation-triangle", info: "fa-circle-info",
  };
  const toast   = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas ${icons[type] || icons.info} toast-icon"></i>
    <span class="toast-msg">${escHtml(message)}</span>
    <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity    = "0";
    toast.style.transform  = "translateX(12px)";
    toast.style.transition = "all .3s";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.add("active"); document.body.style.overflow = "hidden"; }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.remove("active"); document.body.style.overflow = ""; }
}

/* ============================================================
   THEME
   ============================================================ */
function initTheme() {
  const t = (typeof PHP_SETTINGS !== 'undefined' ? (PHP_SETTINGS.theme || 'dark') : 'dark');
  document.documentElement.setAttribute('data-theme', t);
  updateThemeIcon(t);
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  updateThemeIcon(next);
  
  // Sync settings dropdown jika ada
  const sel = document.getElementById('settTheme');
  if (sel) sel.value = next;
  
  // Update theme on backend automatically
  apiPost("save_settings", { theme: next }).catch(e => console.warn("Gagal sinkron tema:", e));
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;
  const icon = btn.querySelector('i');
  if (icon) icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

/* ============================================================
   API WRAPPER
   ============================================================ */
async function apiPost(action, data = {}) {
  try {
    const base = (typeof APP_BASE !== "undefined" ? APP_BASE.replace(/\/$/, "") : "") + "/api/index.php";
    const hdrs = { "Content-Type": "application/json" };
    if (typeof CSRF_TOKEN !== "undefined") hdrs["X-CSRF-Token"] = CSRF_TOKEN;

    const res = await fetch(`${base}?action=${action}`, {
      method:      "POST",
      headers:     hdrs,
      credentials: "include",
      body:        JSON.stringify(data),
    });

    if (res.status === 401) {
      console.warn("Session expired. Redirecting...");
      window.location.href = (typeof APP_BASE !== "undefined" ? APP_BASE : "") + "/?route=login&expired=true";
      return null;
    }
    if (res.status === 403) {
      showToast("Access Denied (403)", "error");
      return null;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    // Pastikan respon adalah JSON sebelum diparsing
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await res.text();
      console.error("Respon bukan JSON:", text.substring(0, 200));
      return { success: false, error: "Server tidak mengirimkan JSON yang valid." };
    }

    try {
      return await res.json();
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      return { success: false, error: "Gagal memproses data server (JSON Error)." };
    }
  } catch (e) {
    console.error("API error:", action, e);
    if (e.name !== 'AbortError') showToast(`API error: ${action}`, "error");
    return { success: false, error: e.message };
  }
}

/* ============================================================
   CV CONFIG HELPERS (diakses oleh cv-manager.js & cv-ui.js)
   ============================================================ */
async function loadCVConfig() {
  const result = await apiPost("get_cv_config", {});
  if (result) {
    if (result.showBoundingBox !== undefined) CV.showBoxes  = result.showBoundingBox;
    if (result.showDebugInfo   !== undefined) CV.showDebug  = result.showDebugInfo;
    if (result.minConfidence   !== undefined) CV.confidence = result.minConfidence;
  }
}

async function loadCVRules() {
  const result = await apiPost("get_cv_rules", {});
  if (result) {
    CV.cvRules = { ...CV.cvRules, ...result };
    if (typeof automationEngine !== "undefined") automationEngine.updateCVRules(CV.cvRules);
  }
}

async function saveCVRules() {
  await apiPost("save_cv_rules", { rules: CV.cvRules });
}

async function syncCVConfigFromServer() {
  await loadCVConfig();
  await loadCVRules();
  const g = (id) => document.getElementById(id);
  if (g("cvConfidenceThreshold")) g("cvConfidenceThreshold").value = Math.round(CV.confidence * 100);
  if (g("cvShowBoundingBoxCamera")) g("cvShowBoundingBoxCamera").checked = CV.showBoxes;
  if (g("cvShowDebugInfoCamera"))   g("cvShowDebugInfoCamera").checked   = CV.showDebug;
  if (typeof automationEngine !== 'undefined') automationEngine.updateCVRules(CV.cvRules);
}

function toggleBoundingBox(val) {
  CV.showBoxes = val;
  ["cvShowBoundingBoxCamera", "cvShowBoundingBoxSettings"].forEach((id) => {
    const el = document.getElementById(id); if (el && el.checked !== val) el.checked = val;
  });
  if (!val && CV.overlayCtx && CV.overlayCanvas)
    CV.overlayCtx.clearRect(0, 0, CV.overlayCanvas.width, CV.overlayCanvas.height);
  apiPost("save_cv_config", { config: { showBoundingBox: val, showDebugInfo: CV.showDebug, minConfidence: CV.confidence } }).catch(() => {});
}

function toggleDebugInfo(val) {
  CV.showDebug = val;
  ["cvShowDebugInfoCamera", "cvShowDebugInfoSettings"].forEach((id) => {
    const el = document.getElementById(id); if (el && el.checked !== val) el.checked = val;
  });
  const hud = document.getElementById("cvDetectionInfo");
  if (hud) hud.style.display = val && CV.detecting ? "flex" : "none";
  apiPost("save_cv_config", { config: { showBoundingBox: CV.showBoxes, showDebugInfo: val, minConfidence: CV.confidence } }).catch(() => {});
}

function updateCVConfig(val) {
  CV.confidence = parseFloat(val) / 100;
  apiPost("save_cv_config", { config: { showBoundingBox: CV.showBoxes, showDebugInfo: CV.showDebug, minConfidence: CV.confidence } }).catch(() => {});
}

/* ============================================================
   CV PERSON COUNT CALLBACK (dipanggil oleh cv-detector.js)
   ============================================================ */
function onCVPersonCountUpdate(count) {
  STATE.cv.personCount   = count;
  STATE.cv.personPresent = count > 0;
  const g = (id) => document.getElementById(id);
  if (g("cvPersonCountBig")) g("cvPersonCountBig").textContent = count;
  if (g("cvHumanCount"))     g("cvHumanCount").textContent     = count;
  if (typeof automationEngine !== "undefined") automationEngine.notifyPersonCount(count);
  updateDashboardStats();
}

/* ============================================================
   LIGHT ANALYZER CALLBACK
   ============================================================ */
function onLightAnalysisUpdate(condition, brightness) {
  STATE.cv.lightCondition = condition;
  STATE.cv.brightness     = brightness;
  const pct = Math.round(brightness * 100);
  const g   = (id) => document.getElementById(id);
  if (g("cvBrightness"))      g("cvBrightness").textContent      = `${pct}%`;
  if (g("cvBrightnessLabel")) g("cvBrightnessLabel").textContent = `${pct}%`;
  if (g("cvBrightnessBar"))   g("cvBrightnessBar").style.width   = pct + "%";
  const condMap = { dark: "Gelap", normal: "Normal", bright: "Terang" };
  if (g("cvLightCondition"))  g("cvLightCondition").textContent  = condMap[condition] || condition;
}

/* ============================================================
   SYNC: Server → STATE (Real-Time Polling)
   ============================================================ */
async function syncDevicesFromServer() {
  const data = await apiPost('get_devices');
  if (!data || !Array.isArray(data)) return;
  const newIds = data.map(d => String(d.id));
  Object.keys(STATE.devices).forEach(id => {
    if (!newIds.includes(String(id))) {
      delete STATE.devices[id];
      delete STATE.deviceStates[id];
      delete STATE.deviceTopics[id];
    }
  });
  data.forEach(d => {
    const id = String(d.id);
    const isNew = !STATE.devices[id];
    STATE.devices[id] = { ...(STATE.devices[id] || {}), ...d, id };
    if (STATE.deviceStates[id] === undefined)
      STATE.deviceStates[id] = Boolean(Number(d.last_state ?? 0));
    else
      STATE.deviceStates[id] = Boolean(Number(d.last_state ?? d.latest_state ?? (STATE.deviceStates[id] ? 1 : 0)));
    STATE.deviceTopics[id] = { sub: d.topic_sub || "", pub: d.topic_pub || "" };
    if (isNew && STATE.mqtt.connected && d.topic_sub) {
      try { STATE.mqtt.client.subscribe(d.topic_sub); } catch(e) { console.warn("MQTT Re-sub:", e); }
    }
  });
  if (typeof renderDevices === 'function') renderDevices();
  if (typeof renderQuickControls === 'function') renderQuickControls();
  if (typeof renderScheduleDeviceOptions === 'function') renderScheduleDeviceOptions();
  updateDashboardStats();
}

async function syncSensorsFromServer() {
  const data = await apiPost('get_sensors');
  if (!data || !Array.isArray(data)) return;
  const newIds = data.map(s => String(s.id));
  Object.keys(STATE.sensors).forEach(id => {
    if (!newIds.includes(String(id))) {
      delete STATE.sensors[id];
      delete STATE.sensorData[id];
      delete STATE.sensorHistory[id];
    }
  });
  data.forEach(s => {
    const id = String(s.id);
    const isNew = !STATE.sensors[id];
    STATE.sensors[id] = { ...(STATE.sensors[id] || {}), ...s, id };
    if (isNew) {
      STATE.sensorData[id] = s.latest_value ?? null;
      STATE.sensorHistory[id] = [];
      if (STATE.mqtt.connected && s.topic) {
        try { STATE.mqtt.client.subscribe(s.topic); } catch(e) {}
      }
    } else {
      STATE.sensorData[id] = s.latest_value ?? STATE.sensorData[id] ?? null;
    }
  });
  if (typeof renderSensors === 'function') renderSensors();
  updateDashboardStats();
}

async function syncAutomationFromServer() {
  if (typeof initAutomationRules === 'function') await initAutomationRules();
  const automationView = document.getElementById("automation");
  if (typeof renderAutomationView === 'function' && automationView && !automationView.classList.contains("hidden")) {
    renderAutomationView();
  }
}

function scheduleNextSync(delayMs = null) {
  if (STATE.sync.timer) {
    clearTimeout(STATE.sync.timer);
  }

  const failureDelay = STATE.sync.failureCount > 0
    ? Math.min(
        CONFIG.app.liveSyncInterval * Math.pow(2, STATE.sync.failureCount),
        CONFIG.app.syncBackoffMax
      )
    : CONFIG.app.liveSyncInterval;

  const nextDelay = delayMs ?? failureDelay;
  STATE.sync.timer = setTimeout(() => {
    syncAllFromServer().catch(() => {});
  }, nextDelay);
}

async function syncAllFromServer(forceSync = false, options = {}) {
  if (typeof document !== "undefined" && document.hidden && !forceSync) return;
  if (syncAllFromServer._inFlight && !forceSync) return;
  syncAllFromServer._inFlight = true;
  try {
    const now = Date.now();
    const includeAnalytics = forceSync
      || !!options.includeAnalytics
      || (now - (STATE.sync.lastAnalyticsSyncAt || 0)) >= CONFIG.app.analyticsSyncInterval;
    const includeCameraSettings = forceSync
      || !!options.includeCameraSettings
      || (now - (STATE.sync.lastCameraSettingsAt || 0)) >= CONFIG.app.cameraSettingsSyncInterval;
    const requestBody = {
      include_analytics: includeAnalytics ? 1 : 0,
      include_camera: 1,
      include_camera_settings: includeCameraSettings ? 1 : 0,
    };
    const res = await apiPost("get_dashboard_data", requestBody);
    if (!res || !res.success) return;
    STATE.sync.failureCount = 0;

    const currentDeviceIds = Object.keys(STATE.devices);
    const serverDeviceIds  = (res.devices || []).map(d => String(d.id));
    const currentSensorIds = Object.keys(STATE.sensors);
    const serverSensorIds  = (res.sensors || []).map(s => String(s.id));

    const hasStructureChanged =
      currentDeviceIds.length !== serverDeviceIds.length ||
      currentSensorIds.length !== serverSensorIds.length ||
      !currentDeviceIds.every(id => serverDeviceIds.includes(id)) ||
      !currentSensorIds.every(id => serverSensorIds.includes(id));

    if (hasStructureChanged) {
      await syncDevicesFromServer();
      await syncSensorsFromServer();
      await syncAutomationFromServer();
      return;
    }

    if (res.devices) {
      let shouldRenderDevices = false;
      res.devices.forEach(d => {
        const id = String(d.id);
        if (!STATE.devices[id]) return;
        const before = STATE.devices[id];
        STATE.devices[id] = { ...before, ...d, id };
        if (
          before.name !== STATE.devices[id].name ||
          before.icon !== STATE.devices[id].icon ||
          before.type !== STATE.devices[id].type ||
          before.template_name !== STATE.devices[id].template_name ||
          before.topic_sub !== STATE.devices[id].topic_sub ||
          before.topic_pub !== STATE.devices[id].topic_pub
        ) {
          shouldRenderDevices = true;
        }
        const oldState = STATE.deviceStates[id];
        const newState = Boolean(Number(d.last_state ?? d.latest_state ?? 0));
        if (oldState !== newState) {
          if (STATE.deviceUpdating && STATE.deviceUpdating[id]) return; // Cegah Race-Condition UI Berkedip
          STATE.deviceStates[id] = newState;
          if (typeof updateDeviceUI === 'function') updateDeviceUI(id);
        }
      });
      if (shouldRenderDevices) {
        if (typeof renderDevices === 'function') renderDevices();
        if (typeof renderQuickControls === 'function') renderQuickControls();
        if (typeof renderScheduleDeviceOptions === 'function') renderScheduleDeviceOptions();
      }
    }

    if (res.sensors) {
      let shouldRenderSensors = false;
      res.sensors.forEach(s => {
        const id = String(s.id);
        if (STATE.sensors[id]) {
          const before = STATE.sensors[id];
          const prevValue = STATE.sensorData[id];
          STATE.sensors[id] = { ...before, ...s, id };
          const nextValue = s.latest_value ?? prevValue ?? null;
          STATE.sensorData[id] = nextValue;

          if (
            before.name !== STATE.sensors[id].name ||
            before.icon !== STATE.sensors[id].icon ||
            before.type !== STATE.sensors[id].type ||
            before.unit !== STATE.sensors[id].unit ||
            before.device_name !== STATE.sensors[id].device_name ||
            before.template_name !== STATE.sensors[id].template_name
          ) {
            shouldRenderSensors = true;
            return;
          }

          if ((prevValue ?? null) !== nextValue || before.last_seen !== STATE.sensors[id].last_seen) {
            if (typeof updateSensorValueUI === 'function') updateSensorValueUI(id);
          }
        }
      });
      if (shouldRenderSensors && typeof renderSensors === 'function') renderSensors();
    }

    if (res.cv_state && !CV.detecting) {
      STATE.cv.personCount    = res.cv_state.person_count || 0;
      STATE.cv.brightness     = res.cv_state.brightness   || 0;
      STATE.cv.lightCondition = res.cv_state.light_condition || 'unknown';
    }

    if (res.camera) {
      STATE.camera.defaultMeta = res.camera;
    }
    if (res.camera_settings) {
      STATE.camera.settings = res.camera_settings;
      STATE.sync.lastCameraSettingsAt = now;
    }
    if (res.analytics_summary) {
      STATE.analytics = { ...(STATE.analytics || {}), summary: res.analytics_summary };
      STATE.sync.lastAnalyticsSyncAt = now;
      if (typeof updateLogStats === 'function') updateLogStats();
    }

    updateDashboardStats();
  } catch (e) {
    STATE.sync.failureCount += 1;
    console.warn("syncAllFromServer Error:", e);
  } finally {
    syncAllFromServer._inFlight = false;
    if (typeof document === "undefined" || !document.hidden) {
      scheduleNextSync();
    }
  }
}

/* ============================================================
   RENDER ALL & DASHBOARD STATS
   ============================================================ */
function renderAll() {
  if (typeof renderDevices     === 'function') renderDevices();
  if (typeof renderSensors     === 'function') renderSensors();
  if (typeof renderQuickControls === 'function') renderQuickControls();
  const automationView = document.getElementById("automation");
  if (typeof renderAutomationView === 'function' && automationView && !automationView.classList.contains("hidden")) {
    renderAutomationView();
  }
  updateDashboardStats();
}

function updateDashboardStats() {
  const totalDev  = Object.keys(STATE.devices).length;
  const activeDev = Object.values(STATE.deviceStates).filter(Boolean).length;
  const totalSen  = Object.keys(STATE.sensors).length;
  const activeSen = Object.values(STATE.sensorData).filter(v => v !== null && v !== undefined).length;
  const g = (id) => document.getElementById(id);
  if (g("statActiveDevicesVal")) g("statActiveDevicesVal").textContent = activeDev;
  if (g("statActiveDevicesSub")) g("statActiveDevicesSub").textContent = `dari ${totalDev}`;
  if (g("statSensorsOnlineVal")) g("statSensorsOnlineVal").textContent = activeSen;
  if (g("statSensorsOnlineSub")) g("statSensorsOnlineSub").textContent = `dari ${totalSen}`;
  if (g("navDeviceCount"))       g("navDeviceCount").textContent       = totalDev;
  if (g("navSensorCount"))       g("navSensorCount").textContent       = totalSen;
  if (g("totalDevices"))         g("totalDevices").textContent         = totalDev;
  if (g("totalSensors"))         g("totalSensors").textContent         = totalSen;
  if (g("statMqttVal"))          g("statMqttVal").textContent          = STATE.mqtt.connected ? "Online" : "Offline";
  if (g("statMqttSub"))          g("statMqttSub").textContent          = (typeof PHP_SETTINGS !== 'undefined' && PHP_SETTINGS.mqtt_broker) || "—";
  if (g("cvPersonCountBig"))     g("cvPersonCountBig").textContent     = STATE.cv.personCount;
}

/* ============================================================
   LOAD DATA AWAL DARI PHP (diinjeksi oleh footer.php)
   ============================================================ */
function loadFromPHP() {
  try {
    // Quick Control Devices
    if (typeof PHP_SETTINGS !== 'undefined') {
      const qc = PHP_SETTINGS.quick_control_devices;
      STATE.quickControlDevices = Array.isArray(qc)
        ? qc.map(String)
        : typeof qc === "string" ? JSON.parse(qc || "[]").map(String) : [];

      // CV Config dari DB
      if (PHP_SETTINGS.cv_config && typeof PHP_SETTINGS.cv_config === 'object') {
        if (typeof CV_CONFIG !== 'undefined') Object.assign(CV_CONFIG, PHP_SETTINGS.cv_config);
        if (PHP_SETTINGS.cv_config.detection?.minConfidence) CV.confidence = PHP_SETTINGS.cv_config.detection.minConfidence;
      }
      if (PHP_SETTINGS.cv_rules && typeof PHP_SETTINGS.cv_rules === 'object') {
        CV.cvRules = PHP_SETTINGS.cv_rules;
        if (typeof automationEngine !== 'undefined') automationEngine.updateCVRules(CV.cvRules);
      }
    }

    // Perangkat
    if (typeof PHP_DEVICES !== "undefined") {
      PHP_DEVICES.forEach((d) => {
        const id = String(d.id);
        STATE.devices[id]      = { ...d, id };
        STATE.deviceStates[id] = Boolean(Number(d.last_state ?? d.latest_state ?? 0));
        STATE.deviceTopics[id] = { sub: d.topic_sub || "", pub: d.topic_pub || "" };
        STATE.deviceExtras[id] = { fanSpeed: 50, acMode: "cool", acTemp: 24, brightness: 100, volume: 60 };
      });
    }

    // Sensor
    if (typeof PHP_SENSORS !== "undefined") {
      PHP_SENSORS.forEach((s) => {
        const id = String(s.id);
        STATE.sensors[id]       = { ...s, id };
        STATE.sensorData[id]    = s.latest_value ?? null;
        STATE.sensorHistory[id] = [];
      });
    }

    if (typeof PHP_CAMERA !== 'undefined') {
      STATE.camera.defaultMeta = PHP_CAMERA || null;
    }
    if (typeof PHP_CAMERA_SETTINGS !== 'undefined') {
      STATE.camera.settings = PHP_CAMERA_SETTINGS || {};
    }

    STATE.cvAutoStartRequested = !!(typeof PHP_CV_STATE !== 'undefined' && PHP_CV_STATE && Number(PHP_CV_STATE.is_active) === 1);
  } catch (e) {
    console.warn("loadFromPHP error:", e);
    STATE.quickControlDevices = [];
  }
}

function revealMainApp() {
  const ls  = document.getElementById("appLoadingScreen");
  const app = document.getElementById("mainApp");
  if (app) app.classList.remove("opacity-0");
  if (ls) {
    ls.style.opacity = "0";
    setTimeout(() => { ls.style.display = "none"; }, 220);
  }
  const aiBtn = document.getElementById("aiChatBtn");
  if (aiBtn) aiBtn.classList.add("show");
}

async function bootstrapDeferredServices() {
  try {
    if (typeof ensureDeviceTemplatesLoaded === "function") ensureDeviceTemplatesLoaded().catch(() => {});
    if (typeof ensureSensorTemplatesLoaded === "function") ensureSensorTemplatesLoaded().catch(() => {});
    if (typeof ensureSchedulesLoaded === "function") ensureSchedulesLoaded().catch(() => {});
    if (typeof loadMQTTTemplates === "function") loadMQTTTemplates();

    await Promise.allSettled([
      typeof loadCVConfig === "function" ? loadCVConfig() : Promise.resolve(),
      typeof initAutomationRules === "function" ? initAutomationRules() : Promise.resolve(),
    ]);

    if (typeof automationEngine !== "undefined") automationEngine.initialize();
    else if (typeof loadCVRules === "function") loadCVRules().catch(() => {});

    if (STATE.cvAutoStartRequested && typeof initializeCV === "function" && !CV.detecting && !CV.modelLoading) {
      const runAutoCV = () => {
        initializeCV()
          .then(() => { if (typeof startCVDetection === "function") startCVDetection(); })
          .catch(() => {});
      };
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(runAutoCV, { timeout: 2000 });
      } else {
        setTimeout(runAutoCV, 900);
      }
    }

    syncAllFromServer(true).catch(() => {});

    setTimeout(() => {
      if (typeof PHP_SETTINGS !== 'undefined' && PHP_SETTINGS.mqtt_broker) {
        if (typeof connectMQTT === 'function') connectMQTT();
      }
    }, 150);
  } catch (e) {
    console.warn("bootstrapDeferredServices error:", e);
  }
}

/* ============================================================
   DOMContentLoaded — BOOTSTRAP UTAMA
   ============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
  // Ekspor ke window agar modul bisa akses
  window.STATE = STATE;
  window.CV    = CV;

  initTheme();
  initClock();         // navigation.js
  initUptimeCounter(); // navigation.js

  loadFromPHP();
  renderAll();
  revealMainApp();

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        syncAllFromServer(true, { includeAnalytics: true, includeCameraSettings: true }).catch(() => {});
      }
    });
  }

  // Hook light analyzer ke automation engine
  if (typeof lightAnalyzer !== "undefined") {
    lightAnalyzer.setCallbacks({
      _tag: "app",
      onLightChange: (condition, brightness) => {
        if (typeof automationEngine !== "undefined") automationEngine.notifyLight(condition, brightness);
      },
    });
  }

  bootstrapDeferredServices();
  scheduleNextSync(CONFIG.app.liveSyncInterval);
});
