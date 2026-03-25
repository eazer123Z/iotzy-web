/**
 * app.js — Unified IoTzy Logic (Ultimate Native Build)
 * Consolidated from 17+ modules into one powerful file.
 */

// ═══ 1. GLOBAL CONFIG & STATE ═══
const CONFIG = {
  mqtt: { broker: "mosquitto", port: 1883, path: "/mqtt", maxReconnect: 5, reconnectDelay: 5000 },
  app:  { maxLogs: 50, version: "2.6.0-native-ultimate" },
  cv:   { model: { base: 'lite_mobilenet_v2' }, detection: { interval: 500, minConfidence: 0.6, debounceTime: 1500 } }
};

const STATE = {
  mqtt: { client: null, connected: false, reconnectAttempts: 0, templates: [] },
  devices: {}, deviceStates: {}, deviceTopics: {}, deviceExtras: {},
  sensors: {}, sensorData: {}, sensorHistory: {},
  logs: [], logTypeFilter: "all",
  automationRules: {},
  camera: { active: false, stream: null, selectedDeviceId: null, availableDevices: [] },
  cv: { active: false, modelLoaded: false, personCount: 0, personPresent: false, brightness: 0, lightCondition: "unknown" },
  sessionStart: Date.now()
};

// ═══ 2. CORE UTILS & API ═══
function escHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

