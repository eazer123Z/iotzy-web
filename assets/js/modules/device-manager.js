/**
 * public/assets/js/modules/device-manager.js
 * ───
 * Pengelola Perangkat IoT IoTzy.
 * Menangani logika interaksi UI, kontrol manual/otomatis, sinkronisasi status 
 * perangkat (state management), serta komunikasi perintah melalui protokol MQTT.
 */


/* ==================== DEVICE TYPE HELPERS ==================== */

/**
 * Mendapatkan kategori tipe perangkat berdasarkan icon.
 */
function getDeviceType(input) {
  const device = (input && typeof input === "object") ? input : null;
  const explicitType = device ? String(device.type || device.template_device_type || "").toLowerCase() : "";
  if (explicitType) return explicitType;
  const icon = device
    ? normalizeFaIcon(device.icon || device.template_default_icon || "", "")
    : normalizeFaIcon(input || "", "");
  if (!icon) return "switch";
  const i = icon.toLowerCase();
  if (i.includes("light") || i.includes("bulb") || i.includes("lamp") || i.includes("sun")) return "light";
  if (i.includes("fan") || i.includes("wind") || i.includes("propeller") || i.includes("blade")) return "fan";
  if (i.includes("snowflake") || i.includes("ac") || i.includes("thermometer") || i.includes("temp")) return "ac";
  if (i.includes("tv") || i.includes("display") || i.includes("desktop") || i.includes("screen")) return "tv";
  if (i.includes("lock") || i.includes("shield") || i.includes("key") || i.includes("guard")) return "lock";
  if (i.includes("door")) return "door";
  if (i.includes("video") || i.includes("camera") || i.includes("eye") || i.includes("record")) return "cctv";
  if (i.includes("volume") || i.includes("speaker") || i.includes("bell") || i.includes("audio")) return "speaker";
  if (i.includes("plug") || i.includes("bolt") || i.includes("power") || i.includes("switch")) return "switch";
  if (i.includes("droplet") || i.includes("water") || i.includes("pump") || i.includes("faucet")) return "pump";
  return "switch";
}

/**
 * Mendapatkan nama label tipe perangkat (Bahasa Indonesia).
 */
function getDeviceTypeName(input) {
  const device = (input && typeof input === "object") ? input : null;
  if (device?.template_name) return device.template_name;
  const icon = device
    ? normalizeFaIcon(device.icon || device.template_default_icon || "", getDefaultDeviceIcon(getDeviceType(device)))
    : normalizeFaIcon(input || "", "fa-plug");
  const map = {
    "fa-lightbulb":  "Lampu",         "fa-wind":       "Kipas Angin",
    "fa-snowflake":  "AC / Pendingin", "fa-tv":         "Televisi",
    "fa-lock":       "Kunci Pintu",    "fa-door-open":  "Pintu",
    "fa-video":      "Kamera CCTV",    "fa-volume-up":  "Speaker / Alarm",
    "fa-volume-high":"Speaker / Alarm",
    "fa-plug":       "Stop Kontak",
  };
  return map[icon] || "Perangkat IoT";
}

function normalizeFaIcon(input, fallback = "fa-plug") {
  const styleTokens = new Set(["fa", "fas", "far", "fal", "fat", "fab", "fa-solid", "fa-regular", "fa-light", "fa-thin", "fa-brands"]);
  const aliases = {
    "volume-up": "fa-volume-high",
    "fa-volume-up": "fa-volume-high",
    "volume-down": "fa-volume-low",
    "fa-volume-down": "fa-volume-low",
    "speaker": "fa-volume-high",
    "alarm": "fa-volume-high",
    "lamp": "fa-lightbulb",
    "lampu": "fa-lightbulb",
    "lightbulb": "fa-lightbulb",
    "bulb": "fa-lightbulb",
    "kipas": "fa-wind",
    "fan": "fa-wind",
    "camera": "fa-video",
    "cctv": "fa-video",
    "kunci": "fa-lock",
    "lock": "fa-lock",
    "door": "fa-door-open",
    "pintu": "fa-door-open",
    "plug": "fa-plug",
    "switch": "fa-plug",
    "sensor": "fa-microchip",
    "temperature": "fa-temperature-half",
  };
  const raw = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-\s]/g, " ")
    .trim();
  if (!raw) return fallback;

  const faToken = raw
    .split(/\s+/)
    .find((token) => token.startsWith("fa-") && !styleTokens.has(token));
  if (faToken) {
    return aliases[faToken] || faToken;
  }

  const compact = raw.replace(/\s+/g, "-").replace(/^-+|-+$/g, "");
  if (aliases[compact]) return aliases[compact];
  if (compact.startsWith("fa-")) return aliases[compact] || compact;

  const withPrefix = `fa-${compact}`;
  return aliases[withPrefix] || withPrefix || fallback;
}

