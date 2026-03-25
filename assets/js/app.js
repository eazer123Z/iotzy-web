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

const CONFIG = {
  mqtt: {
    broker:         (window.PHP_SETTINGS?.mqtt_broker || ""),
    port:           (parseInt(window.PHP_SETTINGS?.mqtt_port) || 8884),
    path:           (window.PHP_SETTINGS?.mqtt_path   || "/mqtt"),
    maxReconnect:   5,
    reconnectDelay: 3000,
  },
  app: { 
    maxLogs: 500, 
    updateInterval: (parseInt(window.PHP_SETTINGS?.update_interval) || 1000)
  },
};

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

async function syncAutomationFromServer() {
  await initAutomationRules();
  renderAutomationView();
}

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

document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  if (typeof initSidebar === 'function') initSidebar();
  if (typeof initClock === 'function') initClock();
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
  if (typeof initUptimeCounter === 'function') initUptimeCounter();
  if (typeof loadMQTTTemplates === 'function') loadMQTTTemplates();
  setInterval(syncAllFromServer, 3000);
  if (typeof cvUI !== "undefined" && typeof cvUI.initialize === "function") cvUI.initialize();
  if (typeof lightAnalyzer !== "undefined") {
    lightAnalyzer.setCallbacks({
      _tag: "app",
      onLightChange: (condition, brightness) => {
        if (typeof automationEngine !== "undefined") automationEngine.notifyLight(condition, brightness);
      },
    });
  }
  setTimeout(() => {
    if (typeof PHP_SETTINGS !== 'undefined' && PHP_SETTINGS.mqtt_broker && typeof connectMQTT === 'function') connectMQTT();
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
        STATE.quickControlDevices = Array.isArray(qc) ? qc.map(String) : typeof qc === "string" ? JSON.parse(qc || "[]").map(String) : [];
        if (PHP_SETTINGS.cv_config && typeof PHP_SETTINGS.cv_config === 'object') {
           if (typeof CV_CONFIG !== 'undefined') {
               Object.assign(CV_CONFIG, PHP_SETTINGS.cv_config);
               if (CV_CONFIG.detection?.minConfidence) CV.confidence = CV_CONFIG.detection.minConfidence;
           }
        }
        if (PHP_SETTINGS.cv_rules && typeof PHP_SETTINGS.cv_rules === 'object') {
           CV.cvRules = PHP_SETTINGS.cv_rules;
           if (typeof automationEngine !== 'undefined' && automationEngine.updateCVRules) automationEngine.updateCVRules(CV.cvRules);
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
  } catch (e) { STATE.quickControlDevices = []; }
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
    const hasStructureChanged = currentDeviceIds.length !== serverDeviceIds.length || currentSensorIds.length !== serverSensorIds.length || !currentDeviceIds.every(id => serverDeviceIds.includes(id)) || !currentSensorIds.every(id => serverSensorIds.includes(id));
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
         if (STATE.sensors[id]) STATE.sensorData[id] = s.latest_value;
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
    updateDashboardStats();
  } catch (e) {
  } finally { syncAllFromServer._inFlight = false; }
}

function renderAll() {
  if (typeof renderDevices === 'function') renderDevices();
  if (typeof renderSensors === 'function') renderSensors();
  if (typeof renderQuickControls === 'function') renderQuickControls();
  if (typeof renderAutomationView === 'function') renderAutomationView();
  updateDashboardStats();
}

function updateDashboardStats() {
  const totalDev  = Object.keys(STATE.devices).length;
  const activeDev = Object.values(STATE.deviceStates).filter(Boolean).length;
  const totalSen  = Object.keys(STATE.sensors).length;
  const activeSen = Object.values(STATE.sensorData).filter((v) => v !== null && v !== undefined).length;
  const g = (id) => document.getElementById(id);
  if (g("statActiveDevicesVal")) g("statActiveDevicesVal").textContent = activeDev;
  if (g("statActiveDevicesSub")) g("statActiveDevicesSub").textContent = `dari ${totalDev} perangkat`;
  if (g("statSensorsOnlineVal")) g("statSensorsOnlineVal").textContent = activeSen;
  if (g("statSensorsOnlineSub")) g("statSensorsOnlineSub").textContent = `dari ${totalSen} sensor`;
  if (g("navDeviceCount"))       g("navDeviceCount").textContent       = totalDev;
  if (g("navSensorCount"))       g("navSensorCount").textContent       = totalSen;
  if (g("totalDevices"))         g("totalDevices").textContent         = totalDev;
  if (g("totalSensors"))         g("totalSensors").textContent         = totalSen;
  if (g("statMqttVal"))          g("statMqttVal").textContent          = STATE.mqtt.connected ? "Connected" : "Disconnected";
  if (g("statMqttSub"))          g("statMqttSub").textContent          = STATE.mqtt.connected ? (PHP_SETTINGS.mqtt_broker || "Online") : "Tidak terhubung";
  if (g("cvPersonCountBig"))     g("cvPersonCountBig").textContent     = STATE.cv.personCount;
  if (window.Overview && typeof window.Overview.updateSummary === 'function') window.Overview.updateSummary();
}
