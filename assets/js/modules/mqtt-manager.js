async function loadMQTTTemplates() {
  try {
    const res = await apiPost("get_mqtt_templates");
    if (res?.success) {
      STATE.mqtt.templates = res.templates;
      renderMQTTTemplateSelector();
    }
  } catch (e) {
    console.error("Gagal memuat template MQTT:", e);
  }
}

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

function applyMQTTTemplate(slug) {
  const t = (STATE.mqtt.templates || []).find(x => x.slug === slug);
  if (!t) return;
  const g = (id) => document.getElementById(id);
  if (g("mqttBroker")) g("mqttBroker").value = t.broker;
  if (g("mqttPort")) g("mqttPort").value = t.port;
  if (g("mqttPath")) g("mqttPath").value = t.path;
  if (g("mqttUseSSL")) g("mqttUseSSL").checked = !!t.use_ssl;
  if (g("mqttUsername")) g("mqttUsername").value = t.username || "";
  showToast(`Template ${t.name} diterapkan`, "info");
}

async function connectMQTT() {
  try {
    let broker = document.getElementById("mqttBroker")?.value || PHP_SETTINGS.mqtt_broker || CONFIG.mqtt.broker;
    let port   = parseInt(document.getElementById("mqttPort")?.value) || PHP_SETTINGS.mqtt_port || CONFIG.mqtt.port;
    const clientId = (document.getElementById("mqttClientId")?.value || "iotzy_web") + "_" + Math.random().toString(16).substr(2, 6);
    const path = document.getElementById("mqttPath")?.value || PHP_SETTINGS.mqtt_path || "/mqtt";
    const useSSL = document.getElementById("mqttUseSSL")?.checked ?? !!PHP_SETTINGS.mqtt_use_ssl;
    const user = document.getElementById("mqttUsername")?.value || PHP_SETTINGS.mqtt_username || "";
    const pass = document.getElementById("mqttPassword")?.value || "";

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
        STATE.mqtt.reconnectAttempts = 0;
        updateMQTTStatus(true);
        addLog("MQTT", `Terhubung ke ${broker}:${port}`, "System", "success");
        showToast("MQTT terhubung!", "success");
        subscribeToAllTopics();
        updateDashboardStats();
      },
      onFailure: (err) => {
        updateMQTTStatus(false);
        addLog("MQTT", "Gagal: " + (err.errorMessage || "Unknown"), "System", "error");
        showToast("Koneksi MQTT gagal", "error");
      },
    };
    if (user) opts.userName = user;
    if (pass) opts.password = pass;
    STATE.mqtt.client.connect(opts);
  } catch (e) {
    showToast("Error MQTT: " + e.message, "error");
  }
}

function disconnectMQTT() {
  if (STATE.mqtt.client && STATE.mqtt.connected) {
    try { STATE.mqtt.client.disconnect(); } catch (_) {}
  }
  updateMQTTStatus(false);
  showToast("MQTT diputus", "info");
}

function updateMQTTStatus(connected) {
  STATE.mqtt.connected = connected;
  const g = (id) => document.getElementById(id);
  g("mqttStatusDot")?.classList.toggle("connected", connected);
  if (g("mqttStatusText")) g("mqttStatusText").textContent = connected ? "Connected" : "Disconnected";
  g("sidebarMqttDot")?.classList.toggle("connected", connected);
  if (g("sidebarMqttText")) g("sidebarMqttText").textContent = connected ? "Online" : "Offline";
  const sv = g("mqttStatusSettings");
  if (sv) { 
    sv.textContent = connected ? "Terhubung" : "Disconnected"; 
    sv.className = "setting-val " + (connected ? "ok" : "muted"); 
  }
  updateDashboardStats();
}

function subscribeToAllTopics() {
  if (!STATE.mqtt.connected || !STATE.mqtt.client) return;
  Object.values(STATE.deviceTopics).forEach((t) => {
    if (t.sub) try { STATE.mqtt.client.subscribe(t.sub); } catch (_) {}
  });
  Object.values(STATE.sensors).forEach((s) => {
    if (s.topic) try { STATE.mqtt.client.subscribe(s.topic); } catch (_) {}
  });
}

function publishMQTT(topic, payload) {
  if (!STATE.mqtt.connected || !STATE.mqtt.client || !topic) return false;
  try {
    const msg = new Paho.MQTT.Message(JSON.stringify(payload));
    msg.destinationName = topic;
    STATE.mqtt.client.send(msg);
    return true;
  } catch { return false; }
}

