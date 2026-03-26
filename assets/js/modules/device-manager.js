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
function getDeviceType(icon) {
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
function getDeviceTypeName(icon) {
  const map = {
    "fa-lightbulb":  "Lampu",         "fa-wind":       "Kipas Angin",
    "fa-snowflake":  "AC / Pendingin", "fa-tv":         "Televisi",
    "fa-lock":       "Kunci Pintu",    "fa-door-open":  "Pintu",
    "fa-video":      "Kamera CCTV",    "fa-volume-up":  "Speaker / Alarm",
    "fa-plug":       "Stop Kontak",
  };
  return map[icon] || "Perangkat IoT";
}

/* ==================== DEVICE UI ==================== */

/**
 * Memperbarui UI satu perangkat tertentu di semua komponen (Grid, Quick Control, Modal).
 */
function updateDeviceUI(deviceId) {
  const id    = String(deviceId);
  const device = STATE.devices[id];
  if (!device) return;

  const isOn   = !!STATE.deviceStates[id];
  const dtype  = getDeviceType(device.icon);
  const isLock = (dtype === 'lock' || dtype === 'door' || device.icon.includes('lock') || device.icon.includes('door'));

  const g = (s) => document.getElementById(s);
  
  // 1. Update Card di Grid Utama & Quick Control
  const card = g(`card-${id}`) || g(`qc-${id}`);
  if (card) {
      card.classList.toggle("on", isOn);
      card.classList.toggle("active", isOn);
      
      const pill = card.querySelector(".device-status-pill");
      if (pill) {
          pill.classList.toggle("on", isOn);
          pill.textContent = isOn ? 'ONLINE' : 'OFFLINE';
      }
      
      const icon = card.querySelector(".power-icon");
      if (icon) icon.style.opacity = isOn ? 0 : 0.4;
  }

  const dur = g(`dur-${id}`);
  if (dur) {
    dur.textContent = isLock ? (isOn ? "Terbuka" : "Terkunci Aman") : (isOn ? "Sistem Aktif" : "Standby/Idle");
    dur.classList.toggle("on", isOn);
  }

  // 2. Update Komponen Tambahan (Fan Speed, AC Temp, dsb)
  const rows = [`speed-row-${id}`, `speed-row-qc-${id}`, `ac-ctrl-${id}`, `brightness-row-${id}`, `volume-row-${id}`];
  rows.forEach(rid => {
      const el = g(rid);
      if (el) {
          const isNeeded = (rid.includes('speed') && dtype === 'fan') || 
                           (rid.includes('ac') && dtype === 'ac') ||
                           (rid.includes('brightness') && dtype === 'light') ||
                           (rid.includes('volume') && dtype === 'speaker');
          el.style.display = (isOn && isNeeded) ? 'flex' : 'none';
      }
  });

  // 3. Update Lock Button jika itu tipe kunci
  if (isLock) {
    const lb = g(`lock-btn-${id}`);
    if (lb) {
      lb.style.color = isOn ? 'var(--warning)' : 'var(--success)';
      lb.innerHTML = isOn ? `<i class="fas fa-lock-open"></i> Buka` : `<i class="fas fa-lock"></i> Kunci`;
      lb.setAttribute("onclick", `toggleDeviceState('${id}', ${!isOn})`);
    }
  }

  // 4. Update Card di Quick Control (Floating View)
  const qc = g(`qc-${id}`);
  if (qc) {
    qc.classList.toggle("on", isOn);
    const qs = qc.querySelector(".qc-status");
    if (qs) qs.textContent = isLock ? (isOn ? "Terbuka" : "Terkunci") : (isOn ? "Aktif" : "Mati");
    
    const pill = qc.querySelector('.qc-pill');
    if (pill) {
      pill.className = `qc-pill ${isOn ? 'on' : 'off'}`;
      pill.textContent = isLock ? (isOn ? 'OPEN' : 'LOCK') : (isOn ? 'ON' : 'OFF');
      pill.setAttribute("onclick", `toggleDeviceState('${id}', ${!isOn})`);
    }

    const qt = qc.querySelector("input[type=checkbox]");
    if (qt) qt.checked = isOn;

    // 5. Update 3D State (Advanced)
    qc.classList.toggle("active", isOn);
    
    // Check both Quick Control and Main Grid canvases
    [`canv-${id}`, `main-canv-${id}`].forEach(cid => {
        if (QC_3D.scenes[cid]) QC_3D.scenes[cid].active = isOn;
    });

    const statEl = qc.querySelector(".qc-device-status");
    if (statEl) statEl.textContent = isOn ? "AKTIF" : "MATI";
  }
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
  addLog(STATE.devices[id]?.name, newState ? "Dinyalakan" : "Dimatikan", "Manual", "info");
  updateDashboardStats();

  // Built-in Automation Trigger (Smart Lock)
  const dtype = getDeviceType(STATE.devices[id]?.icon);
  if ((dtype === 'lock' || dtype === 'door') && typeof automationEngine !== 'undefined') {
    automationEngine._evaluateBuiltInRules('lock', { id, state: newState });
  }
}

/**
 * Membangun payload JSON untuk perintah MQTT berdasarkan tipe perangkat.
 */
function buildDevicePayload(deviceId, state) {
  const id     = String(deviceId);
  const extras = STATE.deviceExtras[id] || {};
  const device = STATE.devices[id];
  const dtype  = getDeviceType(device?.icon);
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
  
  addLog(STATE.devices[id]?.name, `${newState ? "ON" : "OFF"} (${reason})`, "Automation", newState ? "success" : "info");
  updateDashboardStats();

  // Built-in Automation Trigger (Smart Lock)
  const dtype = getDeviceType(STATE.devices[id]?.icon);
  if ((dtype === 'lock' || dtype === 'door') && typeof automationEngine !== 'undefined') {
    automationEngine._evaluateBuiltInRules('lock', { id, state: newState });
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
  
  addLog(STATE.devices[id]?.name, `Kipas kecepatan ${speed}%`, "Manual", "info");
}

function setACMode(deviceId, mode) {
  const id = String(deviceId);
  if (!STATE.deviceExtras[id]) STATE.deviceExtras[id] = {};
  STATE.deviceExtras[id].acMode = mode;
  
  document.querySelectorAll(`#ac-ctrl-${id} .ac-mode-btn`).forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
  
  const t = STATE.deviceTopics[id];
  if (t?.pub && STATE.deviceStates[id]) publishMQTT(t.pub, { state: 1, mode, temp: STATE.deviceExtras[id].acTemp || 24 });
  
  addLog(STATE.devices[id]?.name, `Mode AC: ${mode.toUpperCase()}`, "Manual", "info");
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
  const dtype  = getDeviceType(device.icon);
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

function buildDeviceCardHTML(deviceId) {
  const id     = String(deviceId);
  const device = STATE.devices[id];
  if (!device) return "";
  const isOn   = !!STATE.deviceStates[id];
  const dtype  = getDeviceType(device.icon);
  const accent = (dtype === 'light' ? '#fbbf24' : (dtype === 'fan' || dtype === 'ac' ? '#22d3ee' : '#10b981'));
  
  const statusHtml = isOn ? "ON" : "OFF";

  return `
    <div class="device-card device-${dtype} ${isOn ? "on active" : ""}" id="card-${id}" onclick="handleDeviceCardClick('${id}')">
      <div class="device-top">
        <div class="device-actions">
          <button onclick="event.stopPropagation(); openTopicSettings('${id}')" title="Settings"><i class="fas fa-cog"></i></button>
          <button class="del" onclick="event.stopPropagation(); removeDevice('${id}')" title="Hapus"><i class="fas fa-trash"></i></button>
        </div>
      </div>
      
      <div class="btn-wrap">
        <div class="btn-pulse"></div>
        <div class="btn-ring"></div>
        <canvas class="btn-canvas" id="main-canv-${id}"></canvas>
        <div class="btn-surface">
          <div class="power-icon">${getDevice3DSVG(dtype)}</div>
        </div>
        <div class="particles" id="main-parts-${id}"></div>
      </div>

      <div class="device-name">${escHtml(device.name)}</div>
      <div class="device-status ${isOn ? "on" : ""}" id="dur-${id}">${statusHtml}</div>
      
      ${buildDeviceExtraHTML(id, device)}
    </div>
  `;
}

/**
 * Handler khusus klik card di grid utama untuk memicu animasi 3D.
 */
function handleDeviceCardClick(id) {
    const next = !STATE.deviceStates[id];
    const card = document.getElementById(`card-${id}`);
    const surface = card?.querySelector('.btn-surface');
    const dtype = getDeviceType(STATE.devices[id]?.icon);
    const accent = (dtype === 'light' ? '#fbbf24' : (dtype === 'fan' || dtype === 'ac' ? '#22d3ee' : '#10b981'));

    if (surface) {
        gsap.timeline()
            .to(surface, { scale: 0.88, duration: 0.1, ease: 'power2.in' })
            .to(surface, { scale: next ? 1.06 : 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' })
            .to(surface, { scale: 1, duration: 0.2, ease: 'power2.out' }, '-=0.15');
    }

    if (next) spawnQCParticles(`main-parts-${id}`, accent, true);
    if (QC_3D.scenes[`main-canv-${id}`]) QC_3D.scenes[`main-canv-${id}`].active = next;
    
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
    const device = STATE.devices[id];
    const isOn = !!STATE.deviceStates[id];
    const dtype = getDeviceType(device.icon);
    const accent = (dtype === 'light' ? '#fbbf24' : (dtype === 'fan' || dtype === 'ac' ? '#22d3ee' : '#10b981'));

    const card = document.createElement('div');
    card.className = `device-card device-${dtype} ${isOn ? 'active on' : ''}`;
    card.id = `card-${id}`;
    
    card.onclick = () => {
        const next = !STATE.deviceStates[id];
        if (next) spawnQCParticles(`main-parts-${id}`, accent, true);
        if (QC_3D.scenes[`main-canv-${id}`]) QC_3D.scenes[`main-canv-${id}`].active = next;
        toggleDeviceState(id, next);
    };

    card.innerHTML = `
      <div class="card-glow" style="--card-accent: ${accent}"></div>
      <div class="card-controls-top">
        <button class="card-action-btn" onclick="event.stopPropagation(); openTopicSettings('${id}')"><i class="fas fa-cog"></i></button>
        <button class="card-action-btn trash" onclick="event.stopPropagation(); removeDevice('${id}')"><i class="fas fa-trash"></i></button>
      </div>
      <div class="btn-wrap">
        <div class="btn-pulse" style="background: ${accent}"></div>
        <canvas class="btn-canvas" id="main-canv-${id}"></canvas>
        <div class="btn-surface">
             <div class="power-icon" style="opacity: ${isOn ? 0 : 0.4}">${getDevice3DSVG(dtype)}</div>
        </div>
        <div class="particles" id="main-parts-${id}"></div>
      </div>
      <div class="device-info">
        <div class="device-name">${escHtml(device.name)}</div>
        <div class="device-usage" id="dur-${id}">${isOn ? 'Aktif' : 'Standby'}</div>
      </div>
      
      <div class="device-controls-area">
          <div id="speed-row-${id}" class="control-row" style="display: ${isOn && dtype === 'fan' ? 'flex' : 'none'}">
            <i class="fas fa-wind" style="font-size:10px;opacity:0.5"></i>
            <input type="range" class="nebula-slider" min="1" max="3" value="${STATE.deviceExtras[id]?.fanSpeed || 2}" 
                   oninput="event.stopPropagation(); setFanSpeed('${id}', this.value)">
            <span class="ctrl-val">${(STATE.deviceExtras[id]?.fanSpeed || 2) * 25 + 25}%</span>
          </div>
          <div id="brightness-row-${id}" class="control-row" style="display: ${isOn && dtype === 'light' ? 'flex' : 'none'}">
            <i class="fas fa-sun" style="font-size:10px;opacity:0.5"></i>
            <input type="range" class="nebula-slider" min="10" max="100" value="80" oninput="event.stopPropagation()">
          </div>
      </div>

      <div class="device-status-pill ${isOn ? 'on' : ''}">${isOn ? 'ONLINE' : 'OFFLINE'}</div>
    `;
    
    grid.appendChild(card);
    setTimeout(() => initDevice3D(`main-canv-${id}`, accent, id), 10);
  });
}

function filterDevices(q) {
  const lq = q.toLowerCase();
  document.querySelectorAll(".device-card").forEach((c) => {
    const id = c.id.replace("card-", "");
    c.style.display = (STATE.devices[id]?.name?.toLowerCase() || "").includes(lq) ? "" : "none";
  });
}

/* ==================== 3D UI HELPERS (Advanced) ==================== */

/**
 * Mendapatkan SVG kustom untuk tombol 3D berdasarkan tipe perangkat.
 */
function getDevice3DSVG(dtype) {
  if (dtype === "light") {
    return `<svg viewBox="0 0 40 40" fill="none">
      <circle class="icon-ring" cx="20" cy="20" r="13" stroke-width="1.5" stroke-linecap="round" />
      <path class="icon-stem" d="M16 21 Q18 17 20 15 Q22 17 24 21" stroke-width="1.5" stroke-linecap="round" />
      <line class="icon-stem" x1="17" y1="23" x2="23" y2="23" stroke-width="1.5" stroke-linecap="round" />
      <line class="icon-stem" x1="19" y1="25" x2="21" y2="25" stroke-width="1.5" stroke-linecap="round" />
    </svg>`;
  }
  if (dtype === "fan" || dtype === "ac") {
    return `<svg viewBox="0 0 40 40" fill="none">
      <circle class="icon-ring" cx="20" cy="20" r="13" stroke-width="1.5" stroke-linecap="round" />
      <g class="fan-blades">
        <path class="icon-stem" d="M20 20 C20 16, 23 14, 23 17" stroke-width="1.5" stroke-linecap="round" />
        <path class="icon-stem" d="M20 20 C24 20, 26 23, 23 23" stroke-width="1.5" stroke-linecap="round" />
        <path class="icon-stem" d="M20 20 C20 24, 17 26, 17 23" stroke-width="1.5" stroke-linecap="round" />
        <path class="icon-stem" d="M20 20 C16 20, 14 17, 17 17" stroke-width="1.5" stroke-linecap="round" />
      </g>
      <circle class="icon-stem" cx="20" cy="20" r="1.5" fill="currentColor" stroke="none" />
    </svg>`;
  }
  if (dtype === "lock" || dtype === "door") {
    return `<svg viewBox="0 0 40 40" fill="none">
        <circle class="icon-ring" cx="20" cy="20" r="13" stroke-width="1.5" stroke-linecap="round" />
        <path class="icon-stem" d="M15 22 V27 H25 V22 M16 22 V18 C16 15 18 13 20 13 C22 13 24 15 24 18 V22" stroke-width="1.5" stroke-linecap="round" />
        <circle class="icon-stem" cx="20" cy="24.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>`;
  }
  if (dtype === "tv") {
    return `<svg viewBox="0 0 40 40" fill="none">
        <circle class="icon-ring" cx="20" cy="20" r="13" stroke-width="1.5" stroke-linecap="round" />
        <rect class="icon-stem" x="14" y="15" width="12" height="9" rx="1" stroke-width="1.5" />
        <path class="icon-stem" d="M18 24 L17 26 M22 24 L23 26" stroke-width="1.5" stroke-linecap="round" />
    </svg>`;
  }
  return `<svg viewBox="0 0 40 40" fill="none">
    <circle class="icon-ring" cx="20" cy="20" r="13" stroke-width="1.5" stroke-linecap="round" />
    <path class="icon-stem pump-drops" d="M20 13 C20 13 15 19 15 22.5 C15 25.5 17.2 28 20 28 C22.8 28 25 25.5 25 22.5 C25 19 20 13 20 13Z" stroke-width="1.5" stroke-linecap="round" />
    <path class="icon-stem" d="M18.5 23 Q18.5 25.5 20.5 25.5" stroke-width="1" stroke-linecap="round" opacity="0.5" />
  </svg>`;
}

const QC_3D = { scenes: {} };

/**
 * Membuat grup ikon 3D premium berdasarkan tipe perangkat.
 */
function create3DIcon(dtype, hexColor) {
  const group = new THREE.Group();
  const color = new THREE.Color(hexColor);
  
  // Material Dasar Premium (Plastik/Logam Mengkilap)
  const baseMat = new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.9,
    roughness: 0.05,
    emissive: color,
    emissiveIntensity: 0.3, // Lebih terang saat idle
  });

  // Material Glow (Pendar)
  const glowMat = new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.6,
    roughness: 0.1,
    emissive: color,
    emissiveIntensity: 1.2,
  });

  if (dtype === "light") {
    // Elegant Bulb Base
    const baseGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.25, 24);
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.3;
    group.add(base);

    // Tech Bulb (Low-poly Elegant)
    const bulbGeo = new THREE.IcosahedronGeometry(0.42, 1);
    const bulb = new THREE.Mesh(bulbGeo, glowMat);
    bulb.position.y = 0.22;
    group.add(bulb);
  } else if (dtype === "fan" || dtype === "ac") {
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.15, 24), baseMat);
    hub.rotation.x = Math.PI/2;
    group.add(hub);
    
    // Aerodynamic Blades
    const engine = new THREE.Group();
    for (let i = 0; i < 4; i++) {
        const bladeGeo = new THREE.BoxGeometry(0.75, 0.18, 0.04);
        const blade = new THREE.Mesh(bladeGeo, glowMat);
        blade.position.x = 0.45;
        const pivot = new THREE.Group();
        pivot.rotation.z = (i * Math.PI) / 2;
        pivot.add(blade);
        engine.add(pivot);
    }
    group.add(engine);
    group.userData.engine = engine;
  } else if (dtype === "lock" || dtype === "door") {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.22, 1, 1, 1), baseMat);
    body.position.y = -0.1;
    group.add(body);
    
    // Smooth Shackle
    const shackleGeo = new THREE.TorusGeometry(0.25, 0.07, 12, 32, Math.PI);
    const shackle = new THREE.Mesh(shackleGeo, glowMat);
    shackle.position.y = 0.15;
    group.add(shackle);
  } else if (dtype === "tv" || dtype === "speaker") {
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.52, 0.08), baseMat);
    group.add(bezel);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.45), glowMat);
    screen.position.z = 0.05;
    group.add(screen);
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, 0.18, 16), baseMat);
    stand.position.y = -0.38;
    group.add(stand);
  } else if (dtype === "pump") {
    // Sharp Crystal for Smart Pump
    const coreGeo = new THREE.OctahedronGeometry(0.45, 0);
    const core = new THREE.Mesh(coreGeo, glowMat);
    core.scale.set(0.7, 1.5, 0.7);
    group.add(core);
  } else {
    // Tech Diamond for General Switch
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), glowMat);
    core.rotation.set(Math.PI/4, Math.PI/4, 0);
    group.add(core);
  }

  return group;
}

