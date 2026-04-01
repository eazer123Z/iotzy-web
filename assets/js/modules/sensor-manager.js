const SENSOR_CONFIG = {
  temperature: { icon: "fa-temperature-half", color: "var(--red)", min: 10, max: 40, unit: "C", gaugeColor: "#ef4444" },
  humidity:    { icon: "fa-droplet", color: "var(--blue)", min: 0, max: 100, unit: "%", gaugeColor: "#3b82f6" },
  air_quality: { icon: "fa-wind", color: "var(--teal)", min: 0, max: 500, unit: "AQI", gaugeColor: "#0d9488" },
  presence:    { icon: "fa-user-check", color: "var(--green)" },
  brightness:  { icon: "fa-sun", color: "var(--amber)", min: 0, max: 1, unit: "", gaugeColor: "#f59e0b" },
  motion:      { icon: "fa-person-running", color: "var(--purple)" },
  smoke:       { icon: "fa-fire", color: "var(--red)", min: 0, max: 300, unit: "ppm", gaugeColor: "#ef4444" },
  gas:         { icon: "fa-triangle-exclamation", color: "var(--amber)", min: 0, max: 1000, unit: "ppm", gaugeColor: "#f59e0b" },
  voltage:     { icon: "fa-bolt", color: "var(--accent)", min: 0, max: 24, unit: "V", gaugeColor: "#38bdf8" },
  current:     { icon: "fa-bolt", color: "var(--warning)", min: 0, max: 10, unit: "A", gaugeColor: "#f97316" },
  power:       { icon: "fa-bolt", color: "var(--success)", min: 0, max: 500, unit: "W", gaugeColor: "#22c55e" },
  distance:    { icon: "fa-ruler-horizontal", color: "var(--info)", min: 0, max: 500, unit: "cm", gaugeColor: "#06b6d4" },
};

const SENSOR_LABELS = {
  temperature: "Suhu",
  humidity: "Kelembaban",
  air_quality: "Kualitas Udara",
  presence: "Kehadiran",
  brightness: "Kecerahan",
  motion: "Gerakan",
  smoke: "Asap",
  gas: "Gas",
  voltage: "Tegangan",
  current: "Arus",
  power: "Daya",
  distance: "Jarak",
};

const SENSOR_HISTORY_LOADS = {};

async function ensureSensorTemplatesLoaded() {
  if (Array.isArray(STATE.sensorTemplates) && STATE.sensorTemplates.length) return STATE.sensorTemplates;
  if (STATE.sensorTemplatesPromise) return STATE.sensorTemplatesPromise;
  STATE.sensorTemplatesPromise = apiPost("get_sensor_templates", {})
    .then((result) => {
      STATE.sensorTemplates = result?.templates || [];
      return STATE.sensorTemplates;
    })
    .finally(() => {
      STATE.sensorTemplatesPromise = null;
    });
  return STATE.sensorTemplatesPromise;
}

function getSensorTemplateById(id) {
  const numericId = Number(id);
  return (STATE.sensorTemplates || []).find((template) => Number(template.id) === numericId) || null;
}

async function populateSensorTemplateSelect(selectId, selectedId = "") {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = `<option value="">Memuat sensor...</option>`;
  const templates = await ensureSensorTemplatesLoaded();
  select.innerHTML = `<option value="">Pilih sensor</option>` + templates.map((template) => {
    const selected = String(selectedId) === String(template.id) ? " selected" : "";
    return `<option value="${template.id}"${selected}>${escHtml(template.name)}</option>`;
  }).join("");
}

function populateSensorDeviceSelect(selectId, selectedId = "") {
  const select = document.getElementById(selectId);
  if (!select) return;
  const devices = Object.values(STATE.devices || {});
  select.innerHTML = `<option value="">Tanpa perangkat</option>` + devices.map((device) => {
    const selected = String(selectedId) === String(device.id) ? " selected" : "";
    return `<option value="${device.id}"${selected}>${escHtml(device.name)}</option>`;
  }).join("");
}

