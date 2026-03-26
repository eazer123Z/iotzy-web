/**
 * public/assets/js/modules/sensor-manager.js
 * ───
 * Pengelola Data Sensor IoTzy.
 * Menangani visualisasi real-time (Gauge, Grafik Sparkline), 
 * pembaruan nilai sensor, serta pengkategorian status pembacaan data (Suhu, Udara, dsb).
 */


/* ==================== SENSOR CONFIGURATIONS ==================== */

/**
 * Konfigurasi tampilan untuk setiap tipe sensor.
 * Berisi warna, ambang batas, icon, dan kelas CSS terkait.
 */
const SENSOR_CONFIG = {
  temperature: { icon: "fa-temperature-half", color: "var(--red)",    min: 10, max: 40,  unit: "°C",  barClass: "temp-bar",       gaugeColor: "#ef4444" },
  humidity:    { icon: "fa-droplet",          color: "var(--blue)",   min: 0,  max: 100, unit: "%",   barClass: "humidity-bar",   gaugeColor: "#3b82f6" },
  air_quality: { icon: "fa-wind",             color: "var(--teal)",   min: 0,  max: 500, unit: "AQI", barClass: "air-bar",        gaugeColor: "#0d9488" },
  presence:    { icon: "fa-user-check",       color: "var(--green)"  },
  brightness:  { icon: "fa-sun",             color: "var(--amber)",  min: 0,  max: 1,   unit: "",    barClass: "brightness-bar", gaugeColor: "#f59e0b" },
  motion:      { icon: "fa-person-running",   color: "var(--purple)" },
  smoke:       { icon: "fa-fire",             color: "var(--red)",    min: 0,  max: 300, unit: "ppm", barClass: "smoke-bar",       gaugeColor: "#ef4444" },
  gas:         { icon: "fa-triangle-exclamation", color: "var(--amber)", min: 0, max: 1000, unit: "ppm", barClass: "gas-bar",    gaugeColor: "#f59e0b" },
};

const SENSOR_LABELS = {
  temperature: "Suhu",        humidity:    "Kelembaban",
  air_quality: "Kualitas Udara", presence: "Kehadiran",
  brightness:  "Kecerahan",  motion:       "Gerakan",
  smoke:       "Asap",       gas:          "Gas",
};

/**
 * Label status untuk Air Quality Index (AQI).
 */
function getAQILabel(val) {
  if (val < 50)  return { label: "Baik",         color: "#22c55e", bg: "#f0fdf4" };
  if (val < 100) return { label: "Sedang",        color: "#eab308", bg: "#fefce8" };
  if (val < 150) return { label: "Tidak Sehat",   color: "#f97316", bg: "#fff7ed" };
  if (val < 200) return { label: "Sangat Buruk",  color: "#ef4444", bg: "#fef2f2" };
  return           { label: "Berbahaya",          color: "#7c3aed", bg: "#f5f3ff" };
}

/**
 * Label status untuk deteksi asap/gas berbahaya.
 */
function getSmokeDangerLabel(val) {
  if (val < 50)  return { label: "Normal",  color: "var(--green)", cls: "" };
  if (val < 100) return { label: "Waspada", color: "var(--amber)", cls: "warning" };
  return           { label: "BAHAYA!",      color: "var(--red)",   cls: "danger" };
}

/* ==================== RENDERING LOGIC ==================== */

/**
 * Membangun elemen kartu (Card) untuk satu sensor.
 * Menggunakan template berbeda berdasarkan tipe sensor (Gauge vs Progress Bar).
 */