/**
 * Inisialisasi visual Three.js Premium.
 */
function initDevice3D(canvasId, hexColor, deviceId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(90, 90);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 3.2;

  const dtype = getDeviceType(STATE.devices[deviceId]?.icon);
  const iconGroup = create3DIcon(dtype, hexColor);
  scene.add(iconGroup);

  // Advanced Lighting System
  scene.add(new THREE.AmbientLight(0xffffff, 1.2));
  const p1 = new THREE.PointLight(0xffffff, 3.5, 10);
  p1.position.set(2, 3, 4);
  scene.add(p1);
  const p2 = new THREE.PointLight(hexColor, 3, 5);
  p2.position.set(-2, -1, 1);
  scene.add(p2);

  QC_3D.scenes[canvasId] = { 
    iconGroup, renderer, scene, camera, 
    active: !!STATE.deviceStates[deviceId],
    lastState: !!STATE.deviceStates[deviceId]
  };

  // GSAP Levitation Animation
  gsap.to(iconGroup.position, {
    y: 0.1,
    duration: 2 + Math.random(),
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
  });

  function loop(time) {
    if (!document.getElementById(canvasId)) return;
    requestAnimationFrame(loop);
    
    const sc = QC_3D.scenes[canvasId];
    if (sc.active !== sc.lastState) {
        // Trigger transisi smooth saat state berubah
        iconGroup.traverse(m => {
            if (m.material) {
                gsap.to(m.material, { 
                    emissiveIntensity: sc.active ? 1.2 : 0.2, 
                    duration: 0.6, 
                    ease: "power2.out" 
                });
            }
        });
        sc.lastState = sc.active;
    }

    if (sc.active) {
      iconGroup.rotation.y += 0.012;
      if (groupHasEngine(iconGroup)) iconGroup.userData.engine.rotation.z += 0.18;
    } else {
      iconGroup.rotation.y *= 0.96;
      if (groupHasEngine(iconGroup)) iconGroup.userData.engine.rotation.z *= 0.94;
    }
    renderer.render(scene, camera);
  }
  
  function groupHasEngine(g) { return g && g.userData && g.userData.engine; }
  
  loop(0);
}

