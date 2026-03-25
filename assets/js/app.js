/**
 * assets/js/app.js
 * ───
 * Orchestrator Utama Frontend IoTzy.
 * Mengelola state global aplikasi, sinkronisasi real-time dengan server,
 * inisialisasi modul UI (Devices, Sensors, Automation), dan integrasi AI.
 */

const CONFIG = {
  mqtt: {
    broker:         "broker.hivemq.com",
    port:           8884,
    path:           "/mqtt",
    maxReconnect:   5,
    reconnectDelay: 3000,
  },
  app: { maxLogs: 500, updateInterval: 1000 },
};

/**
 * ==================================================================================
 * STATE APLIKASI (STATE)
 * ====================
 * Penyimpanan lokal untuk semua data perangkat, sensor, log, dan status sistem
 * yang sedang berjalan (Reactive-like state management).
 */
const STATE = {
  devices:             {},
  deviceStates:        {},
  deviceTopics:        {},
  deviceOnAt:          {},
  deviceExtras:        {},
  sensors:             {},
  sensorData:          {},
  sensorHistory:       {},
  automationRules:     {},
  logs:                [],
  logFilter:           "",
  logTypeFilter:       "all",
  quickControlDevices: [],
  mqtt: { client: null, connected: false, reconnectAttempts: 0, templates: [] },
  camera: {
    stream:           null,
    active:           false,
    selectedDeviceId: null,
    availableDevices: [],
  },
  sessionStart: (function() {
    const saved = sessionStorage.getItem('iotzy-session-start');
    if (saved) return parseInt(saved);
    const now = Date.now();
    sessionStorage.setItem('iotzy-session-start', now);
    return now;
  })(),
  cv: {
    personCount:    0,
    personPresent:  false,
    lightCondition: "unknown",
    brightness:     0,
  },
};

/**
 * ==================================================================================
 * KONFIGURASI COMPUTER VISION (CV)
 * ==================================================================================
 * Parameter operasional untuk modul deteksi objek berbasis AI.
 */
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

/* ==================== UTILS ==================== */
function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* ==================== TOAST ==================== */
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

/* ==================== THEME TOGGLE ==================== */
function initTheme() {
  const saved = localStorage.getItem('iotzy-theme') || (typeof PHP_SETTINGS !== 'undefined' ? PHP_SETTINGS.theme : null) || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('iotzy-theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;
  const icon = btn.querySelector('i');
  if (!icon) return;
  icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

/* ==================== MODALS ==================== */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove("show");
    document.body.style.overflow = "";
  }
}

/* ==================== API POST ==================== */
async function apiPost(action, data = {}) {
  try {
    const base = (typeof APP_BASE !== "undefined" ? APP_BASE.replace(/\/$/, "") : "") + "/api/router.php";
    const hdrs = { "Content-Type": "application/json" };
    if (typeof CSRF_TOKEN !== "undefined") hdrs["X-CSRF-Token"] = CSRF_TOKEN;
    
    const res  = await fetch(`${base}?action=${action}`, {
      method:  "POST",
      headers: hdrs,
      credentials: "include", 
      body:    JSON.stringify(data),
    });

    if (res.status === 401) {
      window.location.href = (typeof APP_BASE !== "undefined" ? APP_BASE : "") + "/?route=login&expired=true";
      return null;
    }
    if (res.status === 403) {
      showToast("Access Denied (403)", "error");
      return null;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    if (e.name !== 'AbortError') {
       showToast(`API error: ${action}`, "error");
    }
    return null;
  }
}

/**
 * Sinkronisasi daftar perangkat dari server ke state lokal.
 */
async function syncDevicesFromServer() {
  const data = await apiPost('get_devices');
  if (data && Array.isArray(data)) {
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
      STATE.devices[id] = { ...d, id };
      if (STATE.deviceStates[id] === undefined) {
        STATE.deviceStates[id] = Boolean(Number(d.last_state ?? 0));
      }
      STATE.deviceTopics[id] = { sub: d.topic_sub || "", pub: d.topic_pub || "" };
      
      if (isNew && STATE.mqtt.connected && d.topic_sub) {
        try { STATE.mqtt.client.subscribe(d.topic_sub); } catch(e) {}
      }
    });
    renderAll();
  }
}

/**
 * Sinkronisasi daftar sensor dari server ke state lokal.
 */
async function syncSensorsFromServer() {
  const data = await apiPost('get_sensors');
  if (data && Array.isArray(data)) {
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
      STATE.sensors[id] = { ...s, id };
      if (isNew) {
        STATE.sensorData[id] = null;
        STATE.sensorHistory[id] = [];
        if (STATE.mqtt.connected && s.topic) {
          try { STATE.mqtt.client.subscribe(s.topic); } catch(e) {}
        }
      }
    });
    renderAll();
  }
}

/**
 * Sinkronisasi aturan otomasi dari server.
 */
async function syncAutomationFromServer() {
  await initAutomationRules();
  renderAutomationView();
}

/**
 * Sinkronisasi konfigurasi CV dari server.
 */
async function syncCVConfigFromServer() {
  await loadCVConfig();
  await loadCVRules();
  
  if (document.getElementById("cvConfidenceThreshold")) {
    document.getElementById("cvConfidenceThreshold").value = Math.round(CV.confidence * 100);
  }
  if (document.getElementById("cvShowBoundingBoxCamera")) {
    document.getElementById("cvShowBoundingBoxCamera").checked = CV.showBoxes;
  }
  if (document.getElementById("cvShowDebugInfoCamera")) {
    document.getElementById("cvShowDebugInfoCamera").checked = CV.showDebug;
  }
  
  if (typeof automationEngine !== 'undefined') {
    automationEngine.updateCVRules(CV.cvRules);
  }
}

/* ==================== INIT ==================== */
document.addEventListener("DOMContentLoaded", async () => {
  const currentVersion = typeof PHP_SETTINGS !== 'undefined' ? (PHP_SETTINGS.app_version || '7.0.6') : '7.0.6';
  
  initTheme();
  initClock();
  
  await loadCVConfig();
  loadFromPHP();
  window.STATE = STATE;
  window.CV    = CV;

  await initAutomationRules();
  if (typeof automationEngine !== 'undefined' && automationEngine.initialize) {
    automationEngine.initialize();
  }
  await loadCVRules();
  await loadLogs();
  renderAll();
  initUptimeCounter();
  loadMQTTTemplates();
  
  // Start Real-Time Sync Polling
  setInterval(syncAllFromServer, 3000);

  if (typeof cvUI !== "undefined" && typeof cvUI.initialize === "function") {
    cvUI.initialize();
  }

  if (typeof lightAnalyzer !== "undefined") {
    lightAnalyzer.setCallbacks({
      _tag: "app",
      onLightChange: (condition, brightness) => {
        if (typeof automationEngine !== "undefined") {
          automationEngine.notifyLight(condition, brightness);
        }
      },
    });
  }

  setTimeout(() => {
    if (typeof PHP_SETTINGS !== 'undefined' && PHP_SETTINGS.mqtt_broker && typeof connectMQTT === 'function') {
        connectMQTT();
    }
  }, 900);

  setTimeout(() => {
    const ls  = document.getElementById("appLoadingScreen");
    const app = document.getElementById("mainApp");
    if (ls) {
      ls.style.opacity = "0";
      setTimeout(() => (ls.style.display = "none"), 500);
    }
    if (app) app.classList.remove("opacity-0");
    const aiBtn = document.getElementById("aiChatBtn");
    if (aiBtn) aiBtn.classList.add("show");
  }, 1200);
});