async function ensureDeviceTemplatesLoaded() {
  if (Array.isArray(STATE.deviceTemplates) && STATE.deviceTemplates.length) return STATE.deviceTemplates;
  if (STATE.deviceTemplatesPromise) return STATE.deviceTemplatesPromise;
  STATE.deviceTemplatesPromise = apiPost("get_device_templates", {})
    .then((result) => {
      STATE.deviceTemplates = result?.templates || [];
      return STATE.deviceTemplates;
    })
    .finally(() => {
      STATE.deviceTemplatesPromise = null;
    });
  return STATE.deviceTemplatesPromise;
}

function getDeviceTemplateById(id) {
  const numericId = Number(id);
  return (STATE.deviceTemplates || []).find((template) => Number(template.id) === numericId) || null;
}

function getDefaultDeviceIcon(deviceType = "switch") {
  const map = {
    light: "fa-lightbulb",
    fan: "fa-wind",
    ac: "fa-snowflake",
    tv: "fa-tv",
    lock: "fa-lock",
    door: "fa-lock",
    cctv: "fa-video",
    speaker: "fa-volume-up",
    pump: "fa-plug",
    switch: "fa-plug",
  };
  return map[String(deviceType || "switch").toLowerCase()] || "fa-plug";
}

function getDeviceAccent(deviceType = "switch") {
  const map = {
    light: "#fbbf24",
    fan: "#22d3ee",
    ac: "#22d3ee",
    tv: "#8b5cf6",
    speaker: "#8b5cf6",
    lock: "#f59e0b",
    door: "#f59e0b",
    cctv: "#38bdf8",
    pump: "#10b981",
    switch: "#10b981",
  };
  return map[String(deviceType || "switch").toLowerCase()] || "#10b981";
}

function getDeviceCardIcon(device, isOn = false) {
  const dtype = getDeviceType(device);
  if ((dtype === "lock" || dtype === "door") && isOn) {
    return "fa-lock-open";
  }
  return normalizeFaIcon(
    device?.icon || device?.template_default_icon || getDefaultDeviceIcon(dtype) || "fa-plug",
    getDefaultDeviceIcon(dtype)
  );
}

async function populateDeviceTemplateSelect(selectId, selectedId = "") {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = `<option value="">Memuat perangkat...</option>`;
  const templates = await ensureDeviceTemplatesLoaded();
  select.innerHTML = `<option value="">Pilih perangkat</option>` + templates.map((template) => {
    const selected = String(selectedId) === String(template.id) ? " selected" : "";
    return `<option value="${template.id}"${selected}>${escHtml(template.name)}</option>`;
  }).join("");
}

function syncDeviceFormFromTemplate(prefix = "new") {
  const templateSelect = document.getElementById(prefix === "new" ? "newDeviceTemplate" : "editDeviceTemplate");
  const hint = document.getElementById(prefix === "new" ? "newDeviceKindHint" : "editDeviceKindHint");
  if (!templateSelect) return;
  const template = getDeviceTemplateById(templateSelect.value);
  if (!template) {
    if (hint) hint.textContent = "Pilih jenis perangkat agar ikon dan model terpasang otomatis.";
    return;
  }
  if (hint) hint.textContent = `Ikon otomatis: ${template.name} (${template.device_type || "perangkat"}).`;
}

/* ==================== DEVICE UI ==================== */

/**
 * Memperbarui UI satu perangkat tertentu di semua komponen (Grid, Quick Control, Modal).
 */
function updateDeviceUI(deviceId) {
  const id = String(deviceId);
  const device = STATE.devices[id];
  if (!device) return;

  const isOn = !!STATE.deviceStates[id];
  const dtype = getDeviceType(device);
  const isLock = (dtype === 'lock' || dtype === 'door');
  const onLabel = device.resolved_state_on_label || device.state_on_label || 'ON';
  const offLabel = device.resolved_state_off_label || device.state_off_label || 'OFF';

  const g = (s) => document.getElementById(s);
  
  // 1. Update Every Possible Card Instance (Main Grid, Quick Control, etc.)
  document.querySelectorAll(`[id^="card-${id}"], [id^="qc-${id}"]`).forEach(card => {
    card.classList.toggle("on", isOn);
    card.classList.toggle("active", isOn);
    
    const pill = card.querySelector(".device-status-pill");
    if (pill) {
      pill.classList.toggle("on", isOn);
      pill.textContent = isLock ? (isOn ? onLabel : offLabel) : (isOn ? onLabel : offLabel);
    }

    const dur = card.querySelector(".device-usage");
    if (dur) {
        if (isLock) dur.textContent = isOn ? "Terbuka" : "Terkunci";
        else dur.textContent = isOn ? "Aktif" : "Standby";
    }

    const icon = card.querySelector(".device-icon");
    if (icon && isLock) {
      icon.classList.remove("fa-lock", "fa-lock-open");
      icon.classList.add(isOn ? "fa-lock-open" : "fa-lock");
    }
    
    // Update Extra Controls visibility within this card
    card.querySelectorAll('.control-row, .fan-speed-row, .ac-controls, .brightness-row, .volume-row').forEach(row => {
        row.style.display = isOn ? 'flex' : 'none';
    });
  });

}