function syncSensorFormFromTemplate(prefix = "new") {
  const templateSelect = document.getElementById(prefix === "new" ? "newSensorTemplate" : "ssEditTemplate");
  const hint = document.getElementById(prefix === "new" ? "newSensorTypeHint" : "ssEditTypeHint");
  if (!templateSelect) return;
  const template = getSensorTemplateById(templateSelect.value);
  if (!template) {
    if (hint) hint.textContent = "Pilih sensor dulu agar ikon, jenis, dan satuan terpasang otomatis.";
    return;
  }
  const unitLabel = template.default_unit ? `, ${template.default_unit}` : "";
  if (hint) hint.textContent = `Ikon dan jenis otomatis: ${template.name} (${template.sensor_type || "sensor"}${unitLabel}).`;
}

function findBestSensorTemplateId(sensor) {
  const templates = STATE.sensorTemplates || [];
  if (!sensor || !templates.length) return "";
  if (sensor.sensor_template_id) return String(sensor.sensor_template_id);
  if (sensor.template_slug) {
    const bySlug = templates.find((template) => template.slug === sensor.template_slug);
    if (bySlug) return String(bySlug.id);
  }

  const sensorType = String(sensor.type || "").toLowerCase();
  const sensorUnit = String(sensor.unit || "").toLowerCase();
  const exact = templates.find((template) =>
    String(template.sensor_type || "").toLowerCase() === sensorType
    && String(template.default_unit || "").toLowerCase() === sensorUnit
  );
  if (exact) return String(exact.id);

  const byType = templates.find((template) => String(template.sensor_type || "").toLowerCase() === sensorType);
  return byType ? String(byType.id) : "";
}

async function loadSensorHistory(sensorId, limit = 24) {
  const id = String(sensorId);
  if (SENSOR_HISTORY_LOADS[id]) return SENSOR_HISTORY_LOADS[id];

  SENSOR_HISTORY_LOADS[id] = apiPost("get_sensor_history", { sensor_id: sensorId, limit })
    .then((result) => {
      if (!Array.isArray(result)) return [];
      STATE.sensorHistory[id] = result
        .map((row) => ({
          val: Number(row.value),
          t: row.recorded_at,
        }))
        .filter((point) => Number.isFinite(point.val))
        .slice(-30);
      drawSparkline(id);
      return STATE.sensorHistory[id];
    })
    .finally(() => {
      delete SENSOR_HISTORY_LOADS[id];
    });

  return SENSOR_HISTORY_LOADS[id];
}

function getSensorDisplayValue(sensor, val) {
  if (val === null || val === undefined || val === "") return "N/A";
  const unit = sensor.unit || SENSOR_CONFIG[sensor.type]?.unit || "";
  const precision = ["temperature", "humidity", "voltage", "current", "power", "distance"].includes(sensor.type) ? 2 : 0;
  return `${Number(val).toFixed(precision)}${unit}`;
}

function formatSensorTime(rawTime) {
  if (!rawTime) return "—";
  const parsed = new Date(rawTime);
  if (Number.isNaN(parsed.getTime())) return String(rawTime);
  return parsed.toLocaleTimeString("id-ID");
}

function pushSensorHistoryPoint(sensorId, value, timestamp = null) {
  const id = String(sensorId);
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return;

  if (!STATE.sensorHistory[id]) {
    STATE.sensorHistory[id] = [];
  }

  const pointTime = timestamp || STATE.sensors[id]?.last_seen || new Date().toISOString();
  const history = STATE.sensorHistory[id];
  const lastPoint = history[history.length - 1];
  const lastTime = lastPoint?.t ?? lastPoint?.ts ?? null;

  if (lastPoint && Number(lastPoint.val) === numericValue && String(lastTime || "") === String(pointTime || "")) {
    return;
  }

  history.push({ val: numericValue, t: pointTime });
  if (history.length > 30) history.shift();
}

