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
  }).catch(() => {});
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
  }).catch(() => {});
}

function queueDeviceStateSync(deviceId, state) {
  const id = String(deviceId);
  if (!deviceStateSyncQueue[id]) deviceStateSyncQueue[id] = { state: !!state, timer: null };
  deviceStateSyncQueue[id].state = !!state;
  if (deviceStateSyncQueue[id].timer) return;
  deviceStateSyncQueue[id].timer = setTimeout(() => flushDeviceStateSync(id), DEVICE_DB_SYNC_MS);
}

/**
 * Memuat daftar template MQTT dari database dan menyimpannya ke state lokal.
 */
async function loadMQTTTemplates() {
  try {
    const res = await apiPost("get_mqtt_templates");
    if (res?.success) {
      STATE.mqtt.templates = res.templates;
      renderMQTTTemplateSelector();
    }
  } catch (e) { console.error("Gagal memuat template MQTT:", e); }
}

/**
 * Merender ulang pilihan template di modal pengaturan MQTT.
 */
function renderMQTTTemplateSelector() {
  const sel = document.getElementById("mqttTemplate");
  if (!sel || !STATE.mqtt.templates) return;
  
  sel.innerHTML = '<option value="">— Pilih Template Broker —</option>';
  STATE.mqtt.templates.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.slug;
    opt.textContent = t.name;
    sel.appendChild(opt);
  });
}

/**
 * Menerapkan pengaturan dari template yang dipilih ke form input.
 */
function applyMQTTTemplate(slug) {
  const t = (STATE.mqtt.templates || []).find(x => x.slug === slug);
  if (!t) return;

  const g = (id) => document.getElementById(id);
  if (g("mqttBroker")) g("mqttBroker").value = t.broker;
  if (g("mqttPort"))   g("mqttPort").value   = t.port;
  if (g("mqttPath"))   g("mqttPath").value   = t.path;
  if (g("mqttUseSSL")) g("mqttUseSSL").checked = !!t.use_ssl;
  if (g("mqttUsername")) g("mqttUsername").value = t.username || "";
  
  showToast(`Template ${t.name} diterapkan`, "info");
}


async function connectMQTT() {
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
function publishMQTT(topic, payload) {
  if (!STATE.mqtt.connected || !STATE.mqtt.client || !topic) return false;
  try {
    const msg = new Paho.MQTT.Message(JSON.stringify(payload));
    msg.destinationName = topic;
    STATE.mqtt.client.send(msg);
    window.dispatchEvent(new CustomEvent('iotzy:mqtt-publish', {
      detail: { topic, ok: true, payload, timestamp: Date.now() }
    }));
    return true;
  } catch {
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

/**
 * Modal Config MQTT
 */
function openMQTTConfigModal()  { document.getElementById("mqttConfigModal")?.classList.add("active"); }
function closeMQTTConfigModal() { document.getElementById("mqttConfigModal")?.classList.remove("active"); }

/**
 * Menyimpan konfigurasi MQTT baru ke sistem dan mencoba menyambungkan ulang.
 */
async function saveMQTTConfig() {
  if (isMqttActionBusy) return;
  const btn    = document.getElementById("btnSaveMQTTConfig");
  const broker = document.getElementById("mqttBroker")?.value.trim();
  const port   = parseInt(document.getElementById("mqttPort")?.value);
  
  if (!broker || !port) { showToast("Broker dan port harus diisi!", "warning"); return; }

  const clientId = document.getElementById("mqttClientId")?.value.trim() || "iotzy_web";
  const path     = document.getElementById("mqttPath")?.value.trim()     || "/mqtt";
  const useSSL   = document.getElementById("mqttUseSSL")?.checked        ?? true;
  const username = document.getElementById("mqttUsername")?.value.trim() || "";
  const password = document.getElementById("mqttPassword")?.value || "";
  
  const payload = {
    mqtt_broker: broker, mqtt_port: port, mqtt_client_id: clientId,
    mqtt_path: path, mqtt_use_ssl: useSSL ? 1 : 0, mqtt_username: username,
  };
  if (password) payload.mqtt_password = password;
  
  try {
    isMqttActionBusy = true;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> menyimpan...'; }

    const result = await apiPost("save_settings", payload);
    if (result?.success) { 
      showToast("Konfigurasi MQTT berhasil disimpan!", "success"); 
      closeMQTTConfigModal(); 
      await connectMQTT(); 
    } else {
      showToast(result?.error || "Gagal menyimpan konfigurasi", "error");
    }
  } catch (err) {
    showToast("Terjadi kesalahan sistem", "error");
  } finally {
    isMqttActionBusy = false;
    if (btn) { btn.disabled = false; btn.innerHTML = "Simpan Konfigurasi"; }
  }
}