/**
 * Mengubah status perangkat secara manual dari UI.
 * Melakukan Publish MQTT dan Update DB backend.
 */
function toggleDeviceState(deviceId, newState) {
  const id   = String(deviceId);
  const prev = STATE.deviceStates[id];
  STATE.deviceStates[id] = newState;

  // Track durasi penggunaan
  if (newState && !prev) STATE.deviceOnAt[id] = Date.now();
  else if (!newState)    delete STATE.deviceOnAt[id];

  updateDeviceUI(id);

  // Komunikasi MQTT
  const t = STATE.deviceTopics[id];
  if (t?.pub) publishMQTT(t.pub, buildDevicePayload(id, newState));

  // Optimistic UI Lock
  STATE.deviceUpdating = STATE.deviceUpdating || {};
  STATE.deviceUpdating[id] = true;

  // Update Database Backend (Tidak blocking)
  apiPost("update_device_state", { id, state: newState ? 1 : 0, trigger: "Manual" })
    .catch(() => {})
    .finally(() => { setTimeout(() => { STATE.deviceUpdating[id] = false; }, 2000); });
  
  // Logging lokal
  addLog(STATE.devices[id]?.name, newState ? "Dinyalakan" : "Dimatikan", "Manual", "info", { device_id: Number(id) });
  updateDashboardStats();

  // Built-in Automation Trigger (Smart Lock)
  const dtype = getDeviceType(STATE.devices[id]);
  if ((dtype === 'lock' || dtype === 'door') && typeof automationEngine !== 'undefined' && typeof automationEngine.evaluateBuiltInRules === 'function') {
    automationEngine.evaluateBuiltInRules('lock', { id, state: newState });
  }
}

/**
 * Membangun payload JSON untuk perintah MQTT berdasarkan tipe perangkat.
 */
function buildDevicePayload(deviceId, state) {
  const id     = String(deviceId);
  const extras = STATE.deviceExtras[id] || {};
  const device = STATE.devices[id];
  const dtype  = getDeviceType(device);
  const base   = { state: state ? 1 : 0 };
  
  if (dtype === "fan"     && state) return { ...base, speed: extras.fanSpeed || 50 };
  if (dtype === "ac"      && state) return { ...base, mode: extras.acMode || "cool", temp: extras.acTemp || 24 };
  if (dtype === "light"   && state) return { ...base, brightness: extras.brightness || 100 };
  if (dtype === "speaker" && state) return { ...base, volume: extras.volume || 60 };
  
  return base;
}

/**
 * Menerapkan status perangkat yang dipicu oleh Automasi (AI/Sensor).
 */
function applyDeviceState(deviceId, newState, reason = "Automation") {
  const id = String(deviceId);
  if (STATE.deviceStates[id] === newState) return;

  STATE.deviceStates[id] = newState;
  if (newState) STATE.deviceOnAt[id] = Date.now();
  else delete STATE.deviceOnAt[id];

  updateDeviceUI(id);

  const t = STATE.deviceTopics[id];
  if (t?.pub) publishMQTT(t.pub, buildDevicePayload(id, newState));

  // Optimistic UI Lock
  STATE.deviceUpdating = STATE.deviceUpdating || {};
  STATE.deviceUpdating[id] = true;

  // Update Database Backend (Skip jika sudah diupdate server AI)
  if (reason !== "AI Assistant (Sync)") {
    apiPost("update_device_state", { id, state: newState ? 1 : 0, trigger: reason })
      .catch(() => {})
      .finally(() => { setTimeout(() => { STATE.deviceUpdating[id] = false; }, 2000); });
  } else {
    setTimeout(() => { STATE.deviceUpdating[id] = false; }, 2000);
  }
  
  addLog(STATE.devices[id]?.name, `${newState ? "ON" : "OFF"} (${reason})`, "Automation", newState ? "success" : "info", { device_id: Number(id) });
  updateDashboardStats();

  // Built-in Automation Trigger (Smart Lock)
  const dtype = getDeviceType(STATE.devices[id]);
  if ((dtype === 'lock' || dtype === 'door') && typeof automationEngine !== 'undefined' && typeof automationEngine.evaluateBuiltInRules === 'function') {
    automationEngine.evaluateBuiltInRules('lock', { id, state: newState });
  }
}

