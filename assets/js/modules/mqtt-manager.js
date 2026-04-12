/* 
 * ==================================================================================
 * MQTT MANAGER MODULE
 * ==================================================================================
 * Mengelola koneksi, publikasi, dan langganan pesan MQTT (Message Queuing Telemetry Transport).
 * Menggunakan library Paho MQTT untuk komunikasi real-time dengan broker.
 */

let isMqttActionBusy = false;
const SENSOR_DB_SYNC_MS = 500;
const DEVICE_DB_SYNC_MS = 150;
const sensorSyncQueue = {};
const deviceStateSyncQueue = {};

function flushSensorSync(sensorId) {
  const slot = sensorSyncQueue[sensorId];
  if (!slot) return;
  slot.timer = null;
  apiPost("update_sensor_value", { id: sensorId, value: slot.value }, {
    key: `sensor_sync_${sensorId}`,
    refresh: false,
  }).catch(e => console.warn('Sensor sync error:', e));
}

function queueSensorSync(sensorId, val) {
  const id = String(sensorId);
  if (!sensorSyncQueue[id]) sensorSyncQueue[id] = { value: val, timer: null };
  sensorSyncQueue[id].value = val;
  if (sensorSyncQueue[id].timer) return;
  sensorSyncQueue[id].timer = setTimeout(() => flushSensorSync(id), SENSOR_DB_SYNC_MS);
}

function flushDeviceStateSync(deviceId) {
  const slot = deviceStateSyncQueue[deviceId];
  if (!slot) return;
  slot.timer = null;
  apiPost("update_device_state", { id: deviceId, state: slot.state ? 1 : 0, trigger: "MQTT" }, {
    key: `device_state_sync_${deviceId}`,
    refresh: false,
  }).catch(e => console.warn('Device state sync error:', e));
}

function queueDeviceStateSync(deviceId, state) {
  const id = String(deviceId);
  if (!deviceStateSyncQueue[id]) deviceStateSyncQueue[id] = { state: !!state, timer: null };
  deviceStateSyncQueue[id].state = !!state;
  if (deviceStateSyncQueue[id].timer) return;
  deviceStateSyncQueue[id].timer = setTimeout(() => flushDeviceStateSync(id), DEVICE_DB_SYNC_MS);
}

// loadMQTTTemplates() and renderMQTTTemplateSelector() are defined in
// settings-manager.js (single source of truth, with caching & dedup)

// applyMQTTTemplate() is defined in settings-manager.js (single source of truth)