function renderSensorCard(sensorId) {
  const sensor = STATE.sensors[sensorId];
  const val    = STATE.sensorData[sensorId];
  const cfg    = SENSOR_CONFIG[sensor.type] || {};
  const tLabel = SENSOR_LABELS[sensor.type] || sensor.type;
  const hasVal = val !== null && val !== undefined;
  
  const card   = document.createElement("div");
  card.id        = `sensor-card-${sensorId}`;
  card.className = "sensor-card" + (hasVal ? " has-data" : "");
  card.setAttribute("data-type", sensor.type);

  // Header Kartu: Icon, Nama, dan Aksi (Edit/Hapus)
  const topHTML = `
    <div class="sensor-card-top">
      <div class="sensor-card-info">
        <div class="sensor-big-icon" style="background:${cfg.color ? `color-mix(in srgb, ${cfg.color} 14%, transparent)` : 'var(--surface-3)'}">
          <i class="fas ${sensor.icon || cfg.icon || "fa-microchip"}" style="color:${cfg.color || "var(--ink-3)"}"></i>
        </div>
        <div>
          <div class="sensor-name">${escHtml(sensor.name)}</div>
          <div class="sensor-type-label">${tLabel}</div>
        </div>
      </div>
      <div class="sensor-card-actions">
        <button class="icon-btn small" onclick="openSensorSettings('${sensorId}')"><i class="fas fa-sliders"></i></button>
        <button class="trash-btn" onclick="removeSensor('${sensorId}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;

  let bodyHTML = "";
  
  // Custom Card Body berdasarkan tipe
  if (sensor.type === "presence") {
    // Tipe Presence: Hanya titik deteksi
    const isD = !!val;
    bodyHTML = `<div class="presence-status"><div class="presence-dot${isD ? " detected" : ""}" id="presence-dot-${sensorId}"></div><div class="presence-text" id="presence-txt-${sensorId}">${isD ? "Terdeteksi" : "Tidak Terdeteksi"}</div></div><div class="sensor-meta"><span style="font-size:10.5px;color:var(--ink-5)">PIR / Ultrasonic</span><span class="sensor-meta-val" id="time-${sensorId}">—</span></div>`;
  } else if (sensor.type === "motion") {
    // Tipe Motion: Icon animasi
    const isM = !!val;
    bodyHTML = `<div class="motion-indicator${isM ? " active" : ""}" id="motion-ind-${sensorId}"><i class="fas fa-person-running motion-icon" style="color:${isM ? "var(--purple)" : "var(--ink-5)"}"></i><div style="flex:1"><div style="font-size:12.5px;font-weight:700;color:${isM ? "var(--purple)" : "var(--ink-3)"}" id="motion-txt-${sensorId}">${isM ? "Gerakan Terdeteksi" : "Tidak Ada Gerakan"}</div><div style="font-size:10px;color:var(--ink-5)" id="time-${sensorId}">—</div></div></div>`;
  } else if (sensor.type === "humidity") {
    // Tipe Humidity: Circular Gauge SVG
    const pct    = hasVal ? Math.min(100, val) : 0;
    const valStr = hasVal ? val.toFixed(1) : "";
    bodyHTML = `<div style="display:flex;align-items:center;gap:12px"><div style="flex:1"><div class="sensor-value-big" id="val-${sensorId}">${valStr}<span style="font-size:13px;font-weight:500">${sensor.unit || "%"}</span></div><div style="font-size:10.5px;color:var(--ink-5);margin-top:2px" id="hum-desc-${sensorId}">${hasVal ? (val < 40 ? "Terlalu Kering" : val > 70 ? "Terlalu Lembab" : "Normal") : ""}</div></div><div style="width:80px;height:80px;flex-shrink:0"><svg viewBox="0 0 80 80" class="gauge-svg" id="gauge-svg-${sensorId}"><circle cx="40" cy="40" r="30" fill="none" stroke="var(--border)" stroke-width="7"/><circle cx="40" cy="40" r="30" fill="none" stroke="#3b82f6" stroke-width="7" stroke-dasharray="${(pct / 100) * 188.4} 188.4" stroke-dashoffset="47.1" stroke-linecap="round" transform="rotate(-90 40 40)" id="gauge-circle-${sensorId}"/><text x="40" y="44" text-anchor="middle" font-size="14" font-weight="800" fill="var(--ink)" font-family="var(--mono)">${hasVal ? Math.round(val) : ""}</text></svg></div></div><div class="sensor-meta"><span class="sensor-meta-val" id="time-${sensorId}">—</span></div><canvas class="sparkline-canvas" id="spark-${sensorId}"></canvas>`;
  } else {
    // Tipe General: Progress Bar mendatar + Sparkline
    let pct = 0;
    if (hasVal && cfg.min !== undefined && cfg.max !== undefined)
      pct = Math.min(100, Math.max(0, ((val - cfg.min) / (cfg.max - cfg.min)) * 100));
    const prec   = sensor.type === "brightness" ? 2 : 1;
    const valStr = hasVal ? val.toFixed(prec) + (sensor.unit || "") : "";
    bodyHTML = `<div class="sensor-status-row"><span class="sensor-value-big" id="val-${sensorId}">${valStr}</span><span class="sensor-meta-val" id="time-${sensorId}">—</span></div><canvas class="sparkline-canvas" id="spark-${sensorId}"></canvas><div class="progress-track"><div class="progress-fill ${cfg.barClass || "default-bar"}" id="bar-${sensorId}" style="width:${pct}%"></div></div><div class="progress-labels"><span>${cfg.min !== undefined ? cfg.min + (sensor.unit || "") : "Min"}</span><span>${cfg.max !== undefined ? cfg.max + (sensor.unit || "") : "Max"}</span></div>`;
  }

  card.innerHTML = topHTML + bodyHTML;
  return card;
}

/**
 * Merender daftar semua sensor yang ada di State ke grid UI.
 */
function renderSensors() {
  const grid  = document.getElementById("sensorsGrid");
  const empty = document.getElementById("emptySensors");
  if (!grid) return;
  
  grid.innerHTML = "";
  const keys = Object.keys(STATE.sensors);
  if (empty) empty.classList.toggle("hidden", keys.length > 0);
  
  keys.forEach((id) => {
    const card = renderSensorCard(id);
    grid.appendChild(card);
    // Render grafik garis (sparkline) setelah elemen masuk ke DOM
    requestAnimationFrame(() => drawSparkline(id));
  });
}

/**
 * Memperbarui nilai numerik sensor di UI tanpa melakukan render ulang seluruh kartu.
 * Dipanggil oleh MQTT Manager saat pesan data masuk.
 */
function updateSensorValueUI(sensorId) {
  const val    = STATE.sensorData[sensorId];
  const sensor = STATE.sensors[sensorId];
  if (val === null || val === undefined || !sensor) return;

  const cfg   = SENSOR_CONFIG[sensor.type] || {};
  const now   = new Date().toLocaleTimeString("id-ID");
  const valEl = document.getElementById(`val-${sensorId}`);
  const barEl = document.getElementById(`bar-${sensorId}`);
  const timeEl = document.getElementById(`time-${sensorId}`);
  
  if (timeEl) timeEl.textContent = now;

  // Logika update spesifik per tipe (Optimized)
  if (sensor.type === "humidity") {
    if (valEl) valEl.innerHTML = `${val.toFixed(1)}<span style="font-size:13px;font-weight:500">${sensor.unit || "%"}</span>`;
    const gc = document.getElementById(`gauge-circle-${sensorId}`);
    if (gc) { 
      const pct = Math.min(100, val); 
      gc.setAttribute("stroke-dasharray", `${(pct / 100) * 188.4} 188.4`); 
    }
    const desc = document.getElementById(`hum-desc-${sensorId}`);
    if (desc) desc.textContent = val < 40 ? "Terlalu Kering" : val > 70 ? "Terlalu Lembab" : "Normal";
  } else if (sensor.type === "air_quality") {
    if (valEl) valEl.innerHTML = `${val.toFixed(0)} <span style="font-size:13px;font-weight:500">${sensor.unit || "AQI"}</span>`;
    if (barEl && cfg.max) barEl.style.width = Math.min(100, (val / cfg.max) * 100) + "%";
  } else if (sensor.type === "smoke" || sensor.type === "gas") {
    if (valEl) valEl.innerHTML = `${val.toFixed(0)} <span style="font-size:13px;font-weight:500">${sensor.unit || "ppm"}</span>`;
    if (barEl && cfg.max) barEl.style.width = Math.min(100, (val / cfg.max) * 100) + "%";
  } else {
    const prec = sensor.type === "brightness" ? 2 : 1;
    if (valEl) valEl.textContent = val.toFixed(prec) + (sensor.unit || "");
    if (barEl && cfg.min !== undefined && cfg.max !== undefined) {
      const p = Math.min(100, Math.max(0, ((val - cfg.min) / (cfg.max - cfg.min)) * 100));
      barEl.style.width = p + "%";
    }
  }

  // Tandai kartu memiliki data dan gambar ulang Sparkline
  document.getElementById(`sensor-card-${sensorId}`)?.classList.add("has-data");
  drawSparkline(sensorId);
}

/**
 * Memperbarui UI sensor bertipe Boolean (Terdeteksi vs Tidak).
 */
function updateSensorBoolUI(sensorId) {
  const val    = STATE.sensorData[sensorId];
  const sensor = STATE.sensors[sensorId];
  const timeEl = document.getElementById(`time-${sensorId}`);
  if (timeEl) timeEl.textContent = new Date().toLocaleTimeString("id-ID");

  if (sensor.type === "presence") {
    const dot = document.getElementById(`presence-dot-${sensorId}`);
    const txt = document.getElementById(`presence-txt-${sensorId}`);
    if (dot) dot.classList.toggle("detected", !!val);
    if (txt) txt.textContent = val ? "Terdeteksi" : "Tidak Terdeteksi";
  } else if (sensor.type === "motion") {
    const ind = document.getElementById(`motion-ind-${sensorId}`);
    const txt = document.getElementById(`motion-txt-${sensorId}`);
    if (ind) ind.className = `motion-indicator${val ? " active" : ""}`;
    if (txt) txt.textContent = val ? "Gerakan Terdeteksi" : "Tidak Ada Gerakan";
  }
  
  document.getElementById(`sensor-card-${sensorId}`)?.classList.toggle("has-data", val !== null && val !== undefined);
}

/**
 * Menggambar riwayat data (history) sensor ke Canvas Sparkline (Grafik Garis).
 */
function drawSparkline(sensorId) {
  const canvas = document.getElementById(`spark-${sensorId}`);
  if (!canvas) return;

  const rawHistory = STATE.sensorHistory[sensorId] || [];
  const history    = rawHistory.map((h) => (typeof h === "object" ? h.val : h));
  if (history.length < 2) return;

  const W   = canvas.clientWidth || canvas.offsetWidth || 200;
  const H   = canvas.clientHeight || canvas.offsetHeight || 38;
  canvas.width = W; canvas.height = H;

  const ctx  = canvas.getContext("2d");
  ctx.clearRect(0, 0, W, H);
  
  const mn   = Math.min(...history), mx = Math.max(...history), range = mx - mn || 1;
  const pts  = history.map((v, i) => ({ 
    x: (i / (history.length - 1)) * W, 
    y: H - ((v - mn) / range) * (H - 6) - 3 
  }));

  const cfg  = SENSOR_CONFIG[STATE.sensors[sensorId]?.type] || {};
  const color = cfg.gaugeColor || "#0ea5e9";

  // Gambar area gradient di bawah garis
  const grad  = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, color + "28"); grad.addColorStop(1, color + "05");
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  // Gambar garis utama
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.lineJoin = "round"; ctx.stroke();

  // Gambar titik data terakhir
  const last = pts[pts.length - 1];
  ctx.beginPath(); ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
}

function filterSensors(q) {
  const lq = q.toLowerCase();
  document.querySelectorAll(".sensor-card").forEach((c) => {
    const id = c.id.replace("sensor-card-", "");
    c.style.display = (STATE.sensors[id]?.name?.toLowerCase() || "").includes(lq) ? "" : "none";
  });
}

/* ==================== SENSOR CRUD ==================== */

function openAddSensorModal() {
  ["newSensorName", "newSensorUnit", "newSensorTopic"].forEach((id) => {
    const el = document.getElementById(id); if (el) el.value = "";
  });
  document.getElementById("addSensorModal")?.classList.add("active");
}

function closeAddSensorModal() { document.getElementById("addSensorModal")?.classList.remove("active"); }

/**
 * Menyimpan pendaftaran sensor baru ke backend.
 */
async function saveNewSensor() {
  const name = document.getElementById("newSensorName")?.value.trim();
  if (!name) { showToast("Nama sensor harus diisi!", "warning"); return; }
  
  const type  = document.getElementById("newSensorType")?.value  || "temperature";
  const unit  = document.getElementById("newSensorUnit")?.value.trim();
  const topic = document.getElementById("newSensorTopic")?.value.trim();
  
  if (!topic) { showToast("MQTT topic harus diisi!", "warning"); return; }

  const result = await apiPost("add_sensor", { name, type, unit, topic });
  if (result?.success) {
    const id      = String(result.id);
    const iconMap = {
      temperature: "fa-temperature-half", humidity: "fa-droplet", air_quality: "fa-wind",
      presence: "fa-user-check", brightness: "fa-sun", motion: "fa-person-running",
      smoke: "fa-fire", gas: "fa-triangle-exclamation",
    };
    
    // Update state lokal
    STATE.sensors[id]       = { id, name, type, icon: iconMap[type] || "fa-microchip", unit, topic, sensor_key: result.sensor_key };
    STATE.sensorData[id]    = null;
    STATE.sensorHistory[id] = [];
    
    // Subscribe ke broker MQTT
    if (STATE.mqtt.connected && topic) { try { STATE.mqtt.client.subscribe(topic); } catch (_) {} }
    
    renderSensors();
    document.getElementById("navSensorCount").textContent = Object.keys(STATE.sensors).length;
    closeAddSensorModal(); 
    showToast("Sensor ditambahkan!", "success");
    addLog(name, "Sensor baru ditambahkan", "System", "success");
  } else {
    showToast(result?.error || "Gagal menambah sensor", "error");
  }
}

function openSensorSettings(sensorId) {
  const id     = String(sensorId);
  const sensor = STATE.sensors[id];
  if (!sensor) return;
  const g = (i) => document.getElementById(i);
  if (g("ssSensorName")) g("ssSensorName").textContent = sensor.name;
  if (g("ssEditName"))   g("ssEditName").value  = sensor.name  || "";
  if (g("ssEditType"))   g("ssEditType").value  = sensor.type  || "temperature";
  if (g("ssEditUnit"))   g("ssEditUnit").value  = sensor.unit  || "";
  if (g("ssEditTopic"))  g("ssEditTopic").value = sensor.topic || "";
  const modal = document.getElementById("sensorSettingModal");
  if (modal) { modal.dataset.sensorId = id; modal.classList.add("active"); }
}

function closeSensorSettings() { document.getElementById("sensorSettingModal")?.classList.remove("active"); }

async function saveSensorSettings() {
  const modal = document.getElementById("sensorSettingModal");
  if (!modal) return;
  const id    = String(modal.dataset.sensorId);
  const name  = document.getElementById("ssEditName")?.value.trim();
  const type  = document.getElementById("ssEditType")?.value;
  const unit  = document.getElementById("ssEditUnit")?.value.trim();
  const topic = document.getElementById("ssEditTopic")?.value.trim();
  
  if (!name || !topic) { showToast("Nama dan topic harus diisi!", "warning"); return; }
  
  const result = await apiPost("update_sensor", { id, name, type, unit, topic });
  if (result?.success) {
    const iconMap = {
      temperature: "fa-temperature-half", humidity: "fa-droplet", air_quality: "fa-wind",
      presence: "fa-user-check", brightness: "fa-sun", motion: "fa-person-running",
      smoke: "fa-fire", gas: "fa-triangle-exclamation",
    };
    STATE.sensors[id] = { ...STATE.sensors[id], name, type, icon: iconMap[type] || STATE.sensors[id]?.icon || "fa-microchip", unit, topic };
    if (STATE.mqtt.connected && topic) { try { STATE.mqtt.client.subscribe(topic); } catch (_) {} }
    renderSensors(); 
    closeSensorSettings(); 
    showToast("Sensor diperbarui!", "success");
  } else {
    showToast("Gagal memperbarui sensor", "error");
  }
}

async function removeSensor(sensorId) {
  const id = String(sensorId);
  if (!confirm(`Hapus sensor "${STATE.sensors[id]?.name}"? Seluruh histori data akan hilang.`)) return;
  
  const result = await apiPost("delete_sensor", { id });
  if (result?.success) {
    const name = STATE.sensors[id]?.name;
    delete STATE.sensors[id]; delete STATE.sensorData[id]; delete STATE.sensorHistory[id];
    if (STATE.automationRules[id]) delete STATE.automationRules[id];
    
    renderSensors(); 
    renderAutomationView(); 
    updateDashboardStats();
    
    showToast("Sensor dihapus", "info"); 
    addLog(name, "Sensor dihapus", "System", "warning");
  } else {
    showToast("Gagal menghapus sensor", "error");
  }
}