/* ==================== CONTROL SETTERS (Manual) ==================== */

function setFanSpeed(deviceId, speed) {
  const id = String(deviceId);
  if (!STATE.deviceExtras[id]) STATE.deviceExtras[id] = {};
  STATE.deviceExtras[id].fanSpeed = parseInt(speed);
  
  const t  = STATE.deviceTopics[id];
  if (t?.pub) publishMQTT(t.pub, { state: 1, speed: parseInt(speed) });

  const lb = document.getElementById(`fan-speed-label-${id}`);
  const sl = document.getElementById(`fan-speed-${id}`);
  if (lb) lb.textContent = speed + "%";
  if (sl) sl.value = speed;
  
  addLog(STATE.devices[id]?.name, `Kipas kecepatan ${speed}%`, "Manual", "info", { device_id: Number(id) });
}

function setACMode(deviceId, mode) {
  const id = String(deviceId);
  if (!STATE.deviceExtras[id]) STATE.deviceExtras[id] = {};
  STATE.deviceExtras[id].acMode = mode;
  
  document.querySelectorAll(`#ac-ctrl-${id} .ac-mode-btn`).forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
  
  const t = STATE.deviceTopics[id];
  if (t?.pub && STATE.deviceStates[id]) publishMQTT(t.pub, { state: 1, mode, temp: STATE.deviceExtras[id].acTemp || 24 });
  
  addLog(STATE.devices[id]?.name, `Mode AC: ${mode.toUpperCase()}`, "Manual", "info", { device_id: Number(id) });
}

function adjustACTemp(deviceId, delta) {
  const id  = String(deviceId);
  if (!STATE.deviceExtras[id]) STATE.deviceExtras[id] = {};
  const cur = STATE.deviceExtras[id].acTemp || 24;
  const nxt = Math.min(30, Math.max(16, cur + delta));
  STATE.deviceExtras[id].acTemp = nxt;
  
  const el  = document.getElementById(`ac-temp-${id}`);
  if (el) el.textContent = nxt + "°C";
  
  const t = STATE.deviceTopics[id];
  if (t?.pub && STATE.deviceStates[id]) publishMQTT(t.pub, { state: 1, mode: STATE.deviceExtras[id].acMode || "cool", temp: nxt });
}

function setLightBrightness(deviceId, pct) {
  const id = String(deviceId);
  if (!STATE.deviceExtras[id]) STATE.deviceExtras[id] = {};
  STATE.deviceExtras[id].brightness = parseInt(pct);
  
  const lb = document.getElementById(`brightness-label-${id}`);
  if (lb) lb.textContent = pct + "%";
  
  const t = STATE.deviceTopics[id];
  if (t?.pub && STATE.deviceStates[id]) publishMQTT(t.pub, { state: 1, brightness: parseInt(pct) });
}

function setVolume(deviceId, vol) {
  const id = String(deviceId);
  if (!STATE.deviceExtras[id]) STATE.deviceExtras[id] = {};
  STATE.deviceExtras[id].volume = parseInt(vol);
  
  const lb = document.getElementById(`volume-label-${id}`);
  if (lb) lb.textContent = vol + "%";
  
  const t = STATE.deviceTopics[id];
  if (t?.pub && STATE.deviceStates[id]) publishMQTT(t.pub, { state: 1, volume: parseInt(vol) });
}

function toggleLock(deviceId) {
  const id  = String(deviceId);
  const isOn = STATE.deviceStates[id];
  toggleDeviceState(id, !isOn);
}

/* ==================== UI BUILDERS ==================== */

/**
 * Membangun HTML untuk input kontrol tambahan (Slider Speed, Temp, dsb).
 */