async function apiPost(action, data = {}) {
  try {
    const base = (typeof APP_BASE !== "undefined" ? APP_BASE.replace(/\/$/, "") : "") + "/api/index.php";
    const hdrs = { "Content-Type": "application/json" };
    if (typeof CSRF_TOKEN !== "undefined") hdrs["X-CSRF-Token"] = CSRF_TOKEN;
    const res = await fetch(`${base}?action=${action}`, { method: "POST", headers: hdrs, credentials: "include", body: JSON.stringify(data) });
    if (res.status === 401) { window.location.href = (typeof APP_BASE !== "undefined" ? APP_BASE : "") + "/api/index.php?route=login&expired=true"; return null; }
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
  setTimeout(() => { toast.style.opacity = "0"; toast.style.transform = "translateX(20px)"; setTimeout(() => toast.remove(), 400); }, 3500);
}

// ═══ 3. NAVIGATION & UI ═══
function navSwitch(pageId, element) {
  if (!element) element = document.querySelector(`.nav-item[data-page="${pageId}"]`);
  document.querySelectorAll(".view").forEach(p => p.classList.remove("active"));
  const view = document.getElementById(pageId);
  if (view) view.classList.add("active");
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  if (element) element.classList.add("active");
  renderView(pageId);
}

// Alias for old references
const switchPage = navSwitch;

function renderView(pageId) {
  switch(pageId) {
    case 'dashboard': updateDashboardStats(); updateSummary(); initDashboardChart(); break;
    case 'devices': renderDevices(); break;
    case 'sensors': renderSensors(); break;
    case 'automation': renderAutomationView(); break;
    case 'camera': if (STATE.camera.active) updateCameraElements(true); break;
    case 'analytics': updateLogDisplay(); break;
  }
}

let dashboardChart = null;
function initDashboardChart() {
  const ctx = document.getElementById("ovOverviewChart");
  if (!ctx) return;
  if (dashboardChart) dashboardChart.destroy();
  const ds = Object.values(STATE.sensors).map(s => {
    return { label: s.name, data: [STATE.sensorData[s.id]||0], borderColor: 'var(--sky)', tension: 0.4 };
  });
  // Simple mock data for now
  dashboardChart = new Chart(ctx, { type: 'line', data: { labels: [new Date().toLocaleTimeString()], datasets: ds }, options: { responsive: true, plugins: { legend: { display: false } } } });
}

// Modal Management
function openModal(id) { const m = document.getElementById(id); if(m) m.classList.add("active"); }
function closeModal(id) { const m = document.getElementById(id); if(m) m.classList.remove("active"); }

function openQuickControlSettings() {
  const list = document.getElementById("quickControlDevicesList");
  if (!list) return;
  const current = PHP_SETTINGS.quick_control_devices || [];
  list.innerHTML = Object.values(STATE.devices).map(d => `
    <div class="modal-list-item">
      <label class="check-row">
        <input type="checkbox" name="qc_device" value="${d.id}" ${current.includes(d.id)?'checked':''}>
        <span><i class="fas ${d.icon}"></i> ${escHtml(d.name)}</span>
      </label>
    </div>
  `).join("");
  openModal("quickControlModal");
}

function closeQuickControlSettings() { closeModal("quickControlModal"); }
async function saveQuickControlSettings() {
  const ids = Array.from(document.querySelectorAll('input[name="qc_device"]:checked')).map(i => i.value);
  const res = await apiPost("save_settings", { quick_control_devices: JSON.stringify(ids) });
  if (res?.success) { showToast("Kontrol cepat disimpan", "success"); closeQuickControlSettings(); location.reload(); }
}

function openTopicSettings(id) {
  const d = STATE.devices[id]; if (!d) return;
  document.getElementById("topicDeviceName").textContent = d.name;
  document.getElementById("editDeviceName").value = d.name;
  document.getElementById("editDeviceIcon").value = d.icon;
  document.getElementById("deviceTopicSub").value = d.topic_sub || "";
  document.getElementById("deviceTopicPub").value = d.topic_pub || "";
  STATE.current_device_id = id;
  openModal("topicModal");
}
function closeTopicSettings() { closeModal("topicModal"); }
async function saveDeviceSettings() {
  const id = STATE.current_device_id;
  const data = { id, name: document.getElementById("editDeviceName").value, icon: document.getElementById("editDeviceIcon").value, topic_sub: document.getElementById("deviceTopicSub").value, topic_pub: document.getElementById("deviceTopicPub").value };
  const res = await apiPost("update_device", data);
  if (res?.success) { showToast("Perangkat diperbarui", "success"); closeTopicSettings(); location.reload(); }
}

// Add/Edit Modals Logic
function openAddDeviceModal() { openModal("addDeviceModal"); }
function closeAddDeviceModal() { closeModal("addDeviceModal"); }
async function saveNewDevice() {
  const data = { name: document.getElementById("newDeviceName").value, icon: document.getElementById("newDeviceIcon").value, topic_pub: document.getElementById("newDeviceTopicPub").value };
  const res = await apiPost("add_device", data);
  if (res?.success) { showToast("Perangkat ditambahkan", "success"); location.reload(); }
}

function openAddSensorModal() { openModal("addSensorModal"); }
function closeAddSensorModal() { closeModal("addSensorModal"); }
async function saveNewSensor() {
  const data = { name: document.getElementById("newSensorName").value, type: document.getElementById("newSensorType").value, unit: document.getElementById("newSensorUnit").value, topic: document.getElementById("newSensorTopic").value };
  const res = await apiPost("add_sensor", data);
  if (res?.success) { showToast("Sensor ditambahkan", "success"); location.reload(); }
}

function openMQTTConfigModal() {
  document.getElementById("mqttBroker").value = PHP_SETTINGS.mqtt_broker || "";
  document.getElementById("mqttPort").value = PHP_SETTINGS.mqtt_port || 1883;
  document.getElementById("mqttUseSSL").checked = !!PHP_SETTINGS.mqtt_use_ssl;
  openModal("mqttConfigModal");
}
function closeMQTTConfigModal() { closeModal("mqttConfigModal"); }
async function saveMQTTConfig() {
  const data = { mqtt_broker: document.getElementById("mqttBroker").value, mqtt_port: document.getElementById("mqttPort").value, mqtt_use_ssl: document.getElementById("mqttUseSSL").checked ? 1 : 0 };
  const res = await apiPost("save_settings", data);
  if (res?.success) { showToast("Konfigurasi MQTT disimpan", "success"); location.reload(); }
}

function openAddRuleModal() {
  const sSel = document.getElementById("addRuleCondition");
  const dSel = document.getElementById("addRuleDevice");
  if (!sSel || !dSel) return;
  sSel.innerHTML = Object.values(STATE.sensors).map(s => `<option value="${s.id}">${s.name}</option>`).join("");
  dSel.innerHTML = Object.values(STATE.devices).map(d => `<option value="${d.id}">${d.name}</option>`).join("");
  openModal("addRuleModal");
}
function closeAddRuleModal() { closeModal("addRuleModal"); }
async function saveNewAutomationRule() {
  const data = { sensor_id: document.getElementById("addRuleCondition").value, threshold: document.getElementById("addRuleThreshold").value, device_id: document.getElementById("addRuleDevice").value, action: document.getElementById("addRuleAction").value };
  const res = await apiPost("add_automation_rule", data);
  if (res?.success) { showToast("Otomasi dibuat", "success"); location.reload(); }
}

// ═══ 4. MQTT MANAGER ═══
async function connectMQTT() {
  try {
    let broker = PHP_SETTINGS.mqtt_broker || CONFIG.mqtt.broker;
    let port = parseInt(PHP_SETTINGS.mqtt_port) || CONFIG.mqtt.port;
    if (port === 1883) port = 9001;
    const clientId = "iotzy_" + Math.random().toString(16).substr(2, 6);
    const path = PHP_SETTINGS.mqtt_path || "/mqtt";
    STATE.mqtt.client = new Paho.MQTT.Client(broker, port, path, clientId);
    STATE.mqtt.client.onConnectionLost = (res) => { updateMQTTStatus(false); if (res.errorCode !== 0) setTimeout(connectMQTT, 5000); };
    STATE.mqtt.client.onMessageArrived = (msg) => handleMQTTMessage(msg.destinationName, msg.payloadString);
    STATE.mqtt.client.connect({ useSSL: !!PHP_SETTINGS.mqtt_use_ssl, timeout: 5, onSuccess: () => { updateMQTTStatus(true); subscribeTopics(); }, onFailure: () => updateMQTTStatus(false) });
  } catch (e) { console.error("MQTT Error:", e); }
}

function updateMQTTStatus(con) {
  STATE.mqtt.connected = con;
  const dot = document.getElementById("sidebarMqttDot");
  if (dot) dot.className = "mqtt-dot " + (con ? "connected" : "");
  const txt = document.getElementById("sidebarMqttText");
  if (txt) txt.textContent = con ? "Online" : "Offline";
}

function subscribeTopics() {
  if (!STATE.mqtt.connected) return;
  Object.values(STATE.deviceTopics).forEach(t => { if (t.sub) STATE.mqtt.client.subscribe(t.sub); });
  Object.values(STATE.sensors).forEach(s => { if (s.topic) STATE.mqtt.client.subscribe(s.topic); });
}

function publishMQTT(topic, payload) {
  if (!STATE.mqtt.connected || !topic) return;
  STATE.mqtt.client.send(new Paho.MQTT.Message(JSON.stringify(payload) || payload), topic);
}

function handleMQTTMessage(topic, payload) {
  for (const [id, t] of Object.entries(STATE.deviceTopics)) {
    if (t.sub === topic) { try { const data = JSON.parse(payload); STATE.deviceStates[id] = !!data.state; syncDeviceUI(id); } catch(_) { STATE.deviceStates[id] = payload == "1" || payload == "ON"; syncDeviceUI(id); } }
  }
  for (const [id, s] of Object.entries(STATE.sensors)) { if (s.topic === topic) { const val = parseFloat(payload); if (!isNaN(val)) processSensorValue(id, val); } }
}

// ═══ 5. DEVICE & SENSOR LOGIC ═══
function syncDeviceUI(id) {
  const card = document.getElementById(`card-${id}`); if (!card) return;
  const isOn = !!STATE.deviceStates[id];
  card.classList.toggle("on", isOn);
  const tog = document.getElementById(`device-toggle-${id}`); if (tog) tog.checked = isOn;
  const lbl = document.getElementById(`lbl-${id}`); if (lbl) lbl.textContent = isOn ? "Aktif" : "Mati";
}

function toggleDeviceState(id, state) {
  STATE.deviceStates[id] = state; syncDeviceUI(id);
  const t = STATE.deviceTopics[id]; if (t?.pub) publishMQTT(t.pub, { state: state ? 1 : 0 });
  apiPost("update_device_state", { id, state: state ? 1 : 0 });
}

function processSensorValue(id, val) {
  STATE.sensorData[id] = val;
  const el = document.getElementById(`val-${id}`); if (el) el.textContent = val.toFixed(1);
  if (automationEngine) automationEngine.evaluate(id, val);
}

function renderDevices() {
  const grid = document.getElementById("devicesGrid"); if (!grid) return;
  grid.innerHTML = Object.keys(STATE.devices).map(id => {
    const d = STATE.devices[id], isOn = !!STATE.deviceStates[id];
    return `<div class="device-card ${isOn?'on':''}" id="card-${id}">
      <div class="device-card-header"><div class="device-icon ${isOn?'on':''}"><i class="fas ${d.icon||'fa-plug'}"></i></div></div>
      <div class="device-name">${escHtml(d.name)}</div><div class="device-status" id="lbl-${id}">${isOn?"Aktif":"Mati"}</div>
      <div class="device-controls"><label class="toggle-wrapper"><input type="checkbox" id="device-toggle-${id}" ${isOn?'checked':''} onchange="toggleDeviceState('${id}',this.checked)"><span class="toggle-track"></span></label></div>
    </div>`;
  }).join("");
}

function renderSensors() {
  const grid = document.getElementById("sensorsGrid"); if (!grid) return;
  grid.innerHTML = Object.values(STATE.sensors).map(s => `
    <div class="sensor-card has-data"><div class="sensor-name">${escHtml(s.name)}</div><div class="sensor-value-big" id="val-${s.id}">${(STATE.sensorData[s.id]||0).toFixed(1)}${s.unit}</div></div>
  `).join("");
}

// ═══ 6. AUTOMATION ENGINE ═══
const automationEngine = {
  cooldowns: {},
  evaluate(sensorId, val) {
    const rules = STATE.automationRules[sensorId] || [];
    rules.forEach(rule => {
      if (!rule.enabled || !this.shouldFire(rule, val)) return;
      const key = `${sensorId}_${rule.ruleId}`, now = Date.now();
      if (this.cooldowns[key] && now - this.cooldowns[key] < (rule.delay || 5000)) return;
      this.cooldowns[key] = now;
      this.execute(rule.deviceId, rule.action, `Sensor: ${val}`);
    });
  },
  shouldFire(rule, val) {
    const v = parseFloat(val);
    if (rule.condition === 'gt') return v > rule.threshold;
    if (rule.condition === 'lt') return v < rule.threshold;
    return false;
  },
  execute(devId, action, reason) {
    if (action === 'on' || action === 'off') toggleDeviceState(devId, action === 'on');
    addLog(STATE.devices[devId]?.name, `${action.toUpperCase()} — ${reason}`, 'Automation', 'success');
  }
};

// ═══ 7. CAMERA & AI LOGIC (CV) ═══
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    STATE.camera.stream = stream; STATE.camera.active = true;
    updateCameraElements(true); return true;
  } catch (e) { showToast("Kamera ditolak: " + e.message, "error"); return false; }
}

