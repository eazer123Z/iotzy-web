/**
 * app.js — Unified IoTzy Logic (Merged & Native)
 */

// ═══ GLOBAL CONFIG & STATE ═══
const CONFIG = {
  mqtt: { broker: "mosquitto", port: 1883, path: "/mqtt", maxReconnect: 5, reconnectDelay: 5000 },
  app:  { maxLogs: 50, version: "2.5.0-native" }
};

const STATE = {
  mqtt: { client: null, connected: false, reconnectAttempts: 0, templates: [] },
  devices: {}, deviceStates: {}, deviceTopics: {}, deviceExtras: {}, deviceOnAt: {},
  sensors: {}, sensorData: {}, sensorHistory: {},
  logs: [], logTypeFilter: "all",
  quickControlDevices: [],
  camera: { active: false, stream: null, selectedDeviceId: null, availableDevices: [] },
  cv: { active: false, modelLoaded: false, personCount: 0, personPresent: false, brightness: 0, lightCondition: "unknown" },
  sessionStart: Date.now(),
  automationRules: {}
};

// ═══ CORE UTILS ═══
function escHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

async function apiPost(action, data = {}) {
  try {
    const base = (typeof APP_BASE !== "undefined" ? APP_BASE.replace(/\/$/, "") : "") + "/router.php";
    const hdrs = { "Content-Type": "application/json" };
    if (typeof CSRF_TOKEN !== "undefined") hdrs["X-CSRF-Token"] = CSRF_TOKEN;
    const res = await fetch(`${base}?action=${action}`, { method: "POST", headers: hdrs, credentials: "include", body: JSON.stringify(data) });
    if (res.status === 401) { window.location.href = (typeof APP_BASE !== "undefined" ? APP_BASE : "") + "/?route=login&expired=true"; return null; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) { console.error(`API Error [${action}]:`, e); return null; }
}

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const icons = { success: "fa-check-circle", error: "fa-times-circle", warning: "fa-exclamation-triangle", info: "fa-circle-info" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info} toast-icon"></i><span class="toast-msg">${escHtml(message)}</span><button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add("hide"); setTimeout(() => toast.remove(), 400); }, 3500);
}

// ═══ NAVIGATION (SPA) ═══
function switchPage(pageId, element) {
  document.querySelectorAll(".view").forEach((p) => p.classList.remove("active"));
  const view = document.getElementById(pageId);
  if (view) view.classList.add("active");
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
  if (element) element.classList.add("active");
  if (pageId === "dashboard") updateDashboardStats();
  if (pageId === "devices") renderDevices();
  if (pageId === "sensors") renderSensors();
  if (pageId === "automation") renderAutomationView();
}

// ═══ MQTT MANAGER ═══
async function connectMQTT() {
  try {
    let broker = PHP_SETTINGS.mqtt_broker || CONFIG.mqtt.broker;
    let port = parseInt(PHP_SETTINGS.mqtt_port) || CONFIG.mqtt.port;
    if (port === 1883) port = 9001;
    const clientId = "iotzy_" + Math.random().toString(16).substr(2, 6);
    const path = PHP_SETTINGS.mqtt_path || "/mqtt";
    const useSSL = !!PHP_SETTINGS.mqtt_use_ssl;

    if (STATE.mqtt.client && STATE.mqtt.connected) { try { STATE.mqtt.client.disconnect(); } catch (_) {} }
    STATE.mqtt.client = new Paho.MQTT.Client(broker, port, path, clientId);
    STATE.mqtt.client.onConnectionLost = (res) => { updateMQTTStatus(false); if (res.errorCode !== 0) setTimeout(connectMQTT, 5000); };
    STATE.mqtt.client.onMessageArrived = (msg) => handleMQTTMessage(msg.destinationName, msg.payloadString);

    STATE.mqtt.client.connect({
      useSSL, timeout: 5, onSuccess: () => { updateMQTTStatus(true); subscribeToAllTopics(); },
      onFailure: () => updateMQTTStatus(false)
    });
  } catch (e) { console.error("MQTT Connect Error:", e); }
}

function updateMQTTStatus(connected) {
  STATE.mqtt.connected = connected;
  document.getElementById("sidebarMqttDot")?.classList.toggle("connected", connected);
  document.getElementById("sidebarMqttText")?.textContent = connected ? "Online" : "Offline";
}

function subscribeToAllTopics() {
  if (!STATE.mqtt.connected) return;
  Object.values(STATE.deviceTopics).forEach(t => { if (t.sub) STATE.mqtt.client.subscribe(t.sub); });
  Object.values(STATE.sensors).forEach(s => { if (s.topic) STATE.mqtt.client.subscribe(s.topic); });
}

function publishMQTT(topic, payload) {
  if (!STATE.mqtt.connected || !topic) return;
  const msg = new Paho.MQTT.Message(JSON.stringify(payload));
  msg.destinationName = topic;
  STATE.mqtt.client.send(msg);
}

function handleMQTTMessage(topic, payload) {
  // Device Check
  for (const [id, t] of Object.entries(STATE.deviceTopics)) {
    if (t.sub === topic) {
      try {
        const data = JSON.parse(payload);
        STATE.deviceStates[id] = !!data.state;
        updateDeviceUI(id);
      } catch (_) {}
    }
  }
  // Sensor Check
  for (const [id, s] of Object.entries(STATE.sensors)) {
    if (s.topic === topic) {
      const val = parseFloat(payload);
      if (!isNaN(val)) processSensorValue(id, val);
    }
  }
}