function buildDeviceExtraHTML(id, device) {
  const isOn   = STATE.deviceStates[id];
  const extras = STATE.deviceExtras[id] || {};
  const dtype  = getDeviceType(device);
  const show   = isOn ? "" : "none";

  if (dtype === "fan") {
    const spd = extras.fanSpeed || 50;
    return `<div id="speed-row-${id}" class="fan-speed-row" style="display:${show}">
      <i class="fas fa-wind" style="font-size:11px;color:var(--ink-4)"></i>
      <input type="range" id="fan-speed-${id}" class="fan-slider" min="0" max="100" step="25" value="${spd}" oninput="setFanSpeed('${id}',this.value)">
      <span id="fan-speed-label-${id}" class="fan-speed-val">${spd}%</span>
    </div>`;
  }
  if (dtype === "ac") {
    const modes = [
      { key: "cool", icon: "❄️", label: "Cool" }, { key: "heat", icon: "🔥", label: "Heat" },
      { key: "fan",  icon: "🌀", label: "Fan"  }, { key: "dry",  icon: "💧", label: "Dry"  },
      { key: "auto", icon: "♾️", label: "Auto" },
    ];
    const temp = extras.acTemp  || 24;
    const mode = extras.acMode  || "cool";
    return `<div id="ac-ctrl-${id}" class="ac-controls" style="display:${show}">
      <div class="ac-mode-row">${modes.map((m) => `<button class="ac-mode-btn${m.key === mode ? " active" : ""}" data-mode="${m.key}" onclick="setACMode('${id}','${m.key}')" title="${m.label}">${m.icon}</button>`).join("")}</div>
      <div class="ac-temp-row">
        <button class="ac-temp-btn" onclick="adjustACTemp('${id}',-1)">−</button>
        <div class="ac-temp-val"><span id="ac-temp-${id}">${temp}°C</span></div>
        <button class="ac-temp-btn" onclick="adjustACTemp('${id}',1)">+</button>
        <span class="ac-temp-unit">Target</span>
      </div>
    </div>`;
  }
  if (dtype === "light") {
    const bri = extras.brightness || 100;
    return `<div id="brightness-row-${id}" class="brightness-row" style="display:${show}">
      <i class="fas fa-sun" style="font-size:11px;color:var(--amber)"></i>
      <input type="range" id="brightness-${id}" class="brightness-slider" min="10" max="100" step="10" value="${bri}" oninput="setLightBrightness('${id}',this.value)">
      <span id="brightness-label-${id}" class="brightness-val">${bri}%</span>
    </div>`;
  }
  if (dtype === "speaker") {
    const vol = extras.volume || 60;
    return `<div id="volume-row-${id}" class="volume-row" style="display:${show}">
      <i class="fas fa-volume-${vol > 50 ? "high" : vol > 0 ? "low" : "xmark"}" id="vol-icon-${id}" style="font-size:11px;color:var(--purple)"></i>
      <input type="range" id="volume-${id}" class="volume-slider" min="0" max="100" step="5" value="${vol}" oninput="setVolume('${id}',this.value)">
      <span id="volume-label-${id}" class="volume-val">${vol}%</span>
    </div>`;
  }
  if (dtype === "lock" || dtype === "door") {
    return `<div class="lock-control">
      <button id="lock-btn-${id}" onclick="toggleLock('${id}')" class="lock-btn ${isOn ? "unlock" : "lock"}">
        ${isOn ? '<i class="fas fa-lock-open"></i> BUKA KUNCI' : '<i class="fas fa-lock"></i> TERKUNCI'}
      </button>
    </div>`;
  }
  return "";
}

/* ==================== RENDER DEVICES ==================== */

/**
 * Membangun HTML untuk Card Perangkat secara terpusat.
 */
function buildDeviceCardHTML(deviceId, context = 'grid') {
  const id = String(deviceId);
  const device = STATE.devices[id];
  if (!device) return "";
  
  const isOn = !!STATE.deviceStates[id];
  const dtype = getDeviceType(device);
  const accent = getDeviceAccent(dtype);
  const iconClass = getDeviceCardIcon(device, isOn);
  const isQC = context === 'quick';
  const prefix = isQC ? 'qc-' : 'card-';

  return `
    <div class="device-card device-${dtype} ${isOn ? 'active on' : ''}" id="${prefix}${id}" onclick="handleDeviceCardClick('${id}', '${context}')">
      <div class="card-controls-top">
        <div class="device-actions">
          <button class="card-action-btn" onclick="event.stopPropagation(); openTopicSettings('${id}')" title="Settings"><i class="fas fa-cog"></i></button>
          <button class="card-action-btn trash" onclick="event.stopPropagation(); removeDevice('${id}')" title="Hapus"><i class="fas fa-trash"></i></button>
        </div>
      </div>

      <div class="device-icon-wrap" style="--card-accent: ${accent}">
        <i class="fas ${iconClass} device-icon"></i>
      </div>

      <div class="device-info">
        <div class="device-name">${escHtml(device.name)}</div>
        <div class="device-model">${escHtml(device.template_name || getDeviceTypeName(device))}</div>
        <div class="device-usage" id="dur-${id}">${isOn ? 'Aktif' : 'Standby'}</div>
      </div>
      
      <div class="device-controls-area">
        ${buildDeviceExtraHTML(id, device)}
      </div>

      <div class="device-status-pill ${isOn ? 'on' : ''}">
        ${isOn ? escHtml(device.resolved_state_on_label || device.state_on_label || 'ON') : escHtml(device.resolved_state_off_label || device.state_off_label || 'OFF')}
      </div>
    </div>
  `;
}