function updateCameraElements(active) {
  const vid = document.getElementById("cameraFocus");
  if (vid && STATE.camera.stream) { vid.srcObject = STATE.camera.stream; vid.classList.toggle("hidden", !active); if(active) vid.play(); }
}

async function initCV() {
  showToast("Memuat AI Model...", "info");
  try {
    if (!window.tf) await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.11.0');
    if (!window.cocoSsd) await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3');
    STATE.cv.model = await cocoSsd.load();
    STATE.cv.modelLoaded = true;
    showToast("AI Model Siap!", "success");
    startCVDetection();
  } catch (e) { showToast("Gagal memuat AI", "error"); }
}

function startCVDetection() {
  if (!STATE.cv.modelLoaded || !STATE.camera.active) return;
  STATE.cv.active = true;
  const loop = async () => {
    if (!STATE.cv.active) return;
    const vid = document.getElementById("cameraFocus");
    if (vid && vid.readyState === 4) {
      const preds = await STATE.cv.model.detect(vid);
      const persons = preds.filter(p => p.class === 'person' && p.score > 0.6);
      STATE.cv.personCount = persons.length;
      document.getElementById("cvPersonCount") ? document.getElementById("cvPersonCount").textContent = persons.length : null;
    }
    requestAnimationFrame(loop);
  };
  loop();
}