function loadFromPHP() {
  try {
    if (typeof PHP_SETTINGS !== 'undefined') {
        const qc = PHP_SETTINGS.quick_control_devices;
        STATE.quickControlDevices = Array.isArray(qc)
          ? qc.map(String)
          : typeof qc === "string"
            ? JSON.parse(qc || "[]").map(String)
            : [];

        if (PHP_SETTINGS.cv_config && typeof PHP_SETTINGS.cv_config === 'object') {
           if (typeof CV_CONFIG !== 'undefined') {
               Object.assign(CV_CONFIG, PHP_SETTINGS.cv_config);
               if (CV_CONFIG.detection?.minConfidence) CV.confidence = CV_CONFIG.detection.minConfidence;
           }
        }
        if (PHP_SETTINGS.cv_rules && typeof PHP_SETTINGS.cv_rules === 'object') {
           CV.cvRules = PHP_SETTINGS.cv_rules;
           if (typeof automationEngine !== 'undefined' && automationEngine.updateCVRules) {
               automationEngine.updateCVRules(CV.cvRules);
           }
           
           if (typeof CV_CONFIG !== 'undefined') {
               if (PHP_SETTINGS.cv_min_confidence) CV_CONFIG.detection.minConfidence = parseFloat(PHP_SETTINGS.cv_min_confidence);
               if (PHP_SETTINGS.cv_dark_threshold) CV_CONFIG.light.darkThreshold = parseFloat(PHP_SETTINGS.cv_dark_threshold);
               if (PHP_SETTINGS.cv_bright_threshold) CV_CONFIG.light.brightThreshold = parseFloat(PHP_SETTINGS.cv_bright_threshold);
           }
           
           if (PHP_SETTINGS.cv_human_rules_enabled !== undefined) CV.cvRules.human.enabled = Number(PHP_SETTINGS.cv_human_rules_enabled) === 1;
           if (PHP_SETTINGS.cv_light_rules_enabled !== undefined) CV.cvRules.light.enabled = Number(PHP_SETTINGS.cv_light_rules_enabled) === 1;
        }
    }
    
    if (typeof PHP_CV_STATE !== 'undefined' && PHP_CV_STATE) {
       STATE.cv.personCount = PHP_CV_STATE.person_count || 0;
       STATE.cv.brightness = PHP_CV_STATE.brightness || 0;
       STATE.cv.lightCondition = PHP_CV_STATE.light_condition || 'unknown';
       
       if (Number(PHP_CV_STATE.is_active) === 1) {
          if (typeof initializeCV === 'function') initializeCV().then(() => { if (typeof startCVDetection === 'function') startCVDetection(); });
       }
    }
  } catch (e) {
    STATE.quickControlDevices = [];
  }

  if (typeof PHP_DEVICES !== "undefined") {
    PHP_DEVICES.forEach((d) => {
      const id = String(d.id);
      STATE.devices[id]      = { ...d, id };
      STATE.deviceStates[id] = Boolean(Number(d.last_state ?? d.latest_state ?? 0));
      STATE.deviceTopics[id] = { sub: d.topic_sub || "", pub: d.topic_pub || "" };
      STATE.deviceExtras[id] = { fanSpeed: 50, acMode: "cool", acTemp: 24, brightness: 100, volume: 60 };
    });
  }

  if (typeof PHP_SENSORS !== "undefined") {
    PHP_SENSORS.forEach((s) => {
      const id = String(s.id);
      STATE.sensors[id]        = { ...s, id };
      STATE.sensorData[id]     = null;
      STATE.sensorHistory[id]  = [];
    });
  }
}

/**
 * Sync data dari server untuk memastikan UI Real-Time
 */
async function syncAllFromServer() {
  if (syncAllFromServer._inFlight) return;
  syncAllFromServer._inFlight = true;
  try {
    const res = await apiPost("get_dashboard_data", {});
    if (!res || !res.success) return;

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
      res.devices.forEach(d => {
         const id = String(d.id);
         if (STATE.devices[id]) {
            const oldState = STATE.deviceStates[id];
            const newState = Boolean(Number(d.last_state ?? d.latest_state ?? 0));
            if (oldState !== newState) {
               STATE.deviceStates[id] = newState;
               if (typeof updateDeviceUI === 'function') updateDeviceUI(id);
            }
         }
      });
    }

    if (res.sensors) {
      res.sensors.forEach(s => {
         const id = String(s.id);
         if (STATE.sensors[id]) {
            STATE.sensorData[id] = s.latest_value;
         }
      });
      if (typeof renderSensors === 'function') renderSensors();
    }

    if (res.cv_state) {
       if (!CV.detecting) {
          STATE.cv.personCount = res.cv_state.person_count || 0;
          STATE.cv.brightness = res.cv_state.brightness || 0;
          STATE.cv.lightCondition = res.cv_state.light_condition || 'unknown';
       }
    }

    if (typeof updateDashboardStats === 'function') updateDashboardStats();
  } catch (e) {
  } finally {
    syncAllFromServer._inFlight = false;
  }
}

function renderAll() {
  if (typeof renderDevices === 'function') renderDevices();
  if (typeof renderSensors === 'function') renderSensors();
  if (typeof renderQuickControls === 'function') renderQuickControls();
  if (typeof renderAutomationView === 'function') renderAutomationView();
  if (typeof updateDashboardStats === 'function') updateDashboardStats();
}

/* ==================== STATS ==================== */
function updateDashboardStats() {
  const totalDev  = Object.keys(STATE.devices).length;
  const activeDev = Object.values(STATE.deviceStates).filter(Boolean).length;
  const totalSen  = Object.keys(STATE.sensors).length;
  const activeSen = Object.values(STATE.sensorData).filter((v) => v !== null && v !== undefined).length;
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
  if (typeof PHP_SETTINGS !== 'undefined' && g("statMqttSub")) g("statMqttSub").textContent = PHP_SETTINGS.mqtt_broker || "—";
  if (g("cvPersonCountBig"))     g("cvPersonCountBig").textContent     = STATE.cv.personCount;
}