/**
 * Membangun tombol Quick Control (icon-only) untuk dashboard.
 */
function buildQuickControlButtonHTML(deviceId) {
  const id = String(deviceId);
  const device = STATE.devices[id];
  if (!device) return "";
  const isOn = !!STATE.deviceStates[id];
  const dtype = getDeviceType(device);
  const iconClass = getDeviceCardIcon(device, isOn);
  const accent = getDeviceAccent(dtype);
  const title = `${device.name} • ${isOn ? 'ON' : 'OFF'}`;
  return `
    <button class="qc-btn ${isOn ? 'on' : ''}" title="${escHtml(title)}"
            onclick="event.preventDefault(); toggleDeviceState('${id}', ${isOn ? 'false' : 'true'});"
            style="--qc-accent:${accent}">
      <i class="fas ${iconClass}"></i>
    </button>
  `;
}

/**
 * Handler klik card (Grid Utama & Quick Control).
 */
function handleDeviceCardClick(id, context = 'grid') {
    const next = !STATE.deviceStates[id];
    toggleDeviceState(id, next);
}

/**
 * Merender daftar semua perangkat ke Grid Utama.
 */
function renderDevices() {
  const grid = document.getElementById('devicesGrid');
  const empty = document.getElementById('emptyDevices');
  if (!grid) return;

  const keys = Object.keys(STATE.devices || {});
  grid.innerHTML = '';
  if (empty) empty.classList.toggle('hidden', keys.length > 0);
  
  keys.forEach((id) => {
    grid.insertAdjacentHTML('beforeend', buildDeviceCardHTML(id, 'grid'));
  });
}


function filterDevices(q) {
  const lq = q.toLowerCase();
  document.querySelectorAll(".device-card").forEach((c) => {
    const id = c.id.replace("card-", "");
    c.style.display = (STATE.devices[id]?.name?.toLowerCase() || "").includes(lq) ? "" : "none";
  });
}

/* ==================== QUICK CONTROLS ==================== */

/**
 * Merender Quick Control Card ke Dashboard.
 */
function renderQuickControls() {
  const container = document.getElementById('quickControlsContainer');
  if (!container) return;
  container.innerHTML = '';

  const selected = (STATE.quickControlDevices || []).map(String).filter((id) => STATE.devices[id]);
  if (!selected.length) {
    container.innerHTML = `<div class="muted">
      <i class="fas fa-hand-pointer" style="font-size:22px;margin-bottom:10px;display:block;opacity:.25"></i>
      <p style="font-size:12px;margin-bottom:10px">Belum ada favorit pilihan</p>
      <button onclick="openQuickControlSettings()" class="ov-link" style="justify-content:center">Pilih perangkat →</button>
    </div>`;
    return;
  }

  container.classList.add('qc-grid');
  const html = selected.map((id) => buildQuickControlButtonHTML(id)).join('');
  container.innerHTML = html;
}


/**
 * Memilih perangkat yang akan tampil di Quick Control Modal.
 */
function toggleQuickControlPick(id) {
  const current = (STATE.quickControlDevices || []).map(String);
  const idx = current.indexOf(String(id));
  
  if (idx >= 0) {
    current.splice(idx, 1);
  } else {
    if (current.length >= 4) return showToast('Maksimal 4 perangkat!', 'warning');
    current.push(String(id));
  }
  
  STATE.quickControlDevices = current;
  renderQuickControlPicker();
}

/**
 * Merender daftar pemilih perangkat di dalam Quick Control Setting Modal.
 */
function renderQuickControlPicker() {
  const list = document.getElementById('quickControlDevicesList');
  if (!list) return;
  list.innerHTML = '';

  const keys = Object.keys(STATE.devices || {});
  if (!keys.length) {
    list.innerHTML = '<p class="modal-loading">Belum ada perangkat.</p>';
    return;
  }

  keys.forEach((id) => {
    const device = STATE.devices[id];
    const selected = (STATE.quickControlDevices || []).map(String).includes(String(id));
    
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `qc-picker-card${selected ? ' active' : ''}`;
    item.innerHTML = `
      <div class="qc-picker-icon"><i class="fas ${normalizeFaIcon(device.icon || device.template_default_icon || '', getDefaultDeviceIcon(getDeviceType(device)))}"></i></div>
      <div class="qc-picker-meta">
        <strong>${escHtml(device.name)}</strong>
        <span>${getDeviceTypeName(device)}</span>
      </div>
      <div class="qc-picker-state">${selected ? 'Dipilih' : 'Pilih'}</div>`;
    
    item.onclick = () => toggleQuickControlPick(id);
    list.appendChild(item);
  });
}