// ═══ 8. LOGS & ANALYTICS ═══
function addLog(dev, act, trig, type) {
  const log = { waktu: new Date().toLocaleTimeString("id-ID"), device: dev || "System", activity: act, trigger: trig, type: type };
  STATE.logs.unshift(log); if (STATE.logs.length > CONFIG.app.maxLogs) STATE.logs.pop();
  updateLogDisplay();
}

function updateLogDisplay() {
  const container = document.getElementById("logsContainer"); if (!container) return;
  container.innerHTML = `<table class="log-table"><thead><tr><th>Waktu</th><th>Perangkat</th><th>Aktivitas</th><th>Trigger</th></tr></thead><tbody>` +
    STATE.logs.map(l => `<tr><td>${l.waktu}</td><td>${escHtml(l.device)}</td><td>${escHtml(l.activity)}</td><td><span class="log-badge ${l.type}">${l.trigger}</span></td></tr>`).join("") + `</tbody></table>`;
}

// ═══ 9. AI CHAT ═══
function initChat() {
  const input = document.getElementById("aiChatInput"), send = document.getElementById("aiChatSend");
  if (!input || !send) return;
  send.onclick = async () => {
    const text = input.value.trim(); if (!text) return;
    appendChat(text, "user"); input.value = "";
    const res = await apiPost("ai_chat_process", { message: text });
    if (res?.success) appendChat(res.message, "bot");
  };
}