async function connectMQTT(event) {
  if (isMqttActionBusy) return;
  const btn = document.getElementById("btnTestMQTT") || event?.currentTarget;
  
  try {
    isMqttActionBusy = true;
    if (btn && btn.id === "btnTestMQTT") { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghubungkan...'; }

    // Ambil kredensial dari elemen input (jika di halaman settings) atau dari PHP_SETTINGS
    let broker     = document.getElementById("mqttBroker")?.value   || PHP_SETTINGS.mqtt_broker   || CONFIG.mqtt.broker;
    let port       = parseInt(document.getElementById("mqttPort")?.value) || PHP_SETTINGS.mqtt_port || CONFIG.mqtt.port;
    const clientId = (document.getElementById("mqttClientId")?.value || "iotzy_web") + "_" + Math.random().toString(16).substr(2, 6);
    const path     = document.getElementById("mqttPath")?.value     || PHP_SETTINGS.mqtt_path     || "/mqtt";
    let   useSSL   = document.getElementById("mqttUseSSL")?.checked ?? !!PHP_SETTINGS.mqtt_use_ssl;
    
    // 🔥 FIX: Force WSS (useSSL) if loaded over HTTPS to prevent Mixed Content Error
    if (window.location.protocol === "https:") useSSL = true;

    const user     = document.getElementById("mqttUsername")?.value  || PHP_SETTINGS.mqtt_username || "";
    const pass     = document.getElementById("mqttPassword")?.value || "";

    if (port === 1883) port = 9001;
    if (port === 8883) port = 8884;

    if (broker === "iotzy-mosquitto" || broker === "mosquitto" || broker === window.location.hostname) {
      broker = window.location.hostname;
    }

    if (STATE.mqtt.client && STATE.mqtt.connected) {
      try { STATE.mqtt.client.disconnect(); } catch (_) {}
    }

    STATE.mqtt.client = new Paho.MQTT.Client(broker, port, path, clientId);
    
    STATE.mqtt.client.onConnectionLost = (res) => {
      updateMQTTStatus(false);
      addLog("MQTT", "Terputus: " + res.errorMessage, "System", "error");
      if (res.errorCode !== 0 && STATE.mqtt.reconnectAttempts < CONFIG.mqtt.maxReconnect) {
        const delay = CONFIG.mqtt.reconnectDelay * Math.pow(2, STATE.mqtt.reconnectAttempts++);
        setTimeout(() => { if (!STATE.mqtt.connected) connectMQTT(); }, delay);
      }
    };

    STATE.mqtt.client.onMessageArrived = (msg) => handleMQTTMessage(msg.destinationName, msg.payloadString);

    const opts = {
      timeout: 10, keepAliveInterval: 30, cleanSession: true, useSSL,
      onSuccess: () => {
        isMqttActionBusy = false;
        STATE.mqtt.reconnectAttempts = 0;
        updateMQTTStatus(true);
        addLog("MQTT", `Terhubung ke ${broker}:${port}`, "System", "success");
        showToast("MQTT terhubung!", "success");
        subscribeToAllTopics();
        updateDashboardStats();
        if (btn && btn.id === "btnTestMQTT") { btn.disabled = false; btn.innerHTML = '<i class="fas fa-wifi"></i> Test Koneksi'; }
      },
      onFailure: (err) => {
        isMqttActionBusy = false;
        updateMQTTStatus(false);
        addLog("MQTT", "Gagal: " + (err.errorMessage || "Unknown"), "System", "error");
        showToast("Koneksi MQTT gagal", "error");
        if (btn && btn.id === "btnTestMQTT") { btn.disabled = false; btn.innerHTML = '<i class="fas fa-wifi"></i> Test Koneksi'; }
      },
    };

    if (user) opts.userName = user;
    if (pass) opts.password = pass;
    
    STATE.mqtt.client.connect(opts);
  } catch (e) {
    isMqttActionBusy = false;
    showToast("Error MQTT: " + e.message, "error");
    if (btn && btn.id === "btnTestMQTT") { btn.disabled = false; btn.innerHTML = '<i class="fas fa-wifi"></i> Test Koneksi'; }
  }
}

/**
 * Menutup koneksi MQTT secara manual.
 */
function disconnectMQTT() {
  if (STATE.mqtt.client && STATE.mqtt.connected) {
    try { STATE.mqtt.client.disconnect(); } catch (_) {}
  }
  updateMQTTStatus(false);
  showToast("MQTT diputus", "info");
}

/**
 * Memperbarui status koneksi MQTT di berbagai elemen UI (Topbar, Sidebar, Settings).
 */
function updateMQTTStatus(connected) {
  STATE.mqtt.connected = connected;
  const g = (id) => document.getElementById(id);
  
  // Update indikator di Topbar dan Sidebar
  g("mqttStatusDot")?.classList.toggle("online", connected);
  if (g("mqttStatusText")) g("mqttStatusText").textContent = connected ? "Connected" : "Disconnected";
  
  g("sidebarMqttDot")?.classList.toggle("online", connected);
  if (g("sidebarMqttText")) g("sidebarMqttText").textContent = connected ? "Online" : "Offline";
  
  // Update visual di halaman settings jika sedang terbuka
  const sv = g("mqttStatusSettings");
  if (sv) { 
    sv.textContent = connected ? "Terhubung" : "Disconnected"; 
    sv.className = "setting-val " + (connected ? "ok" : "muted"); 
  }
  
  // Flush offline queue on reconnect
  if (connected && _mqttOfflineQueue.length > 0) {
    setTimeout(_flushMqttOfflineQueue, 500);
  }
  
  updateDashboardStats();
}

/**
 * Melakukan subscription ke semua topik MQTT yang relevan bagi perangkat dan sensor.
 */
function subscribeToAllTopics() {
  if (!STATE.mqtt.connected || !STATE.mqtt.client) return;
  
  // Subscribe topik perangkat (Actuators)
  Object.values(STATE.deviceTopics).forEach((t) => {
    if (t.sub) try { STATE.mqtt.client.subscribe(t.sub); } catch (_) {}
  });
  
  // Subscribe topik sensor (Monitoring)
  Object.values(STATE.sensors).forEach((s) => {
    if (s.topic) try { STATE.mqtt.client.subscribe(s.topic); } catch (_) {}
  });
}

/**
 * Mengirim pesan ke broker MQTT (Publish).
 */
// Offline message queue — flush on reconnect
const _mqttOfflineQueue = [];

function _flushMqttOfflineQueue() {
  while (_mqttOfflineQueue.length > 0 && STATE.mqtt.connected && STATE.mqtt.client) {
    const { topic, payload } = _mqttOfflineQueue.shift();
    try {
      const msg = new Paho.MQTT.Message(JSON.stringify(payload));
      msg.destinationName = topic;
      STATE.mqtt.client.send(msg);
    } catch (e) {
      console.warn('MQTT offline queue flush error:', e);
      break;
    }
  }
}

function publishMQTT(topic, payload) {
  if (!topic) return false;
  if (!STATE.mqtt.connected || !STATE.mqtt.client) {
    // Queue for later delivery
    _mqttOfflineQueue.push({ topic, payload });
    return false;
  }
  try {
    const msg = new Paho.MQTT.Message(JSON.stringify(payload));
    msg.destinationName = topic;
    STATE.mqtt.client.send(msg);
    window.dispatchEvent(new CustomEvent('iotzy:mqtt-publish', {
      detail: { topic, ok: true, payload, timestamp: Date.now() }
    }));
    return true;
  } catch (e) {
    console.warn('MQTT publish error:', e);
    window.dispatchEvent(new CustomEvent('iotzy:mqtt-publish', {
      detail: { topic, ok: false, payload, timestamp: Date.now() }
    }));
    return false;
  }
}

/**
 * Routing pesan MQTT yang masuk ke handler yang sesuai (Device atau Sensor).
 */
function handleMQTTMessage(topic, payload) {
  // Cek apakah topik milik perangkat
  for (const [id, topics] of Object.entries(STATE.deviceTopics)) {
    if (topics.sub === topic) {
      try {
        const data = JSON.parse(payload);
        const ns   = data.state === 1 || data.state === true || data.state === "on";
        const prev = STATE.deviceStates[id];
        
        STATE.deviceStates[id] = ns;
        
        // Update data tambahan (Speed, Temp, Mode) jika ada
        if (data.speed !== undefined && STATE.deviceExtras[id]) STATE.deviceExtras[id].fanSpeed = data.speed;
        if (data.temp  !== undefined && STATE.deviceExtras[id]) STATE.deviceExtras[id].acTemp   = data.temp;
        if (data.mode  !== undefined && STATE.deviceExtras[id]) STATE.deviceExtras[id].acMode   = data.mode;
        
        // Jika ada perubahan state, catat log dan update database
        if (ns !== prev) {
          if (ns) STATE.deviceOnAt[id] = Date.now();
          else delete STATE.deviceOnAt[id];
          
          queueDeviceStateSync(id, ns);
          addLog(STATE.devices[id]?.name, `Status: ${ns ? "ON" : "OFF"}`, "MQTT", "info");
        }
      } catch {
        // Fallback jika payload bukan JSON
        const raw = payload.toLowerCase().trim();
        STATE.deviceStates[id] = raw === "1" || raw === "on";
      }
      updateDeviceUI(id);
      updateDashboardStats();
      return;
    }
  }
  
  // Cek apakah topik milik sensor
  for (const [id, sensor] of Object.entries(STATE.sensors)) {
    if (sensor.topic === topic) {
      try {
        const data = JSON.parse(payload);
        const val  = typeof data.value !== "undefined" ? parseFloat(data.value)
          : typeof data === "number" ? data : parseFloat(payload);
        if (!isNaN(val)) processSensorValue(id, val);
      } catch {
        const val = parseFloat(payload);
        if (!isNaN(val)) processSensorValue(id, val);
      }
      return;
    }
  }
}

/**
 * Memproses data sensor masuk: update state, history, UI, dan jalankan aturan otomasi.
 */
function processSensorValue(sensorId, val) {
  const id = String(sensorId);
  const seenAt = new Date().toISOString();
  STATE.sensorData[sensorId] = val;
  if (STATE.sensors[id]) {
    STATE.sensors[id].last_seen = seenAt;
  }

  if (typeof pushSensorHistoryPoint === "function") {
    pushSensorHistoryPoint(id, val, seenAt);
  } else {
    if (!STATE.sensorHistory[id]) STATE.sensorHistory[id] = [];
    STATE.sensorHistory[id].push({ val, t: seenAt });
    if (STATE.sensorHistory[id].length > 30) STATE.sensorHistory[id].shift();
  }

  // Update visual sensor berdasarkan tipe
  const sensor = STATE.sensors[id];
  const updateOptions = { recordHistory: false, seenAt };
  if (sensor?.type === "presence" || sensor?.type === "motion") updateSensorBoolUI(id, updateOptions);
  else updateSensorValueUI(id, updateOptions);

  // Trigger evaluasi aturan otomasi di Automation Engine
  document.getElementById(`sensor-card-${id}`)?.classList.add("has-data");
  if (typeof automationEngine !== "undefined" && automationEngine.isActive) {
    automationEngine.evaluateSensorRules(id, val);
    
    // Built-in Automation Triggers
    if (sensor?.type === 'temperature' && typeof automationEngine.evaluateBuiltInRules === "function") {
      automationEngine.evaluateBuiltInRules('fan', val);
    }
    if ((sensor?.type === 'brightness' || sensor?.type === 'light') && typeof automationEngine.evaluateBuiltInRules === "function") {
      automationEngine.evaluateBuiltInRules('lamp', val);
    }
  }

  // Sync data ke database
  queueSensorSync(sensorId, val);
  updateDashboardStats();
}