function openQuickControlSettings() {
  renderQuickControlPicker();
  document.getElementById('quickControlModal')?.classList.add('active');
}

function closeQuickControlSettings() {
  document.getElementById('quickControlModal')?.classList.remove('active');
}

async function saveQuickControlSettings() {
  STATE.quickControlDevices = (STATE.quickControlDevices || []).map(String).slice(0, 4);
  await apiPost('save_settings', { quick_control_devices: STATE.quickControlDevices });
  renderQuickControls();
  closeQuickControlSettings();
  showToast('Quick Control diperbarui!', 'success');
}

/* ==================== DEVICE SETTINGS & CRUD ==================== */

/**
 * Membuka modal pengaturan Topik/MQTT untuk perangkat lama.
 */
function openTopicSettings(deviceId) {
  const id     = String(deviceId);
  const device = STATE.devices[id];
  const topics = STATE.deviceTopics[id] || {};
  if (!device) return;

  const g = (i) => document.getElementById(i);
  if (g("topicDeviceName")) g("topicDeviceName").textContent = device.name;
  if (g("editDeviceName"))  g("editDeviceName").value  = device.name    || "";
  populateDeviceTemplateSelect("editDeviceTemplate", device.device_template_id || "").then(() => syncDeviceFormFromTemplate("edit"));
  if (g("deviceTopic"))  g("deviceTopic").value  = topics.sub || topics.pub || device.topic_sub || device.topic_pub || "";

  const modal = document.getElementById("topicModal");
  if (modal) { 
    modal.dataset.deviceId = id; 
    modal.classList.add("active"); 
  }
}

function closeTopicSettings() { document.getElementById("topicModal")?.classList.remove("active"); }

let isDeviceActionBusy = false;

async function saveDeviceSettings() {
  if (isDeviceActionBusy) return;
  const modal = document.getElementById("topicModal");
  if (!modal) return;
  
  const id   = String(modal.dataset.deviceId);
  const name = document.getElementById("editDeviceName")?.value.trim();
  const templateId = document.getElementById("editDeviceTemplate")?.value || "";
  const top  = document.getElementById("deviceTopic")?.value.trim();
  const btn  = document.getElementById("btnSaveDeviceEdit");
  const template = getDeviceTemplateById(templateId);
  const icon = template?.default_icon || STATE.devices[id]?.icon || getDefaultDeviceIcon(template?.device_type || STATE.devices[id]?.type);
  const resolvedType = template?.device_type || STATE.devices[id]?.type || getDeviceType(icon);

  if (!name) { showToast("Nama perangkat harus diisi!", "warning"); return; }
  if (!templateId) { showToast("Pilih perangkat dulu!", "warning"); return; }

  try {
    isDeviceActionBusy = true;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...'; }

    const result = await apiPost("update_device", {
      id,
      name,
      icon,
      type: resolvedType,
      device_template_id: templateId || null,
      state_on_label: template?.state_on_label || null,
      state_off_label: template?.state_off_label || null,
      topic_sub: top,
      topic_pub: top,
    });
    if (result?.success) {
      STATE.devices[id]      = {
        ...STATE.devices[id],
        name,
        icon,
        type: resolvedType,
        device_template_id: templateId || null,
        template_name: template?.name || null,
        template_slug: template?.slug || null,
        resolved_state_on_label: template?.state_on_label || STATE.devices[id]?.resolved_state_on_label || "ON",
        resolved_state_off_label: template?.state_off_label || STATE.devices[id]?.resolved_state_off_label || "OFF",
        topic_sub: top,
        topic_pub: top
      };
      STATE.deviceTopics[id] = { sub: top, pub: top };
      
      if (STATE.mqtt.connected && top) { 
        try { STATE.mqtt.client.subscribe(top); } catch (_) {} 
      }

      renderDevices(); 
      renderQuickControls(); 
      closeTopicSettings();
      showToast("Perubahan berhasil disimpan!", "success");
    } else {
      showToast(result?.error || "Gagal menyimpan setting", "error");
    }
  } catch (err) {
    showToast("Terjadi kesalahan sistem", "error");
  } finally {
    isDeviceActionBusy = false;
    if (btn) { btn.disabled = false; btn.innerHTML = "Simpan"; }
  }
}