/* ==================== AUTOMATION — SENSOR BASED ==================== */
const SENSOR_AUTO_META = {
  temperature: {
    icon: "fa-temperature-half", color: "var(--red)", bg: "var(--red-bg)", label: "Suhu", unit: "°C",
    conditions: [
      { key: "gt",    label: "Lebih dari (>)", defaultVal: 28 },
      { key: "lt",    label: "Kurang dari (<)", defaultVal: 24 },
      { key: "range", label: "Di luar rentang" },
    ],
    templates: [
      { name: "🌡️ Suhu Tinggi → Kipas Max",    condition: "gt", threshold: 28, action: "speed_high", targetIcon: "fa-wind"      },
      { name: "🌡️ Suhu Tinggi → AC ON",         condition: "gt", threshold: 28, action: "on",         targetIcon: "fa-snowflake" },
      { name: "🌡️ Suhu Normal → Kipas Lambat",  condition: "lt", threshold: 26, action: "speed_low",  targetIcon: "fa-wind"      },
      { name: "🌡️ Suhu Rendah → AC OFF",        condition: "lt", threshold: 24, action: "off",        targetIcon: "fa-snowflake" },
    ],
  },
  humidity:    { icon: "fa-droplet",              color: "var(--blue)",   bg: "var(--blue-bg)",   label: "Kelembaban",      unit: "%",    conditions: [{ key: "gt", label: "Lebih dari (>)", defaultVal: 75 }, { key: "lt", label: "Kurang dari (<)", defaultVal: 35 }, { key: "range", label: "Di luar rentang" }], templates: [{ name: "💧 Lembab > 75% → AC Dry", condition: "gt", threshold: 75, action: "on", targetIcon: "fa-snowflake" }, { name: "💧 Lembab > 80% → Kipas ON", condition: "gt", threshold: 80, action: "on", targetIcon: "fa-wind" }] },
  brightness:  { icon: "fa-sun",                  color: "var(--amber)",  bg: "var(--amber-bg)",  label: "Kecerahan",       unit: "",     conditions: [{ key: "lt", label: "Gelap (<)", defaultVal: 0.35 }, { key: "gt", label: "Terang (>)", defaultVal: 0.65 }], templates: [{ name: "🌙 Gelap → Lampu ON", condition: "lt", threshold: 0.35, action: "on", targetIcon: "fa-lightbulb" }, { name: "☀️ Terang → Lampu OFF", condition: "gt", threshold: 0.65, action: "off", targetIcon: "fa-lightbulb" }] },
  presence:    { icon: "fa-user-check",            color: "var(--green)",  bg: "var(--green-bg)",  label: "Kehadiran",       unit: "",     conditions: [{ key: "detected", label: "Terdeteksi" }, { key: "absent", label: "Tidak Ada" }], templates: [{ name: "👤 Ada Orang → Lampu ON", condition: "detected", action: "on", targetIcon: "fa-lightbulb" }, { name: "👤 Tidak Ada → Semua OFF", condition: "absent", action: "off", targetIcon: "fa-lightbulb" }] },
  motion:      { icon: "fa-person-running",        color: "var(--purple)", bg: "var(--purple-bg)", label: "Gerakan",         unit: "",     conditions: [{ key: "detected", label: "Ada Gerakan" }, { key: "absent", label: "Tidak Ada Gerakan" }], templates: [{ name: "🏃 Gerakan → Lampu ON", condition: "detected", action: "on", targetIcon: "fa-lightbulb" }, { name: "🏃 Tidak Ada → Lampu OFF", condition: "absent", action: "off", targetIcon: "fa-lightbulb" }] },
  air_quality: { icon: "fa-wind",                  color: "var(--teal)",   bg: "var(--teal-bg)",   label: "Kualitas Udara",  unit: "AQI",  conditions: [{ key: "gt", label: "Lebih dari (>)", defaultVal: 150 }, { key: "lt", label: "Kurang dari (<)", defaultVal: 50 }], templates: [{ name: "💨 Buruk >150 → Kipas ON", condition: "gt", threshold: 150, action: "on", targetIcon: "fa-wind" }, { name: "💨 Bahaya >200 → Alarm ON", condition: "gt", threshold: 200, action: "on", targetIcon: "fa-volume-up" }] },
  smoke:       { icon: "fa-fire",                  color: "var(--red)",    bg: "var(--red-bg)",    label: "Asap",            unit: "ppm",  conditions: [{ key: "gt", label: "Terdeteksi (>)", defaultVal: 50 }], templates: [{ name: "🔥 Asap > 50ppm → Alarm ON", condition: "gt", threshold: 50, action: "on", targetIcon: "fa-volume-up" }] },
  gas:         { icon: "fa-triangle-exclamation",  color: "var(--amber)",  bg: "var(--amber-bg)",  label: "Gas",             unit: "ppm",  conditions: [{ key: "gt", label: "Terdeteksi (>)", defaultVal: 200 }], templates: [{ name: "⚠️ Gas > 200ppm → Alarm ON", condition: "gt", threshold: 200, action: "on", targetIcon: "fa-volume-up" }] },
};

async function initAutomationRules() {
  if (!STATE.automationRules) STATE.automationRules = {};
  const result = await apiPost("get_automation_rules", {});
  if (result && typeof result === "object") {
    STATE.automationRules = result;
  }
}

function saveAutomationRules() {}

function checkAutomationRules() { }

function fireRule(sensorId, rule) { }

function getRulesForSensor(sensorId) {
  return STATE.automationRules[String(sensorId)] || [];
}

async function addAutomationRule(sensorId, rule) {
  const sid = sensorId ? parseInt(sensorId) : null;
  const result = await apiPost("add_automation_rule", {
    sensor_id:     sid,
    device_id:     parseInt(rule.deviceId),
    condition:     rule.condition,
    threshold:     rule.threshold,
    threshold_min: rule.thresholdMin,
    threshold_max: rule.thresholdMax,
    action:        rule.action,
    delay:         rule.delay || 0,
    start_time:    rule.startTime || null,
    end_time:      rule.endTime || null,
    from_template: rule.fromTemplate || null,
  });
  if (result?.success) {
    const key = sensorId ? String(sensorId) : ('device_' + rule.deviceId);
    if (!STATE.automationRules[key]) STATE.automationRules[key] = [];
    STATE.automationRules[key].push({
      ...rule,
      ruleId:    result.rule_id,
      dbId:      result.id,
      enabled:   true,
      lastFired: null,
    });
    if (typeof renderAutomationView === 'function') renderAutomationView();
    showToast("Aturan ditambahkan!", "success");
  } else {
    showToast("Gagal menambah aturan", "error");
  }
}

async function removeAutomationRule(sensorId, ruleId) {
  const id   = String(sensorId);
  const rule = (STATE.automationRules[id] || []).find((r) => r.ruleId === ruleId);
  if (!rule?.dbId) return;
  const result = await apiPost("delete_automation_rule", { id: rule.dbId });
  if (result?.success) {
    STATE.automationRules[id] = (STATE.automationRules[id] || []).filter((r) => r.ruleId !== ruleId);
    if (!STATE.automationRules[id].length) delete STATE.automationRules[id];
    if (typeof renderAutomationView === 'function') renderAutomationView();
    showToast("Aturan dihapus", "info");
  }
}

async function toggleAutomationRule(sensorId, ruleId, enabled) {
  const id   = String(sensorId);
  const rule = (STATE.automationRules[id] || []).find((r) => r.ruleId === ruleId);
  if (!rule?.dbId) return;
  await apiPost("update_automation_rule", { id: rule.dbId, is_enabled: enabled ? 1 : 0 });
  rule.enabled = enabled;
}

function applyAutomationTemplate(sensorId, tpl) {
  const matchDev = Object.entries(STATE.devices).find(([, d]) => d.icon === tpl.targetIcon);
  if (!matchDev) { showToast("Tidak ada perangkat yang cocok untuk template ini", "warning"); return; }
  const rule = {
    condition:    tpl.condition,
    threshold:    tpl.threshold,
    thresholdMin: tpl.thresholdMin,
    thresholdMax: tpl.thresholdMax,
    deviceId:     matchDev[0],
    action:       tpl.action,
    delay:        0,
    fromTemplate: tpl.name,
  };
  addAutomationRule(sensorId, rule);
}