function handleMQTTMessage(topic, payload) {
  for (const [id, topics] of Object.entries(STATE.deviceTopics)) {
    if (topics.sub === topic) {
      try {
        const data = JSON.parse(payload);
        const ns   = data.state === 1 || data.state === true || data.state === "on";
        const prev = STATE.deviceStates[id];
        STATE.deviceStates[id] = ns;
        if (data.speed !== undefined && STATE.deviceExtras[id]) STATE.deviceExtras[id].fanSpeed = data.speed;
        if (data.temp  !== undefined && STATE.deviceExtras[id]) STATE.deviceExtras[id].acTemp   = data.temp;
        if (data.mode  !== undefined && STATE.deviceExtras[id]) STATE.deviceExtras[id].acMode   = data.mode;
        if (ns !== prev) {
          if (ns) STATE.deviceOnAt[id] = Date.now();
          else delete STATE.deviceOnAt[id];
          apiPost("update_device_state", { id, state: ns ? 1 : 0, trigger: "MQTT" }).catch(() => {});
          addLog(STATE.devices[id]?.name, `Status: ${ns ? "ON" : "OFF"}`, "MQTT", "info");
        }
      } catch {
        const raw = payload.toLowerCase().trim();
        STATE.deviceStates[id] = (raw === "1" || raw === "on");
      }
      updateDeviceUI(id);
      updateDashboardStats();
      return;
    }
  }
  for (const [id, sensor] of Object.entries(STATE.sensors)) {
    if (sensor.topic === topic) {
      try {
        const data = JSON.parse(payload);
        const val = typeof data.value !== "undefined" ? parseFloat(data.value) : (typeof data === "number" ? data : parseFloat(payload));
        if (!isNaN(val)) processSensorValue(id, val);
      } catch {
        const val = parseFloat(payload);
        if (!isNaN(val)) processSensorValue(id, val);
      }
      return;
    }
  }
}

function processSensorValue(sensorId, val) {
  STATE.sensorData[sensorId] = val;
  if (!STATE.sensorHistory[sensorId]) STATE.sensorHistory[sensorId] = [];
  STATE.sensorHistory[sensorId].push({ val, ts: Date.now() });
  if (STATE.sensorHistory[sensorId].length > 30) STATE.sensorHistory[sensorId].shift();
  const sensor = STATE.sensors[sensorId];
  if (sensor?.type === "presence" || sensor?.type === "motion") updateSensorBoolUI(sensorId);
  else updateSensorValueUI(sensorId);
  document.getElementById(`sensor-card-${sensorId}`)?.classList.add("has-data");
  if (typeof automationEngine !== "undefined" && automationEngine.isActive) automationEngine.evaluateSensorRules(sensorId, val);
  apiPost("update_sensor_value", { id: sensorId, value: val }).catch(() => {});
  updateDashboardStats();
}

function openMQTTConfigModal()  { document.getElementById("mqttConfigModal")?.classList.add("show"); }
function closeMQTTConfigModal() { document.getElementById("mqttConfigModal")?.classList.remove("show"); }

async function saveMQTTConfig() {
  const broker   = document.getElementById("mqttBroker")?.value.trim();
  const port     = parseInt(document.getElementById("mqttPort")?.value);
  const clientId = document.getElementById("mqttClientId")?.value.trim() || "iotzy_web";
  const path     = document.getElementById("mqttPath")?.value.trim() || "/mqtt";
  const useSSL   = document.getElementById("mqttUseSSL")?.checked ?? true;
  const username = document.getElementById("mqttUsername")?.value.trim() || "";
  const password = document.getElementById("mqttPassword")?.value || "";
  if (!broker || !port) { showToast("Broker dan port harus diisi!", "warning"); return; }
  const payload = {
    mqtt_broker: broker, mqtt_port: port, mqtt_client_id: clientId,
    mqtt_path: path, mqtt_use_ssl: useSSL ? 1 : 0, mqtt_username: username,
  };
  if (password) payload.mqtt_password = password;
  const result = await apiPost("save_settings", payload);
  if (result?.success) { 
    showToast("Konfigurasi MQTT disimpan!", "success"); 
    closeMQTTConfigModal(); 
    await connectMQTT(); 
  } else {
    showToast("Gagal menyimpan konfigurasi", "error");
  }
}