function renderSensorCard(sensorId) {
  const sensor = STATE.sensors[sensorId];
  const val = STATE.sensorData[sensorId];
  const cfg = SENSOR_CONFIG[sensor.type] || {};
  const label = SENSOR_LABELS[sensor.type] || sensor.type;
  const linked = sensor.device_name ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px">${escHtml(sensor.device_name)}</div>` : "";
  const latest = getSensorDisplayValue(sensor, val);
  const hasValue = val !== null && val !== undefined;
  const iconClass = typeof normalizeFaIcon === "function"
    ? normalizeFaIcon(sensor.icon || cfg.icon || "fa-microchip", cfg.icon || "fa-microchip")
    : (sensor.icon || cfg.icon || "fa-microchip");

  const card = document.createElement("div");
  card.id = `sensor-card-${sensorId}`;
  card.className = "sensor-card" + (hasValue ? " has-data" : "");
  card.innerHTML = `
    <div class="sensor-card-top">
      <div class="sensor-card-info">
        <div class="sensor-big-icon" style="background:${cfg.color ? `color-mix(in srgb, ${cfg.color} 16%, transparent)` : 'var(--surface-hover)'}">
          <i class="fas ${iconClass}" style="color:${cfg.color || "var(--text-secondary)"}"></i>
        </div>
        <div>
          <div class="sensor-name">${escHtml(sensor.name)}</div>
          <div class="sensor-type-label">${escHtml(sensor.template_name || label)}</div>
          ${linked}
        </div>
      </div>
      <div class="sensor-card-actions">
        <button class="icon-btn small" onclick="openSensorSettings('${sensorId}')"><i class="fas fa-sliders"></i></button>
        <button class="trash-btn" onclick="removeSensor('${sensorId}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>
    <div class="sensor-status-row" style="margin:12px 0 8px">
      <span class="sensor-value-big" id="val-${sensorId}">${escHtml(latest)}</span>
      <span class="sensor-meta-val" id="time-${sensorId}">${sensor.last_seen ? escHtml(sensor.last_seen) : "—"}</span>
    </div>
    <canvas class="sparkline-canvas" id="spark-${sensorId}"></canvas>
    <div class="progress-track">
      <div class="progress-fill ${cfg.barClass || "temp-bar"}" id="bar-${sensorId}" style="width:0%"></div>
    </div>
  `;
  return card;
}

function renderSensors() {
  const grid = document.getElementById("sensorsGrid");
  const empty = document.getElementById("emptySensors");
  if (!grid) return;

  const keys = Object.keys(STATE.sensors || {});
  grid.innerHTML = "";
  if (empty) empty.classList.toggle("hidden", keys.length > 0);

  keys.forEach((id) => {
    const card = renderSensorCard(id);
    grid.appendChild(card);
    updateSensorValueUI(id, { recordHistory: (STATE.sensorHistory[id] || []).length === 0 });
    if ((!STATE.sensorHistory[id] || STATE.sensorHistory[id].length < 2) && !SENSOR_HISTORY_LOADS[id]) {
      loadSensorHistory(id).catch(() => {});
    } else {
      drawSparkline(id);
    }
  });
}

function updateSensorValueUI(sensorId, options = {}) {
  const sensor = STATE.sensors[String(sensorId)];
  if (!sensor) return;
  const val = STATE.sensorData[String(sensorId)];
  const valueEl = document.getElementById(`val-${sensorId}`);
  const timeEl = document.getElementById(`time-${sensorId}`);
  const barEl = document.getElementById(`bar-${sensorId}`);
  const cfg = SENSOR_CONFIG[sensor.type] || {};
  const recordHistory = options.recordHistory !== false;
  const seenAt = options.seenAt || sensor.last_seen || null;
  const hasValue = val !== null && val !== undefined && val !== "";

  if (valueEl) valueEl.textContent = getSensorDisplayValue(sensor, val);
  if (timeEl) timeEl.textContent = formatSensorTime(seenAt);
  if (barEl && hasValue && cfg.min !== undefined && cfg.max !== undefined) {
    const pct = Math.max(0, Math.min(100, ((Number(val) - cfg.min) / (cfg.max - cfg.min || 1)) * 100));
    barEl.style.width = `${pct}%`;
  } else if (barEl) {
    barEl.style.width = "0%";
  }

  document.getElementById(`sensor-card-${sensorId}`)?.classList.toggle("has-data", hasValue);

  if (recordHistory) {
    pushSensorHistoryPoint(sensorId, val, seenAt);
  }

  if ((STATE.sensorHistory[String(sensorId)] || []).length > 1) {
    drawSparkline(String(sensorId));
  }
}

