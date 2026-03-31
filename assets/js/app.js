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
    liveSyncInterval: 900,
    fullSyncInterval: 2200,
    mqttLiveSyncInterval: 1600,
    analyticsSyncInterval: 15000,
    cameraSettingsSyncInterval: 30000,
    syncBackoffMax: 12000,
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

function getVisibleViewIds() {
  if (typeof document === "undefined") return [];
  return Array.from(document.querySelectorAll(".view"))
    .filter((view) => !view.classList.contains("hidden"))
    .map((view) => view.id)
    .filter(Boolean);
}

function getSyncContext() {
  const visibleViews = getVisibleViewIds();
  const isDashboardView = visibleViews.includes("dashboard");
  const isCameraView = visibleViews.includes("camera");
  const isAnalyticsView = visibleViews.includes("analytics");
  const isSettingsView = visibleViews.includes("settings");

  return {
    visibleViews,
    isDashboardView,
    isCameraView,
    isAnalyticsView,
    isSettingsView,
    needsCameraState: isDashboardView || isCameraView || CV.detecting || STATE.camera.active || STATE.cvAutoStartRequested,
    needsCameraSettings: isCameraView || isSettingsView,
    needsAnalytics: isAnalyticsView,
  };
}

function getAdaptiveSyncDelay() {
  const syncContext = getSyncContext();
  if (syncContext.isCameraView || CV.detecting || STATE.camera.active) {
    return CONFIG.app.liveSyncInterval;
  }
  if (syncContext.isDashboardView && !STATE.mqtt.connected) {
    return CONFIG.app.liveSyncInterval;
  }
  if (STATE.mqtt.connected) {
    return CONFIG.app.mqttLiveSyncInterval;
  }
  return CONFIG.app.fullSyncInterval;
}


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
const ACTIVE_REQ = {};
async function apiPost(action, data = {}, opts = {}) {
  const key = opts.key || action;
  const noAutoRefreshActions = new Set([
    "update_sensor_value",
    "update_device_state",
    "update_cv_state",
    "ai_chat_fast_track",
  ]);
  try {
    if (ACTIVE_REQ[key]) {
      try { ACTIVE_REQ[key].abort(); } catch (_) {}
    }
    const controller = new AbortController();
    ACTIVE_REQ[key] = controller;
    const base = (typeof APP_BASE !== "undefined" ? APP_BASE.replace(/\/$/, "") : "") + "/api/index.php";
    const hdrs = { "Content-Type": "application/json" };
    if (typeof CSRF_TOKEN !== "undefined") hdrs["X-CSRF-Token"] = CSRF_TOKEN;
    const timeoutMs = opts.timeout || 8000;
    const t = setTimeout(() => { try { controller.abort(); } catch(_) {} }, timeoutMs);
    const res = await fetch(`${base}?action=${action}`, {
      method: "POST",
      headers: hdrs,
      credentials: "include",
      body: JSON.stringify(data),
      signal: controller.signal
    });
    clearTimeout(t);
    delete ACTIVE_REQ[key];
    if (res.status === 401) {
      window.location.href = (typeof APP_BASE !== "undefined" ? APP_BASE : "") + "/?route=login&expired=true";
      return null;
    }
    if (res.status === 403) {
      showToast("Access Denied (403)", "error");
      return null;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await res.text();
      return { success: false, error: "Server tidak mengirimkan JSON yang valid.", raw: text };
    }
    const json = await res.json();
    const isMut = opts.refresh === true || (/^(add_|update_|delete_|toggle_|save_|clear_)/.test(action) && !noAutoRefreshActions.has(action));
    if (json && json.success !== false && typeof syncAllFromServer === "function" && isMut) {
      setTimeout(() => { try { syncAllFromServer(true); } catch(_) {} }, 0);
    }
    return json;
  } catch (e) {
    if (e.name !== "AbortError") showToast(`API error: ${action}`, "error");
    return { success: false, error: e.message };
  } finally {
    if (ACTIVE_REQ[key]) delete ACTIVE_REQ[key];
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
  if (typeof Overview !== "undefined" && typeof Overview.updateDashboardRoomSummary === "function") {
    Overview.updateDashboardRoomSummary();
  }
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
  if (typeof Overview !== "undefined" && typeof Overview.updateDashboardRoomSummary === "function") {
    Overview.updateDashboardRoomSummary();
  }
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
      delete STATE.deviceOnAt[id];
      delete STATE.deviceExtras[id];
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
    if (STATE.deviceStates[id] && !STATE.deviceOnAt[id]) {
      STATE.deviceOnAt[id] = Date.now();
    } else if (!STATE.deviceStates[id]) {
      delete STATE.deviceOnAt[id];
    }
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
  if (typeof Overview !== "undefined" && typeof Overview.initChartSelect === "function") {
    Overview.initChartSelect();
  }
  updateDashboardStats();
}

async function syncAutomationFromServer() {
  if (typeof initAutomationRules === 'function') await initAutomationRules();
  const automationView = document.getElementById("automation");
  if (typeof renderAutomationView === 'function' && automationView && !automationView.classList.contains("hidden")) {
    renderAutomationView();
  }
}

function replaceDevicesFromSnapshot(data) {
  if (!Array.isArray(data)) return;
  const nextIds = new Set(data.map((device) => String(device.id)));

  Object.keys(STATE.devices).forEach((id) => {
    if (!nextIds.has(String(id))) {
      delete STATE.devices[id];
      delete STATE.deviceStates[id];
      delete STATE.deviceTopics[id];
      delete STATE.deviceOnAt[id];
      delete STATE.deviceExtras[id];
    }
  });

  data.forEach((device) => {
    const id = String(device.id);
    const isNew = !STATE.devices[id];
    STATE.devices[id] = { ...(STATE.devices[id] || {}), ...device, id };
    STATE.deviceStates[id] = Boolean(Number(device.last_state ?? device.latest_state ?? 0));
    STATE.deviceTopics[id] = { sub: device.topic_sub || "", pub: device.topic_pub || "" };

    if (STATE.deviceStates[id] && !STATE.deviceOnAt[id]) {
      STATE.deviceOnAt[id] = Date.now();
    } else if (!STATE.deviceStates[id]) {
      delete STATE.deviceOnAt[id];
    }

    if (!STATE.deviceExtras[id]) {
      STATE.deviceExtras[id] = { fanSpeed: 50, acMode: "cool", acTemp: 24, brightness: 100, volume: 60 };
    }

    if (isNew && STATE.mqtt.connected && device.topic_sub) {
      try { STATE.mqtt.client.subscribe(device.topic_sub); } catch (_) {}
    }
  });

  if (typeof renderDevices === "function") renderDevices();
  if (typeof renderQuickControls === "function") renderQuickControls();
  if (typeof renderScheduleDeviceOptions === "function") renderScheduleDeviceOptions();
}

function replaceSensorsFromSnapshot(data) {
  if (!Array.isArray(data)) return;
  const nextIds = new Set(data.map((sensor) => String(sensor.id)));

  Object.keys(STATE.sensors).forEach((id) => {
    if (!nextIds.has(String(id))) {
      delete STATE.sensors[id];
      delete STATE.sensorData[id];
      delete STATE.sensorHistory[id];
    }
  });

  data.forEach((sensor) => {
    const id = String(sensor.id);
    const isNew = !STATE.sensors[id];
    STATE.sensors[id] = { ...(STATE.sensors[id] || {}), ...sensor, id };
    STATE.sensorData[id] = sensor.latest_value ?? STATE.sensorData[id] ?? null;
    if (!STATE.sensorHistory[id]) STATE.sensorHistory[id] = [];

    if (isNew && STATE.mqtt.connected && sensor.topic) {
      try { STATE.mqtt.client.subscribe(sensor.topic); } catch (_) {}
    }
  });

  if (typeof renderSensors === "function") renderSensors();
  if (typeof Overview !== "undefined" && typeof Overview.initChartSelect === "function") {
    Overview.initChartSelect();
  }
}

function scheduleNextSync(delayMs = null) {
  if (STATE.sync.timer) {
    clearTimeout(STATE.sync.timer);
  }

  const baseDelay = delayMs ?? getAdaptiveSyncDelay();
  const nextDelay = STATE.sync.failureCount > 0
    ? Math.min(
        baseDelay * Math.pow(2, STATE.sync.failureCount),
        CONFIG.app.syncBackoffMax
      )
    : baseDelay;
  STATE.sync.timer = setTimeout(() => {
    syncAllFromServer().catch(() => {});
  }, nextDelay);
}

/**
 * Sinkronisasi data utama dari server (Stale-While-Revalidate)
 */
async function syncAllFromServer(forceSync = false, options = {}) {
  const cacheKey = "iotzy_cache_main_sync";
  
  // 1. Ambil dari cache dulu untuk responsivitas instan
  if (typeof PerformanceOptimizer !== "undefined" && PerformanceOptimizer.Cache) {
    const cached = PerformanceOptimizer.Cache.get(cacheKey);
    if (cached) {
      applySyncData(cached);
    }
  }

  if (typeof document !== "undefined" && document.hidden && !forceSync) return;
  if (syncAllFromServer._inFlight && !forceSync) return;
  syncAllFromServer._inFlight = true;

  try {
    const now = Date.now();
    const syncContext = getSyncContext();
    const includeAnalytics = !!options.includeAnalytics
      || (syncContext.needsAnalytics
        && (forceSync || (now - (STATE.sync.lastAnalyticsSyncAt || 0)) >= CONFIG.app.analyticsSyncInterval));
    const includeCameraSettings = !!options.includeCameraSettings
      || (syncContext.needsCameraSettings
        && (forceSync || (now - (STATE.sync.lastCameraSettingsAt || 0)) >= CONFIG.app.cameraSettingsSyncInterval));
    const includeCamera = !!options.includeCamera || syncContext.needsCameraState;

    const requestBody = {
      include_analytics: includeAnalytics ? 1 : 0,
      include_camera: includeCamera ? 1 : 0,
      include_camera_settings: includeCameraSettings ? 1 : 0,
    };

    const res = await apiPost("get_dashboard_data", requestBody);
    if (res && res.success) {
      if (typeof PerformanceOptimizer !== "undefined" && PerformanceOptimizer.Cache) {
        PerformanceOptimizer.Cache.set(cacheKey, res);
      }
      applySyncData(res, now);
    }
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

/**
 * Menerapkan data hasil sinkronisasi ke UI dan STATE
 */
async function applySyncData(res, timestamp = Date.now()) {
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
    replaceDevicesFromSnapshot(res.devices || []);
    replaceSensorsFromSnapshot(res.sensors || []);
    await syncAutomationFromServer();
  } else if (res.devices) {
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
        if (STATE.deviceUpdating && STATE.deviceUpdating[id]) return;
        STATE.deviceStates[id] = newState;
        if (newState && !STATE.deviceOnAt[id]) {
          STATE.deviceOnAt[id] = Date.now();
        }
        if (!newState) {
          delete STATE.deviceOnAt[id];
        }
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
    if (shouldRenderSensors && typeof Overview !== "undefined" && typeof Overview.initChartSelect === "function") {
      Overview.initChartSelect();
    }
  }

  if (res.cv_state && !CV.detecting) {
    STATE.cv.personCount    = res.cv_state.person_count || 0;
    STATE.cv.brightness     = res.cv_state.brightness   || 0;
    STATE.cv.lightCondition = res.cv_state.light_condition || 'unknown';
    if (typeof Overview !== "undefined" && typeof Overview.updateDashboardRoomSummary === "function") {
      Overview.updateDashboardRoomSummary();
    }
  }

  if (res.camera) {
    STATE.camera.defaultMeta = res.camera;
  }
  if (res.camera_settings) {
    STATE.camera.settings = res.camera_settings;
    STATE.sync.lastCameraSettingsAt = timestamp;
  }
  if (res.analytics_summary) {
    STATE.analytics = { ...(STATE.analytics || {}), summary: res.analytics_summary };
    STATE.sync.lastAnalyticsSyncAt = timestamp;
    if (typeof updateLogStats === 'function') updateLogStats();
  }

  STATE.sync.lastFullSyncAt = timestamp;
  updateDashboardStats();
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
        const syncContext = getSyncContext();
        syncAllFromServer(true, {
          includeAnalytics: syncContext.needsAnalytics,
          includeCamera: syncContext.needsCameraState,
          includeCameraSettings: syncContext.needsCameraSettings,
        }).catch(() => {});
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
  scheduleNextSync();
});