function renderAutomationView() {
  const grid   = document.getElementById("automationGrid");
  const empty  = document.getElementById("emptyAutomation");
  if (!grid) return;
  grid.innerHTML = "";
  const sensorKeys = Object.keys(STATE.sensors);
  const deviceKeys = Object.keys(STATE.devices);
  
  if (!sensorKeys.length && !deviceKeys.length) { 
    if (empty) empty.classList.remove("hidden"); return; 
  }
  if (empty) empty.classList.add("hidden");

  sensorKeys.forEach((sensorId) => {
    const sensor   = STATE.sensors[sensorId];
    const meta     = SENSOR_AUTO_META[sensor.type] || SENSOR_AUTO_META.temperature;
    const rules    = STATE.automationRules[String(sensorId)] || [];
    const curVal   = STATE.sensorData[sensorId];
    const valBadge = curVal !== null && curVal !== undefined
      ? `<span class="auto-val-badge">${parseFloat(curVal).toFixed(1)}${sensor.unit || meta.unit}</span>`
      : `<span style="font-size:11px;color:var(--ink-4)">Menunggu data…</span>`;
    
    const availTemplates = (meta.templates || []).filter((t) =>
      Object.values(STATE.devices).some((d) => d.icon === t.targetIcon));
    
    const card = document.createElement("div");
    card.className = "auto-card";
    card.innerHTML = `
      <div class="auto-card-head">
        <div class="auto-card-head-l">
          <div class="auto-icon" style="background:${meta.bg};color:${meta.color}"><i class="fas ${meta.icon}"></i></div>
          <div><div class="auto-card-title">${escHtml(sensor.name)}</div><div class="auto-card-sub">${meta.label} · ${valBadge}</div></div>
        </div>
      </div>
      <div class="auto-card-body">
        ${availTemplates.length
          ? `<div><div class="auto-templates-label">Template Cepat</div>
             <div class="template-chips">${availTemplates.map((t) =>
                `<button class="template-chip" onclick="applyAutomationTemplate('${sensorId}', ${JSON.stringify(t).split('"').join("&quot;")})" title="${t.name}">${t.name}</button>`
             ).join("")}</div></div>`
          : ""
        }
        <div>
          <div class="auto-section-label">Aturan Aktif</div>
          <div id="rules-list-${sensorId}" class="rules-stack">
            ${rules.length === 0
              ? '<div class="rules-empty">Belum ada aturan sensor.</div>'
              : rules.map((r) => buildRuleRowHTML(sensorId, r, sensor, meta)).join("")
            }
          </div>
        </div>
        <button onclick="openAddRuleModal('${sensorId}')" class="btn-ghost full" style="margin-top:8px">
          <i class="fas fa-plus"></i> Tambah Aturan Sensor
        </button>
      </div>`;
    grid.appendChild(card);
  });

  deviceKeys.forEach((deviceId) => {
    const device = STATE.devices[deviceId];
    const key    = 'device_' + deviceId;
    const rules  = STATE.automationRules[key] || [];
    
    const card = document.createElement("div");
    card.className = "auto-card device-auto-card";
    card.innerHTML = `
      <div class="auto-card-head">
        <div class="auto-card-head-l">
          <div class="auto-icon" style="background:var(--surface-3);color:var(--ink-2)"><i class="fas ${device.icon || 'fa-plug'}"></i></div>
          <div><div class="auto-card-title">${escHtml(device.name)}</div><div class="auto-card-sub">Setup Operasional Perangkat</div></div>
        </div>
      </div>
      <div class="auto-card-body">
        <div>
          <div class="auto-section-label">Jadwal Operasional / Manual</div>
          <div id="rules-list-${key}" class="rules-stack">
            ${rules.length === 0
              ? '<div class="rules-empty">Belum ada jadwal operasional manual.</div>'
              : rules.map((r) => buildRuleRowHTML(null, r)).join("")
            }
          </div>
        </div>
        <button onclick="openAddRuleModal(null, '${deviceId}')" class="btn-ghost full" style="margin-top:8px">
          <i class="fas fa-clock"></i> Tambah Jadwal Manual
        </button>
      </div>`;
    grid.appendChild(card);
  });
}

function buildRuleRowHTML(sensorId, rule, sensor = null, meta = null) {
  const device   = STATE.devices[String(rule.deviceId)];
  const devName  = device ? escHtml(device.name) : `<span style="color:var(--red)">Perangkat dihapus</span>`;
  const condLabel = getConditionLabel(rule, sensor, meta);
  
  let actionBadge = "";
  switch (rule.action) {
    case "on":         actionBadge = `<span class="rule-badge-on">ON</span>`;           break;
    case "off":        actionBadge = `<span class="rule-badge-off">OFF</span>`;          break;
    case "speed_high": actionBadge = `<span class="rule-badge-speed">💨 75%</span>`;    break;
    case "speed_mid":  actionBadge = `<span class="rule-badge-speed">🌬️ 50%</span>`;   break;
    case "speed_low":  actionBadge = `<span class="rule-badge-speed">🌬️ 25%</span>`;   break;
    default:           actionBadge = `<span class="rule-badge-on">${rule.action}</span>`;
  }

  const timeLabel = (rule.startTime && rule.endTime) 
    ? `<div class="rule-time-window"><i class="fas fa-clock"></i> ${rule.startTime.substring(0,5)}–${rule.endTime.substring(0,5)}</div>` 
    : "";

  const devIcon = device ? `<i class="fas ${device.icon || "fa-plug"}" style="font-size:10px;color:var(--ink-3)"></i>` : "";
  const fromTpl = rule.fromTemplate
    ? `<div style="font-size:9.5px;color:var(--ink-5);margin-top:2px"><i class="fas fa-magic" style="font-size:9px"></i> ${escHtml(rule.fromTemplate)}</div>`
    : "";
  
  const sid = sensorId ? String(sensorId) : ('device_' + rule.deviceId);

  return `<div class="rule-row" id="rule-row-${rule.ruleId}">
    <label class="toggle-wrapper" style="flex-shrink:0">
      <input type="checkbox" class="toggle-input" ${rule.enabled ? "checked" : ""}
        onchange="toggleAutomationRule('${sid}','${rule.ruleId}',this.checked)">
      <span class="toggle-track"></span>
    </label>
    <div style="flex:1;min-width:0;font-size:11px">
      <div style="font-weight:600;color:var(--ink);display:flex;align-items:center;gap:5px;flex-wrap:wrap">
        <span style="color:var(--ink-3)">${condLabel}</span>
        <span>→</span>${actionBadge} ${devIcon}<span>${devName}</span>
      </div>
      ${fromTpl}
      ${timeLabel}
      ${rule.delay > 0 ? `<div style="font-size:10px;color:var(--ink-4)">Delay: ${rule.delay}ms</div>` : ""}
    </div>
    <button onclick="removeAutomationRule('${sid}','${rule.ruleId}')" class="trash-btn" title="Hapus">
      <i class="fas fa-trash"></i>
    </button>
  </div>`;
}

function getConditionLabel(rule, sensor, meta) {
  if (rule.condition === "time_only") return "Terjadwal";
  if (!sensor || !meta) return "Trigger";
  const u = sensor.unit || meta.unit || "";
  switch (rule.condition) {
    case "gt":       return `> ${rule.threshold}${u}`;
    case "lt":       return `< ${rule.threshold}${u}`;
    case "range":    return `di luar ${rule.thresholdMin}–${rule.thresholdMax}${u}`;
    case "detected": return "terdeteksi";
    case "absent":   return "tidak ada";
    default:         return rule.condition;
  }
}