function updateSensorBoolUI(sensorId, options = {}) {
  updateSensorValueUI(sensorId, options);
}

function drawSparkline(sensorId) {
  const canvas = document.getElementById(`spark-${sensorId}`);
  const history = (STATE.sensorHistory[String(sensorId)] || []).map((item) => typeof item === "object" ? Number(item.val) : Number(item));
  if (!canvas || history.length < 2) return;

  const width = canvas.clientWidth || 200;
  const height = canvas.clientHeight || 38;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;
  const color = SENSOR_CONFIG[STATE.sensors[String(sensorId)]?.type]?.gaugeColor || "#38bdf8";

  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  history.forEach((value, index) => {
    const x = (index / (history.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 6) - 3;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function filterSensors(query) {
  const needle = String(query || "").toLowerCase();
  document.querySelectorAll(".sensor-card").forEach((card) => {
    const id = card.id.replace("sensor-card-", "");
    const sensor = STATE.sensors[id];
    const text = `${sensor?.name || ""} ${sensor?.device_name || ""} ${sensor?.type || ""}`.toLowerCase();
    card.style.display = text.includes(needle) ? "" : "none";
  });
}

let isSensorActionBusy = false;

async function openAddSensorModal() {
  ["newSensorName", "newSensorTopic"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const select = document.getElementById("newSensorTemplate");
  if (select) {
    select.disabled = true;
    select.innerHTML = `<option value="">Memuat sensor...</option>`;
  }
  document.getElementById("addSensorModal")?.classList.add("active");
  try {
    await populateSensorTemplateSelect("newSensorTemplate");
    populateSensorDeviceSelect("newSensorDevice");
    syncSensorFormFromTemplate("new");
  } finally {
    if (select) select.disabled = false;
  }
}

function closeAddSensorModal() {
  document.getElementById("addSensorModal")?.classList.remove("active");
}

async function saveNewSensor() {
  if (isSensorActionBusy) return;
  const name = document.getElementById("newSensorName")?.value.trim();
  const topic = document.getElementById("newSensorTopic")?.value.trim();
  const templateId = document.getElementById("newSensorTemplate")?.value || "";
  const deviceId = document.getElementById("newSensorDevice")?.value || "";
  const btn = document.getElementById("btnSaveNewSensor");
  const template = getSensorTemplateById(templateId);
  const type = template?.sensor_type || "temperature";
  const unit = template?.default_unit || "";

  if (!name || !topic) {
    showToast("Nama sensor dan topic harus diisi!", "warning");
    return;
  }
  if (!templateId || !template) {
    showToast("Pilih sensor dulu!", "warning");
    return;
  }

  try {
    isSensorActionBusy = true;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menambahkan...';
    }

    const result = await apiPost("add_sensor", {
      name,
      type,
      unit,
      topic,
      sensor_template_id: templateId || null,
      device_id: deviceId || null,
    });

    if (result?.success) {
      const id = String(result.id);
      STATE.sensors[id] = {
        id,
        name,
        type,
        icon: template?.default_icon || SENSOR_CONFIG[type]?.icon || "fa-microchip",
        unit: unit || template?.default_unit || "",
        topic,
        sensor_key: result.sensor_key,
        sensor_template_id: templateId || null,
        template_name: template?.name || null,
        template_slug: template?.slug || null,
        device_id: deviceId || null,
        device_name: deviceId ? (STATE.devices[String(deviceId)]?.name || null) : null,
      };
      STATE.sensorData[id] = null;
      STATE.sensorHistory[id] = [];
      renderSensors();
      closeAddSensorModal();
      showToast("Sensor berhasil ditambahkan!", "success");
      addLog(name, "Sensor baru ditambahkan", "System", "success", { sensor_id: Number(id), device_id: deviceId ? Number(deviceId) : null });
    } else {
      showToast(result?.error || "Gagal menambah sensor", "error");
    }
  } finally {
    isSensorActionBusy = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = "Tambah";
    }
  }
}

async function openSensorSettings(sensorId) {
  const id = String(sensorId);
  const sensor = STATE.sensors[id];
  if (!sensor) return;
  document.getElementById("ssEditName").value = sensor.name || "";
  document.getElementById("ssEditTopic").value = sensor.topic || "";
  await populateSensorTemplateSelect("ssEditTemplate", findBestSensorTemplateId(sensor));
  populateSensorDeviceSelect("ssEditDevice", sensor.device_id || "");
  syncSensorFormFromTemplate("edit");
  const modal = document.getElementById("sensorSettingModal");
  if (modal) {
    modal.dataset.sensorId = id;
    modal.classList.add("active");
  }
}

function closeSensorSettings() {
  document.getElementById("sensorSettingModal")?.classList.remove("active");
}

async function saveSensorSettings() {
  if (isSensorActionBusy) return;
  const modal = document.getElementById("sensorSettingModal");
  if (!modal) return;
  const id = String(modal.dataset.sensorId);
  const name = document.getElementById("ssEditName")?.value.trim();
  const topic = document.getElementById("ssEditTopic")?.value.trim();
  const templateId = document.getElementById("ssEditTemplate")?.value || "";
  const deviceId = document.getElementById("ssEditDevice")?.value || "";
  const template = getSensorTemplateById(templateId);
  const btn = document.getElementById("btnSaveSensorEdit");
  const type = template?.sensor_type || "temperature";
  const unit = template?.default_unit || "";

  if (!name || !topic) {
    showToast("Nama dan topic harus diisi!", "warning");
    return;
  }
  if (!templateId || !template) {
    showToast("Pilih sensor dulu!", "warning");
    return;
  }

  try {
    isSensorActionBusy = true;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    }

    const result = await apiPost("update_sensor", {
      id,
      name,
      type,
      unit,
      topic,
      sensor_template_id: templateId || null,
      device_id: deviceId || null,
    });

    if (result?.success) {
      STATE.sensors[id] = {
        ...STATE.sensors[id],
        name,
        type,
        unit: unit || template?.default_unit || "",
        icon: template?.default_icon || SENSOR_CONFIG[type]?.icon || STATE.sensors[id]?.icon || "fa-microchip",
        topic,
        sensor_template_id: templateId || null,
        template_name: template?.name || null,
        template_slug: template?.slug || null,
        device_id: deviceId || null,
        device_name: deviceId ? (STATE.devices[String(deviceId)]?.name || null) : null,
      };
      renderSensors();
      closeSensorSettings();
      showToast("Sensor berhasil diperbarui!", "success");
    } else {
      showToast(result?.error || "Gagal memperbarui sensor", "error");
    }
  } finally {
    isSensorActionBusy = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = "Simpan";
    }
  }
}

async function removeSensor(sensorId) {
  if (isSensorActionBusy) return;
  const id = String(sensorId);
  const name = STATE.sensors[id]?.name || "Sensor";
  if (!confirm(`Hapus sensor "${name}"? Seluruh histori data akan hilang.`)) return;

  try {
    isSensorActionBusy = true;
    const result = await apiPost("delete_sensor", { id });
    if (result?.success) {
      delete STATE.sensors[id];
      delete STATE.sensorData[id];
      delete STATE.sensorHistory[id];
      renderSensors();
      if (typeof renderAutomationView === "function") renderAutomationView();
      updateDashboardStats();
      showToast("Sensor telah dihapus", "info");
      addLog(name, "Sensor dihapus", "System", "warning", { sensor_id: Number(id) });
    } else {
      showToast(result?.error || "Gagal menghapus sensor", "error");
    }
  } finally {
    isSensorActionBusy = false;
  }
}