function openAddDeviceModal() {
  ["newDeviceName", "newDeviceTopic"].forEach((id) => {
    const el = document.getElementById(id); if (el) el.value = "";
  });
  const select = document.getElementById("newDeviceTemplate");
  if (select) {
    select.disabled = true;
    select.innerHTML = `<option value="">Memuat perangkat...</option>`;
  }
  document.getElementById("addDeviceModal")?.classList.add("active");
  populateDeviceTemplateSelect("newDeviceTemplate")
    .then(() => syncDeviceFormFromTemplate("new"))
    .finally(() => {
      if (select) select.disabled = false;
    });
}

function closeAddDeviceModal() { document.getElementById("addDeviceModal")?.classList.remove("active"); }

async function saveNewDevice() {
  if (isDeviceActionBusy) return;
  const name = document.getElementById("newDeviceName")?.value.trim();
  const templateId = document.getElementById("newDeviceTemplate")?.value || "";
  const top  = document.getElementById("newDeviceTopic")?.value.trim();
  const btn  = document.getElementById("btnSaveNewDevice");
  const template = getDeviceTemplateById(templateId);
  const icon = template?.default_icon || getDefaultDeviceIcon(template?.device_type);
  const resolvedType = template?.device_type || getDeviceType(icon);

  if (!name) { showToast("Nama perangkat harus diisi!", "warning"); return; }
  if (!templateId) { showToast("Pilih perangkat dulu!", "warning"); return; }

  try {
    isDeviceActionBusy = true;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menambahkan...'; }

    const result = await apiPost("add_device", {
      name,
      icon,
      type: resolvedType,
      device_template_id: templateId || null,
      state_on_label: template?.state_on_label || null,
      state_off_label: template?.state_off_label || null,
      topic_sub: top,
      topic_pub: top
    });
    if (result?.success) {
      const id = String(result.id);
      STATE.devices[id]      = {
        id,
        name,
        icon,
        type: resolvedType,
        template_name: template?.name || null,
        template_slug: template?.slug || null,
        device_template_id: templateId || null,
        resolved_state_on_label: template?.state_on_label || "ON",
        resolved_state_off_label: template?.state_off_label || "OFF",
        device_key: result.device_key,
        topic_sub: top,
        topic_pub: top
      };
      STATE.deviceTopics[id] = { sub: top || "", pub: top || "" };
      STATE.deviceStates[id] = false;
      STATE.deviceExtras[id] = { fanSpeed: 50, acMode: "cool", acTemp: 24, brightness: 100, volume: 60 };

      if (STATE.mqtt.connected && top) { try { STATE.mqtt.client.subscribe(top); } catch (_) {} }

      renderDevices(); 
      renderQuickControls();
      
      const countEl = document.getElementById("navDeviceCount");
      if (countEl) countEl.textContent = Object.keys(STATE.devices).length;

      closeAddDeviceModal(); 
      showToast("Perangkat berhasil ditambahkan!", "success");
      addLog(name, "Perangkat baru ditambahkan", "System", "success", { device_id: Number(id) });
      
      if (typeof cvUI !== "undefined" && typeof cvUI.renderAutomationSettings === "function") {
        cvUI.renderAutomationSettings();
      }
    } else {
      showToast(result?.error || "Gagal menambah perangkat", "error");
    }
  } catch (err) {
    showToast("Terjadi kesalahan sistem", "error");
  } finally {
    isDeviceActionBusy = false;
    if (btn) { btn.disabled = false; btn.innerHTML = "Tambah"; }
  }
}

async function removeDevice(deviceId) {
  if (isDeviceActionBusy) return;
  const id = String(deviceId);
  const name = STATE.devices[id]?.name || "Perangkat";
  if (!confirm(`Hapus "${name}"? Perangkat ini tidak bisa dikontrol lagi.`)) return;
  
  try {
    isDeviceActionBusy = true;
    showToast(`Menghapus ${name}...`, "info");

    const result = await apiPost("delete_device", { id });
    if (result?.success) {
      delete STATE.devices[id]; 
      delete STATE.deviceStates[id];
      delete STATE.deviceTopics[id]; 
      delete STATE.deviceExtras[id]; 
      delete STATE.deviceOnAt[id];

      STATE.quickControlDevices = STATE.quickControlDevices.filter((x) => String(x) !== id);
      
      renderDevices(); 
      renderQuickControls(); 
      updateDashboardStats();
      
      showToast("Perangkat dihapus", "info"); 
      addLog(name, "Perangkat dihapus", "System", "warning", { device_id: Number(id) });

      if (typeof cvUI !== "undefined" && typeof cvUI.renderAutomationSettings === "function") {
        cvUI.renderAutomationSettings();
      }
    } else {
      showToast("Gagal menghapus perangkat", "error");
    }
  } catch (err) {
    showToast("Kesalahan sistem saat menghapus", "error");
  } finally {
    isDeviceActionBusy = false;
  }
}