// ═══ DEVICE MANAGER ═══
function updateDeviceUI(id) {
  const card = document.getElementById(`card-${id}`);
  if (!card) return;
  const isOn = !!STATE.deviceStates[id];
  card.classList.toggle("on", isOn);
  const tog = document.getElementById(`device-toggle-${id}`);
  if (tog) tog.checked = isOn;
  const lbl = document.getElementById(`lbl-${id}`);
  if (lbl) lbl.textContent = isOn ? "Aktif" : "Mati";
}

function toggleDeviceState(id, state) {
  STATE.deviceStates[id] = state;
  updateDeviceUI(id);
  const t = STATE.deviceTopics[id];
  if (t?.pub) publishMQTT(t.pub, { state: state ? 1 : 0 });
  apiPost("update_device_state", { id, state: state ? 1 : 0 });
}

function renderDevices() {
  const grid = document.getElementById("devicesGrid");
  if (!grid) return;
  grid.innerHTML = Object.keys(STATE.devices).map(id => {
    const d = STATE.devices[id];
    const isOn = !!STATE.deviceStates[id];
    return `
      <div class="device-card ${isOn ? 'on' : ''}" id="card-${id}">
        <div class="device-card-header">
          <div class="device-icon ${isOn ? 'on' : ''}"><i class="fas ${d.icon || 'fa-plug'}"></i></div>
          <div class="device-actions"><button onclick="removeDevice('${id}')" class="trash-btn"><i class="fas fa-trash"></i></button></div>
        </div>
        <div class="device-info">
          <div class="device-name">${escHtml(d.name)}</div>
          <div class="device-status" id="lbl-${id}">${isOn ? "Aktif" : "Mati"}</div>
        </div>
        <div class="device-controls">
          <label class="toggle-wrapper"><input type="checkbox" id="device-toggle-${id}" ${isOn?'checked':''} onchange="toggleDeviceState('${id}',this.checked)"><span class="toggle-track"></span></label>
        </div>
      </div>`;
  }).join("");
}

// ═══ SENSOR MANAGER ═══
function processSensorValue(id, val) {
  STATE.sensorData[id] = val;
  updateSensorValueUI(id);
  if (typeof automationEngine !== "undefined" && automationEngine.evaluateSensorRules) {
    automationEngine.evaluateSensorRules(id, val);
  }
}

function updateSensorValueUI(id) {
  const el = document.getElementById(`val-${id}`);
  if (el) el.textContent = STATE.sensorData[id].toFixed(1);
}

function renderSensors() {
  const grid = document.getElementById("sensorsGrid");
  if (!grid) return;
  grid.innerHTML = Object.values(STATE.sensors).map(s => {
    const val = STATE.sensorData[s.id] || 0;
    return `
      <div class="sensor-card has-data">
        <div class="sensor-card-top"><div class="sensor-name">${escHtml(s.name)}</div></div>
        <div class="sensor-value-big" id="val-${s.id}">${val.toFixed(1)}${s.unit}</div>
      </div>`;
  }).join("");
}

// ═══ DASHBOARD ═══
function updateDashboardStats() {
  const active = Object.values(STATE.deviceStates).filter(Boolean).length;
  const total = Object.keys(STATE.devices).length;
  if (document.getElementById("statActiveDevicesVal")) document.getElementById("statActiveDevicesVal").textContent = active;
  if (document.getElementById("statActiveDevicesSub")) document.getElementById("statActiveDevicesSub").textContent = `dari ${total} perangkat`;
  if (document.getElementById("statMqttVal")) {
    document.getElementById("statMqttVal").textContent = STATE.mqtt.connected ? "Online" : "Offline";
    document.getElementById("statMqttVal").style.color = STATE.mqtt.connected ? "var(--green)" : "var(--red)";
  }
}

// ═══ AI CHAT ═══
function initAIChat() {
  const input = document.getElementById("aiChatInput");
  const send = document.getElementById("aiChatSend");
  if (!input || !send) return;
  send.onclick = async () => {
    const msg = input.value.trim(); if (!msg) return;
    appendChatMessage(msg, "user");
    input.value = "";
    const res = await apiPost("ai_chat_process", { message: msg });
    if (res?.success) appendChatMessage(res.message, "bot");
  };
}

function appendChatMessage(text, side) {
  const body = document.getElementById("aiChatBody");
  if (!body) return;
  const div = document.createElement("div");
  div.className = `chat-bubble ${side}`;
  div.textContent = text;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}

// ═══ INITIALIZATION ═══
document.addEventListener("DOMContentLoaded", () => {
  // Sync Data from PHP
  if (typeof PHP_DEVICES !== "undefined") {
    PHP_DEVICES.forEach(d => {
      STATE.devices[d.id] = d;
      STATE.deviceStates[d.id] = !!d.state;
      STATE.deviceTopics[d.id] = { sub: d.topic_sub, pub: d.topic_pub };
    });
  }
  if (typeof PHP_SENSORS !== "undefined") {
    PHP_SENSORS.forEach(s => { STATE.sensors[s.id] = s; STATE.sensorData[s.id] = s.last_value || 0; });
  }

  initAIChat();
  connectMQTT();
  updateDashboardStats();
  
  // Sidebar Toggle
  document.querySelectorAll(".sidebar-toggle").forEach(btn => {
    btn.onclick = (e) => { e.stopPropagation(); document.getElementById("sidebar").classList.toggle("open"); };
  });
  
  // Auto Clock
  setInterval(() => {
    const el = document.getElementById("ovClock");
    if (el) el.textContent = new Date().toLocaleTimeString("id-ID", { hour12: false });
  }, 1000);
});