let _addRuleSensorId = null;
let _addRuleDeviceId = null;

function openAddRuleModal(sensorId, deviceId = null) {
  _addRuleSensorId = sensorId ? String(sensorId) : null;
  _addRuleDeviceId = deviceId ? String(deviceId) : null;

  const modal = document.getElementById("addRuleModal");
  if (!modal) return;

  const sensorRow = document.querySelector('.field-group[style*="background:var(--surface-2)"]');
  const condSel   = document.getElementById("addRuleCondition");
  const devSel    = document.getElementById("addRuleDevice");
  
  document.getElementById("addRuleThreshold").value = "";
  document.getElementById("addRuleThresholdMin").value = "";
  document.getElementById("addRuleThresholdMax").value = "";
  document.getElementById("addRuleStartTime").value = "";
  document.getElementById("addRuleEndTime").value = "";

  if (_addRuleSensorId) {
    if (sensorRow) sensorRow.style.display = "flex";
    const sensor = STATE.sensors[_addRuleSensorId];
    const meta   = SENSOR_AUTO_META[sensor.type] || SENSOR_AUTO_META.temperature;
    if (document.getElementById("addRuleSensorLabel")) document.getElementById("addRuleSensorLabel").textContent = sensor.name;
    const iconEl = document.getElementById("addRuleSensorIcon");
    if (iconEl) {
      iconEl.innerHTML = `<i class="fas ${meta.icon}"></i>`;
      iconEl.style.cssText = `background:${meta.bg};color:${meta.color};width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0`;
    }
    if (condSel) {
        condSel.innerHTML = meta.conditions.map((c) => `<option value="${c.key}">${c.label}</option>`).join("");
        condSel.onchange = () => updateRuleConditionUI(condSel.value, meta);
    }
    
    const devKeys = Object.keys(STATE.devices);
    if (devSel) devSel.innerHTML = devKeys.length
      ? devKeys.map((id) => `<option value="${id}">${escHtml(STATE.devices[id].name)}</option>`).join("")
      : "<option disabled>Belum ada perangkat</option>";
    
    if (condSel) updateRuleConditionUI(condSel.value, meta);
  } else {
    if (sensorRow) sensorRow.style.display = "none";
    if (condSel) condSel.innerHTML = `<option value="time_only">Berdasarkan Waktu Saja</option>`;
    
    if (devSel) {
        const devKeys = Object.keys(STATE.devices);
        devSel.innerHTML = devKeys.map((id) => `<option value="${id}" ${_addRuleDeviceId === id ? 'selected' : ''}>${escHtml(STATE.devices[id].name)}</option>`).join("");
    }
    
    updateRuleConditionUI("time_only", null);
  }

  if (devSel) {
      devSel.onchange = () => updateRuleActionOptions(devSel.value);
      updateRuleActionOptions(devSel.value);
  }
  if (document.getElementById("addRuleDelay")) document.getElementById("addRuleDelay").value = 0;
  modal.classList.add("show");
}

function updateRuleActionOptions(deviceId) {
  const device = STATE.devices[String(deviceId)];
  const dtype  = typeof getDeviceType === 'function' ? getDeviceType(device?.icon) : 'plug';
  const sel    = document.getElementById("addRuleAction");
  if (!sel) return;
  let opts = [{ v: "on", l: "⚡ Nyalakan (ON)" }, { v: "off", l: "✕ Matikan (OFF)" }];
  if (dtype === "fan") opts = [...opts,
    { v: "speed_high", l: "💨 Kipas Cepat (75%)" },
    { v: "speed_mid",  l: "🌬️ Kipas Sedang (50%)" },
    { v: "speed_low",  l: "🌬️ Kipas Lambat (25%)" },
  ];
  sel.innerHTML = opts.map((o) => `<option value="${o.v}">${o.l}</option>`).join("");
}

function updateRuleConditionUI(cond, meta) {
  const tRow = document.getElementById("addRuleThresholdRow");
  const rRow = document.getElementById("addRuleRangeRow");
  if (!tRow || !rRow) return;

  if (cond === "range") {
    tRow.style.display = "none"; rRow.style.display = "";
  } else if (cond === "detected" || cond === "absent" || cond === "time_only") {
    tRow.style.display = "none"; rRow.style.display = "none";
  } else {
    tRow.style.display = ""; rRow.style.display = "none";
    if (meta) {
      const c = meta.conditions.find((x) => x.key === cond);
      if (c && c.defaultVal != null) document.getElementById("addRuleThreshold").value = c.defaultVal;
      const sensor = _addRuleSensorId ? STATE.sensors[_addRuleSensorId] : null;
      if (document.getElementById("addRuleUnit")) document.getElementById("addRuleUnit").textContent = sensor?.unit || meta.unit || "";
    }
  }
}

function closeAddRuleModal() { document.getElementById("addRuleModal")?.classList.remove("show"); _addRuleSensorId = null; }

function saveNewAutomationRule() {
  const cond       = document.getElementById("addRuleCondition").value;
  const deviceId   = document.getElementById("addRuleDevice").value;
  const action     = document.getElementById("addRuleAction").value;
  const delay      = parseInt(document.getElementById("addRuleDelay").value) || 0;
  const startTime  = document.getElementById("addRuleStartTime").value;
  const endTime    = document.getElementById("addRuleEndTime").value;

  if (!deviceId || !STATE.devices[String(deviceId)]) { 
    showToast("Pilih perangkat!", "warning"); return; 
  }

  const rule = { 
    condition: cond, 
    deviceId: String(deviceId), 
    action, 
    delay,
    startTime: startTime || null,
    endTime:   endTime   || null
  };

  if (cond === "range") {
    rule.thresholdMin = parseFloat(document.getElementById("addRuleThresholdMin").value);
    rule.thresholdMax = parseFloat(document.getElementById("addRuleThresholdMax").value);
    if (isNaN(rule.thresholdMin) || isNaN(rule.thresholdMax)) { showToast("Isi rentang nilai!", "warning"); return; }
  } else if (cond !== "detected" && cond !== "absent" && cond !== "time_only") {
    rule.threshold = parseFloat(document.getElementById("addRuleThreshold").value);
    if (isNaN(rule.threshold)) { showToast("Isi nilai threshold!", "warning"); return; }
  }

  if (cond === "time_only" && (!startTime || !endTime)) {
    showToast("Isi jam operasional!", "warning"); return;
  }

  addAutomationRule(_addRuleSensorId, rule);
  closeAddRuleModal();
}

function shouldFireRule(rule, val) {
  const v = parseFloat(val);
  switch (rule.condition) {
    case "gt":       return v >  parseFloat(rule.threshold);
    case "lt":       return v <  parseFloat(rule.threshold);
    case "range":    return v <  parseFloat(rule.thresholdMin) || v > parseFloat(rule.thresholdMax);
    case "detected": return !!val;
    case "absent":   return !val;
    default:         return false;
  }
}