/**
 * Efek partikel saat aktivasi tombol.
 */
function spawnQCParticles(containerId, color, isOn) {
    const cont = document.getElementById(containerId);
    if (!cont || !isOn) return;
    cont.innerHTML = '';
    for (let i = 0; i < 8; i++) {
        const p = document.createElement('div');
        p.className = 'qc-particle';
        p.style.background = color;
        cont.appendChild(p);
        const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
        const dist = 30 + Math.random() * 20;
        gsap.fromTo(p, { x: 0, y: 0, opacity: 1, scale: 1 }, {
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist,
            opacity: 0,
            scale: 0.2,
            duration: 0.5 + Math.random() * 0.3,
            ease: 'power2.out',
            onComplete: () => p.remove()
        });
    }
}

/* ==================== QUICK CONTROLS ==================== */

/**
 * Merender Quick Control Card 3D Premium ke Dashboard.
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

  selected.forEach((id) => {
    const device = STATE.devices[id];
    const isOn = !!STATE.deviceStates[id];
    const dtype = getDeviceType(device.icon);
    const accent = (dtype === 'light' ? '#fbbf24' : (dtype === 'fan' || dtype === 'ac' ? '#22d3ee' : '#10b981'));
    
    const card = document.createElement('div');
    card.className = `device-card device-${dtype} ${isOn ? 'active on' : ''}`;
    card.id = `qc-${id}`;
    card.dataset.id = id;
    
    card.onclick = () => {
        const next = !STATE.deviceStates[id];
        const surface = card.querySelector('.btn-surface');
        
        gsap.timeline()
            .to(surface, { scale: 0.88, duration: 0.1, ease: 'power2.in' })
            .to(surface, { scale: next ? 1.06 : 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' })
            .to(surface, { scale: 1, duration: 0.2, ease: 'power2.out' }, '-=0.15');

        if (next) spawnQCParticles(`parts-${id}`, accent, true);
        if (QC_3D.scenes[`canv-${id}`]) QC_3D.scenes[`canv-${id}`].active = next;
        
        toggleDeviceState(id, next);
    };

    card.innerHTML = `
      <div class="card-glow" style="--card-accent: ${accent}"></div>
      <div class="card-controls-top">
        <button class="card-action-btn" onclick="event.stopPropagation(); openTopicSettings('${id}')"><i class="fas fa-cog"></i></button>
        <button class="card-action-btn trash" onclick="event.stopPropagation(); removeDevice('${id}')"><i class="fas fa-trash"></i></button>
      </div>
      <div class="btn-wrap">
        <div class="btn-pulse" style="background: ${accent}"></div>
        <canvas class="btn-canvas" id="canv-${id}"></canvas>
        <div class="btn-surface">
             <div class="power-icon" style="opacity: ${isOn ? 0 : 0.4}">${getDevice3DSVG(dtype)}</div>
        </div>
        <div class="particles" id="parts-${id}"></div>
      </div>
      <div class="device-info">
        <div class="device-name">${escHtml(device.name)}</div>
        <div class="device-usage" id="dur-${id}">${isOn ? 'Aktif' : 'Standby'}</div>
      </div>

      <div class="device-controls-area">
          <div id="speed-row-qc-${id}" class="control-row" style="display: ${isOn && dtype === 'fan' ? 'flex' : 'none'}">
            <i class="fas fa-wind" style="font-size:10px;opacity:0.5"></i>
            <input type="range" class="nebula-slider" min="1" max="3" value="${STATE.deviceExtras[id]?.fanSpeed || 2}" 
                   oninput="event.stopPropagation(); setFanSpeed('${id}', this.value)">
            <span class="ctrl-val">${(STATE.deviceExtras[id]?.fanSpeed || 2) * 25 + 25}%</span>
          </div>
      </div>

      <div class="device-status-pill ${isOn ? 'on' : ''}">${isOn ? 'ONLINE' : 'OFFLINE'}</div>
    `;
    
    container.appendChild(card);
    setTimeout(() => initDevice3D(`canv-${id}`, accent, id), 10);
  });
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
      <div class="qc-picker-icon"><i class="fas ${device.icon || 'fa-plug'}"></i></div>
      <div class="qc-picker-meta">
        <strong>${escHtml(device.name)}</strong>
        <span>${getDeviceTypeName(device.icon)}</span>
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
  if (g("editDeviceIcon"))  g("editDeviceIcon").value  = device.icon    || "fa-plug";
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
  const icon = document.getElementById("editDeviceIcon")?.value;
  const top  = document.getElementById("deviceTopic")?.value.trim();
  const btn  = document.getElementById("btnSaveDeviceEdit");

  if (!name) { showToast("Nama perangkat harus diisi!", "warning"); return; }

  try {
    isDeviceActionBusy = true;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...'; }

    const result = await apiPost("update_device", { id, name, icon, topic_sub: top, topic_pub: top });
    if (result?.success) {
      STATE.devices[id]      = { ...STATE.devices[id], name, icon, topic_sub: top, topic_pub: top };
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
  document.getElementById("addDeviceModal")?.classList.add("active");
}

function closeAddDeviceModal() { document.getElementById("addDeviceModal")?.classList.remove("active"); }

async function saveNewDevice() {
  if (isDeviceActionBusy) return;
  const name = document.getElementById("newDeviceName")?.value.trim();
  const icon = document.getElementById("newDeviceIcon")?.value  || "fa-plug";
  const top  = document.getElementById("newDeviceTopic")?.value.trim();
  const btn  = document.getElementById("btnSaveNewDevice");

  if (!name) { showToast("Nama perangkat harus diisi!", "warning"); return; }

  try {
    isDeviceActionBusy = true;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menambahkan...'; }

    const result = await apiPost("add_device", { name, icon, topic_sub: top, topic_pub: top });
    if (result?.success) {
      const id = String(result.id);
      STATE.devices[id]      = { id, name, icon, type: "switch", device_key: result.device_key, topic_sub: top, topic_pub: top };
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
      addLog(name, "Perangkat baru ditambahkan", "System", "success");
      
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
      addLog(name, "Perangkat dihapus", "System", "warning");

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