function appendChat(txt, side) {
  const body = document.getElementById("aiChatBody"); if (!body) return;
  const div = document.createElement("div"); div.className = `chat-bubble ${side}`; div.textContent = txt;
  body.appendChild(div); body.scrollTop = body.scrollHeight;
}

// ═══ 10. INITIALIZATION ═══
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }

document.addEventListener("DOMContentLoaded", () => {
  // Sync Initial State
  if (typeof PHP_DEVICES !== "undefined") PHP_DEVICES.forEach(d => { STATE.devices[d.id] = d; STATE.deviceStates[d.id] = !!d.state; STATE.deviceTopics[d.id] = { sub: d.topic_sub, pub: d.topic_pub }; });
  if (typeof PHP_SENSORS !== "undefined") PHP_SENSORS.forEach(s => { STATE.sensors[s.id] = s; STATE.sensorData[s.id] = s.last_value || 0; });
  
  connectMQTT();
  initChat();
  setInterval(() => { const el = document.getElementById("ovClock"); if (el) el.textContent = new Date().toLocaleTimeString("id-ID", { hour12: false }); }, 1000);
  
  // Theme Toggle
  const themeBtn = document.getElementById("themeToggleBtn");
  if (themeBtn) themeBtn.onclick = () => { const cur = document.documentElement.getAttribute("data-theme"); const next = cur === "dark" ? "light" : "dark"; document.documentElement.setAttribute("data-theme", next); };

  // Sidebar Toggles
  document.querySelectorAll(".sidebar-toggle").forEach(b => b.onclick = (e) => { e.stopPropagation(); document.getElementById("sidebar").classList.toggle("open"); });
});

function updateDashboardStats() {
  const active = Object.values(STATE.deviceStates).filter(Boolean).length;
  if (document.getElementById("statActiveDevicesVal")) document.getElementById("statActiveDevicesVal").textContent = active;
  if (document.getElementById("statMqttVal")) document.getElementById("statMqttVal").textContent = STATE.mqtt.connected ? "Online" : "Offline";
}

function updateSummary() {
  const el = document.getElementById("ovStatusSummary"); if (!el) return;
  const active = Object.values(STATE.deviceStates).filter(Boolean).length;
  el.innerHTML = `<p><i class="fas fa-bolt" style="color:var(--amber)"></i> Ada <b>${active} perangkat</b> menyala. Sistem memantau energi secara real-time.</p>`;
}

function applyDeviceState(id, on, reason) { toggleDeviceState(id, on); }
function renderAutomationView() { /* Implement if needed or keep as simple as possible */ }