/* ==================== CV PERSON COUNT ==================== */
function onCVPersonCountUpdate(count) {
  STATE.cv.personCount  = count;
  STATE.cv.personPresent = count > 0;
  const g = (id) => document.getElementById(id);
  if (g("cvPersonCountBig")) g("cvPersonCountBig").textContent = count;
  if (g("cvHumanCount"))     g("cvHumanCount").textContent     = count;
  if (typeof automationEngine !== "undefined" && automationEngine.notifyPersonCount) {
      automationEngine.notifyPersonCount(count);
  }
  if (typeof updateDashboardStats === 'function') updateDashboardStats();
}

/* ==================== LOGGING ==================== */
async function loadLogs() {
  const result = await apiPost("get_logs", {});
  if (result && Array.isArray(result)) {
    STATE.logs = result.map((r) => ({
      tanggal:  r.tanggal    || new Date(r.created_at).toLocaleDateString("id-ID"),
      waktu:    r.waktu      || new Date(r.created_at).toLocaleTimeString("id-ID"),
      device:   r.device_name,
      activity: r.activity,
      trigger:  r.trigger_type,
      type:     r.log_type,
      ts:       new Date(r.created_at).getTime(),
    }));
    if (typeof updateLogDisplay === 'function') updateLogDisplay();
  }
}

async function addLog(device, activity, trigger, type = "info") {
  const now = new Date();
  const log = {
    tanggal:  now.toLocaleDateString("id-ID"),
    waktu:    now.toLocaleTimeString("id-ID"),
    device:   device || "System",
    activity,
    trigger,
    type,
    ts: now.getTime(),
  };
  STATE.logs.unshift(log);
  if (STATE.logs.length > CONFIG.app.maxLogs) STATE.logs.length = CONFIG.app.maxLogs;
  if (typeof updateLogDisplay === 'function') updateLogDisplay();
  apiPost("add_log", { device: device || "System", activity, trigger, type }).catch(() => {});
}

function groupLogs(logs) {
  const groups     = [];
  const SESSION_GAP = 120000;
  logs.forEach((log) => {
    const last = groups.find((g) =>
      g.device === log.device && g.trigger === log.trigger && g.latestTs - log.ts < SESSION_GAP);
    if (last) { last.count++; last.activities.unshift(log); last.earliest = log; }
    else groups.push({
      device:     log.device,
      activity:   log.activity,
      trigger:    log.trigger,
      type:       log.type,
      latestTs:   log.ts,
      tanggal:    log.tanggal,
      waktu:      log.waktu,
      count:      1,
      activities: [log],
      earliest:   log,
    });
  });
  return groups;
}

function updateLogDisplay() {
  const tbody = document.getElementById("logBody");
  const empty = document.getElementById("emptyLog");
  if (!tbody) return;
  const q  = STATE.logFilter.toLowerCase();
  const tf = STATE.logTypeFilter;
  let filtered = STATE.logs;
  if (q)  filtered = filtered.filter((l) =>
    (l.device || "").toLowerCase().includes(q) ||
    (l.activity || "").toLowerCase().includes(q) ||
    (l.trigger || "").toLowerCase().includes(q));
  if (tf !== "all") filtered = filtered.filter((l) => l.type === tf);
  if (empty) empty.classList.toggle("hidden", filtered.length > 0);
  const grouped = groupLogs(filtered);
  tbody.innerHTML = "";
  grouped.forEach((g, gi) => {
    const groupId   = `log-group-${gi}`;
    const tr        = document.createElement("tr");
    tr.className    = "log-group-row";
    tr.id           = groupId;
    tr.onclick      = () => toggleLogGroup(groupId);
    const timeRange = g.count > 1 ? `${g.earliest.waktu} – ${g.waktu}` : g.waktu;
    tr.innerHTML    = `
      <td style="width:36px;padding:0 0 0 8px">
        <div class="log-group-cell" style="padding:10px 8px">
          <button class="log-expand-btn" style="pointer-events:none"><i class="fas fa-chevron-right"></i></button>
        </div>
      </td>
      <td><div class="log-group-cell" style="padding:10px 8px 10px 0"><span class="log-device-name">${escHtml(g.device || "")}</span></div></td>
      <td><div style="padding:10px 14px;font-size:12px;color:var(--ink-3)">${escHtml(g.activity)}</div></td>
      <td><div style="padding:10px 14px"><span class="log-badge ${g.type || "info"}">${escHtml(g.trigger)}</span></div></td>
      <td><div class="log-time" style="padding:10px 14px">${timeRange}</div></td>
      <td><div style="padding:10px 14px">${g.count > 1 ? `<span class="log-count-badge">${g.count}</span>` : ""}</div></td>`;
    tbody.appendChild(tr);
    if (g.count > 1) {
      g.activities.forEach((a) => {
        const dtr       = document.createElement("tr");
        dtr.className   = `log-detail-row detail-of-${groupId}`;
        dtr.style.display = "none";
        dtr.innerHTML   = `
          <td></td>
          <td class="log-time">${escHtml(a.tanggal)}</td>
          <td style="font-size:11px;color:var(--ink);padding:6px 14px 6px 28px">${escHtml(a.activity)}</td>
          <td><span class="log-badge ${a.type || "info"}">${escHtml(a.trigger)}</span></td>
          <td class="log-time">${escHtml(a.waktu)}</td>
          <td></td>`;
        tbody.appendChild(dtr);
      });
    }
  });
}

function toggleLogGroup(groupId) {
  const row     = document.getElementById(groupId);
  const details = document.querySelectorAll(`.detail-of-${groupId}`);
  if (!details.length) return;
  const isExpanded = row.classList.contains("expanded");
  row.classList.toggle("expanded", !isExpanded);
  details.forEach((d) => { d.style.display = isExpanded ? "none" : ""; });
}

function filterLogs(q)  { STATE.logFilter     = q; updateLogDisplay(); }
function filterLogType(t) { STATE.logTypeFilter = t; updateLogDisplay(); }

async function clearLogs() {
  if (!confirm("Hapus semua log aktivitas?")) return;
  const result = await apiPost("clear_logs", {});
  if (result?.success) { STATE.logs = []; updateLogDisplay(); showToast("Log dihapus", "success"); }
}

function exportLogsToExcel() {
  if (!STATE.logs.length) { showToast("Tidak ada log", "warning"); return; }
  const rows = [["Tanggal", "Waktu", "Perangkat", "Aktivitas", "Trigger", "Tipe"]];
  STATE.logs.forEach((l) => rows.push([l.tanggal, l.waktu, l.device, l.activity, l.trigger, l.type]));
  if (typeof XLSX !== 'undefined') {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Log");
      XLSX.writeFile(wb, `iotzy-log-${Date.now()}.xlsx`);
      showToast("Log diekspor!", "success");
  } else {
      showToast("Library XLSX belum dimuat", "error");
  }
}

/* ==================== SETTINGS ==================== */
async function saveProfile() {
  const fullName = document.getElementById("settingFullName")?.value.trim();
  const email    = document.getElementById("settingEmail")?.value.trim();
  if (!email) { showToast("Email tidak boleh kosong!", "warning"); return; }
  const result = await apiPost("update_profile", { full_name: fullName, email });
  if (result?.success) showToast("Profil disimpan!", "success");
  else showToast(result?.error || "Gagal menyimpan profil", "error");
}

async function saveTelegramId() {
  const telegramId = document.getElementById("settingTelegramId")?.value.trim();
  
  const result = await apiPost("save_settings", { 
    telegram_chat_id: telegramId
  });
  
  if (result?.success) {
    showToast("Telegram Chat ID berhasil disimpan!", "success");
    if (typeof PHP_SETTINGS !== 'undefined') PHP_SETTINGS.telegram_chat_id = telegramId;
  } else {
    showToast(result?.error || "Gagal menyimpan Chat ID Telegram", "error");
  }
}

async function testTelegram() {
  const btn = event?.currentTarget || document.getElementById('btnTestTelegram');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengetes...';
  }

  showToast("Sedang mencoba mengirim pesan test...", "info");
  const result = await apiPost("test_telegram", {});
  
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fab fa-telegram-plane"></i> Test Koneksi';
  }

  if (result?.success) {
    showToast(result.message, "success");
  } else {
    showToast(result?.error || "Gagal mengetes koneksi Telegram", "error");
  }
}

async function changePassword() {
  const oldP = document.getElementById("oldPassword")?.value;
  const newP = document.getElementById("newPassword")?.value;
  const conP = document.getElementById("confirmPassword")?.value;
  if (!oldP || !newP || !conP) { showToast("Semua field harus diisi!", "warning"); return; }
  if (newP !== conP)           { showToast("Password baru tidak cocok!", "warning"); return; }
  if (newP.length < 8)         { showToast("Password minimal 8 karakter!", "warning"); return; }
  const result = await apiPost("change_password", { current_password: oldP, new_password: newP });
  if (result?.success) {
    showToast("Password berhasil diubah!", "success");
    ["oldPassword", "newPassword", "confirmPassword"].forEach((id) => {
      const el = document.getElementById(id); if (el) el.value = "";
    });
  } else showToast(result?.error || "Gagal mengubah password", "error");
}

/* ==================== CV CONFIG & RULES (DB) ==================== */
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
    if (typeof automationEngine !== "undefined") {
      automationEngine.updateCVRules(CV.cvRules);
    }
  }
}

async function saveCVRules() {
  await apiPost("save_cv_rules", { rules: CV.cvRules });
}

function toggleBoundingBox(val) {
  CV.showBoxes = val;
  ["cvShowBoundingBoxCamera", "cvShowBoundingBoxSettings"].forEach((id) => {
    const el = document.getElementById(id); if (el && el.checked !== val) el.checked = val;
  });
  if (!val && CV.overlayCtx && CV.overlayCanvas) CV.overlayCtx.clearRect(0, 0, CV.overlayCanvas.width, CV.overlayCanvas.height);
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

function onLightAnalysisUpdate(condition, brightness) {
  STATE.cv.lightCondition = condition;
  STATE.cv.brightness     = brightness;
  const pct = Math.round(brightness * 100);
  const g   = (id) => document.getElementById(id);
  if (g("cvBrightness"))      g("cvBrightness").textContent      = `${pct}%`;
  if (g("cvBrightnessLabel")) g("cvBrightnessLabel").textContent = `${pct}%`;
  if (g("cvBrightnessBar"))   g("cvBrightnessBar").style.width   = pct + "%";
  const condMap = { dark: "Gelap", normal: "Normal", bright: "Terang" };
  if (g("cvLightCondition")) g("cvLightCondition").textContent   = condMap[condition] || condition;
}

/* ==================== CV ENGINE ==================== */
async function initializeCV() {
  if (typeof cvDetector !== 'undefined') {
      if (cvDetector.isLoading) return;
      if (cvDetector.isReady)   return true;
  } else {
      showToast("Library CV Detector hilang", "error");
      return false;
  }

  if (document.getElementById("cvLoadingStatus")) {
    document.getElementById("cvLoadingStatus").classList.remove("hidden");
  }

  try {
    await loadCVLibraries();
  } catch (e) {
    showToast("Gagal mengunduh AI library", "error");
    return false;
  }

  const ok = await cvDetector.initialize();
  if (ok) {
    updateCVBadge("ready", "Siap");
    if (document.getElementById("cvLoadingStatus")) document.getElementById("cvLoadingStatus").classList.add("hidden");
    if (document.getElementById("cvSystemStatus")) {
      document.getElementById("cvSystemStatus").textContent = "Model siap";
      document.getElementById("cvSystemStatus").className   = "status-val ok";
    }
    if (document.getElementById("btnStartCV"))   document.getElementById("btnStartCV").disabled   = false;
    if (document.getElementById("btnLoadModel")) document.getElementById("btnLoadModel").disabled = true;

    if (typeof cvUI !== "undefined") cvUI.renderAutomationSettings();
    showToast("Model CV berhasil dimuat!", "success");
    
    if (typeof apiPost === 'function') {
      apiPost('update_cv_state', { model_loaded: 1 }).catch(() => {});
    }
    
    return true;
  } else {
    updateCVBadge("error", "Gagal");
    if (document.getElementById("cvLoadingStatus")) document.getElementById("cvLoadingStatus").classList.add("hidden");
    showToast("Gagal memuat model CV", "error");
    return false;
  }
}

function updateCVBadge(status, label) {
  const el = document.getElementById("cvModelBadge");
  if (!el) return;
  el.className = `cv-status-badge ${status}`; el.textContent = label;
}

function startCVDetection() {
  const video = document.getElementById("cameraFocus");
  if (!video || !cvDetector.isReady) return;

  cvDetector.startDetection(video);

  if (typeof lightAnalyzer !== 'undefined') {
    lightAnalyzer.startAnalysis(video);
  }

  if (document.getElementById("btnStartCV")) document.getElementById("btnStartCV").disabled = true;
  if (document.getElementById("btnStopCV"))  document.getElementById("btnStopCV").disabled  = false;
  if (document.getElementById("cvDetectionInfo")) document.getElementById("cvDetectionInfo").style.display = "flex";
  
  updateCVBadge("active", "Aktif");
  showToast("Deteksi CV dimulai", "info");
}

function stopCVDetection() {
  cvDetector.stopDetection();
  if (typeof lightAnalyzer !== 'undefined') lightAnalyzer.stopAnalysis();

  if (document.getElementById("btnStartCV")) document.getElementById("btnStartCV").disabled = false;
  if (document.getElementById("btnStopCV"))  document.getElementById("btnStopCV").disabled  = true;
  if (document.getElementById("cvDetectionInfo")) document.getElementById("cvDetectionInfo").style.display = "none";
  
  updateCVBadge("ready", "Siap");
  showToast("Deteksi CV dihentikan", "info");
}

let _cvLastDetectTime = 0;
const _cvMinInterval  = 300;

async function runCVLoop() {
  if (!CV.detecting || !CV.modelLoaded) return;

  const video = document.getElementById("cameraFocus");
  if (!video || video.readyState < 2) {
    if (CV.detecting) requestAnimationFrame(runCVLoop);
    return;
  }

  const now = performance.now();
  if (now - _cvLastDetectTime < _cvMinInterval) {
    if (CV.detecting) requestAnimationFrame(runCVLoop);
    return;
  }
  _cvLastDetectTime = now;

  try {
    const preds  = await CV.model.detect(video, undefined, CV.confidence);
    CV.frameCount++;
    const people = preds.filter((p) => p.class === "person");
    const count  = people.length;
    if (count !== STATE.cv.personCount) {
      onCVPersonCountUpdate(count);
    }
    if (CV.showBoxes && CV.overlayCtx && CV.overlayCanvas) drawCVOverlay(preds, video);
    updateCVHUD(count, preds);
    CV.humanPresent = count > 0;
  } catch (_) {}

  if (CV.detecting) requestAnimationFrame(runCVLoop);
}

function drawCVOverlay(preds, video) {
  const canvas = CV.overlayCanvas; const ctx = CV.overlayCtx;
  if(!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const scaleX = canvas.width  / (video.videoWidth  || 640);
  const scaleY = canvas.height / (video.videoHeight || 480);

  preds.forEach((p) => {
    const [x, y, w, h] = p.bbox;
    const sx = x * scaleX, sy = y * scaleY, sw = w * scaleX, sh = h * scaleY;
    
    const color = p.class === "person" ? "#0ea5e9" : "#f59e0b";
    
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(sx, sy, sw, sh);
    
    ctx.fillStyle   = color + "bb"; 
    ctx.fillRect(sx, sy - 22, Math.max(120, (p.class.length + 10) * 7), 22);
    ctx.fillStyle   = "#fff"; ctx.font = "600 11px Plus Jakarta Sans, sans-serif";
    ctx.fillText(`${p.class} ${Math.round(p.score * 100)}%`, sx + 6, sy - 7);
  });
}

function updateCVHUD(count, preds) {
  const g = (id) => document.getElementById(id);
  if (g("cvHumanCount")) g("cvHumanCount").textContent = count;
  if (g("cvConfidence")) g("cvConfidence").textContent = preds && preds.length
    ? Math.round(Math.max(...preds.map((p) => p.score)) * 100) + "%" : "—";
  const presText = count > 0 ? `${count} orang` : "Tidak ada";
  if (g("cvPresenceStatus")) {
    g("cvPresenceStatus").textContent = presText;
    g("cvPresenceStatus").className   = "status-val" + (count > 0 ? " ok" : " muted");
  }
}

async function loadCVLibraries() {
  if (window.tf && window.cocoSsd) return true;
  const loadScript = (src) => new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', reject, { once: true });
      if (existing.dataset.loaded === '1') resolve(true);
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.dataset.src = src;
    s.onload = () => { s.dataset.loaded = '1'; resolve(true); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
  await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.11.0');
  await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3');
  return !!(window.tf && window.cocoSsd);
}

async function getUserMediaCompat(constraints) {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    return await navigator.mediaDevices.getUserMedia(constraints);
  }
  const legacyGetMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.getUserMedia;
  if (legacyGetMedia) {
    return new Promise((resolve, reject) => legacyGetMedia.call(navigator, constraints, resolve, reject));
  }
  throw new Error('Kamera tidak didukung di lingkungan ini');
}

async function listCameraDevices() {
  try {
    const tempStream = await getUserMediaCompat({ video: true });
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      tempStream.getTracks().forEach((t) => t.stop());
      return [];
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter((d) => d.kind === 'videoinput');
    STATE.camera.availableDevices = cams;
    tempStream.getTracks().forEach((t) => t.stop());
    return cams;
  } catch (err) {
    console.error('Gagal list kamera:', err);
    return [];
  }
}

async function startCamera() {
  try {
    if (STATE.camera.stream) STATE.camera.stream.getTracks().forEach((t) => t.stop());
    const constraints = STATE.camera.selectedDeviceId
      ? { video: { deviceId: { exact: STATE.camera.selectedDeviceId } } }
      : { video: { facingMode: 'environment' } };
    const stream = await getUserMediaCompat(constraints);
    STATE.camera.stream = stream;
    STATE.camera.active = true;
    updateCameraElements(true);
    return true;
  } catch (e) {
    console.error('Start Camera Error:', e);
    try {
      const fallbackStream = await getUserMediaCompat({ video: true });
      STATE.camera.stream = fallbackStream;
      STATE.camera.active = true;
      updateCameraElements(true);
      return true;
    } catch (e2) {
      showToast('Gagal akses kamera: ' + e2.message, 'error');
      return false;
    }
  }
}

async function toggleCamera() {
  try {
    if (!STATE.camera.stream) {
      const success = await startCamera();
      if (success) showToast('Kamera aktif', 'success');
    } else {
      STATE.camera.stream.getTracks().forEach((t) => t.stop());
      STATE.camera.stream = null;
      STATE.camera.active = false;
      updateCameraElements(false);
      showToast('Kamera dimatikan', 'info');
    }
  } catch (e) {
    showToast('Error kamera: ' + e.message, 'error');
  }
}

function toggleCameraFocus() { toggleCamera(); }

function openCameraSelector() {
  const modal = document.getElementById('cameraSelectorModal');
  const list = document.getElementById('cameraDevicesList');
  if (!modal || !list) return;
  modal.classList.add('show');
  list.innerHTML = "<div class='modal-item'>Mencari Kamera...</div>";
  listCameraDevices().then((devs) => {
    list.innerHTML = '';
    if (devs.length === 0) {
      const btn = document.createElement('button');
      btn.className = 'modal-item';
      btn.innerHTML = `<i class="fas fa-camera"></i> Gunakan Kamera Utama`;
      btn.onclick = () => { STATE.camera.selectedDeviceId = null; closeCameraSelector(); startCamera(); };
      list.appendChild(btn);
      return;
    }
    devs.forEach((dev, idx) => {
      const btn = document.createElement('button');
      btn.className = 'modal-item' + (dev.deviceId === STATE.camera.selectedDeviceId ? ' selected' : '');
      btn.innerHTML = `<i class="fas fa-camera"></i> ${dev.label || 'Kamera ' + (idx + 1)}`;
      btn.onclick = () => { STATE.camera.selectedDeviceId = dev.deviceId; closeCameraSelector(); if (STATE.camera.active) startCamera(); else showToast('Kamera dipilih', 'info'); };
      list.appendChild(btn);
    });
  });
}

function closeCameraSelector() { document.getElementById('cameraSelectorModal')?.classList.remove('show'); }

async function selectCamera(deviceId) {
  STATE.camera.selectedDeviceId = deviceId;
  if (STATE.camera.stream) {
    STATE.camera.stream.getTracks().forEach((t) => t.stop());
    STATE.camera.stream = null;
    await startCamera();
  } else {
    showToast('Kamera dipilih, klik power untuk aktifkan', 'info');
  }
}

function updateCameraElements(isActive) {
  [
    { v: 'camera', p: 'camPlaceholder', b: 'camTag' },
    { v: 'cameraFocus', p: 'cameraFocusPlaceholder', b: 'cameraFocusTag' },
    { v: 'customCameraMirror', p: 'customCameraPlaceholder', b: null },
  ].forEach(({ v, p, b }) => {
    const vid = document.getElementById(v);
    const ph = document.getElementById(p);
    const tag = b ? document.getElementById(b) : null;
    if (!vid || !ph) return;
    if (isActive && STATE.camera.stream) {
      vid.srcObject = STATE.camera.stream;
      vid.classList.remove('hidden');
      ph.style.display = 'none';
      if (tag) tag.classList.remove('hidden');
      vid.play().catch(() => {});
    } else {
      vid.srcObject = null;
      vid.classList.add('hidden');
      ph.style.display = '';
      if (tag) tag.classList.add('hidden');
    }
  });
}

