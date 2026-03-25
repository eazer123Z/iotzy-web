function getDeviceType(icon) {
  const map = {
    "fa-lightbulb": "light", "fa-wind": "fan", "fa-snowflake": "ac",
    "fa-tv": "tv", "fa-lock": "lock", "fa-door-open": "door",
    "fa-video": "cctv", "fa-volume-up": "speaker", "fa-plug": "switch",
  };
  return map[icon] || "switch";
}

function getDeviceTypeName(icon) {
  const map = {
    "fa-lightbulb": "Lampu", "fa-wind": "Kipas Angin",
    "fa-snowflake": "AC / Pendingin", "fa-tv": "Televisi",
    "fa-lock": "Kunci Pintu", "fa-door-open": "Pintu",
    "fa-video": "Kamera CCTV", "fa-volume-up": "Speaker / Alarm",
    "fa-plug": "Stop Kontak",
  };
  return map[icon] || "Perangkat IoT";
}

function updateDeviceUI(deviceId) {
  const id     = String(deviceId);
  const device = STATE.devices[id];
  if (!device) return;
  const isOn   = !!STATE.deviceStates[id];
  const dtype  = getDeviceType(device.icon);
  const isLock = (dtype === 'lock' || dtype === 'door');
  const g      = (s) => document.getElementById(s);
  
  g(`card-${id}`)?.classList.toggle("on", isOn);
  g(`dot-${id}`)?.classList.toggle("on", isOn);
  g(`icon-${id}`)?.classList.toggle("on", isOn);
  g(`row-${id}`)?.classList.toggle("on", isOn);
  const tog = g(`device-toggle-${id}`);
  if (tog) tog.checked = isOn;
  const lbl = g(`lbl-${id}`);
  if (lbl) { 
    lbl.textContent = isLock ? (isOn ? "Terbuka" : "Terkunci") : (isOn ? "Aktif" : "Mati"); 
    lbl.className = "status-text" + (isOn ? " on" : ""); 
  }
  const dur = g(`dur-${id}`);
  if (dur) {
    dur.textContent = isLock ? (isOn ? "Dibuka" : "Terkunci") : (isOn ? "Baru nyala" : "Mati");
    dur.classList.toggle("on", isOn);
  }
  g(`speed-row-${id}`)?.style.setProperty('display', isOn && dtype === 'fan' ? 'flex' : 'none');
  g(`ac-ctrl-${id}`)?.style.setProperty('display', isOn && dtype === 'ac' ? 'flex' : 'none');
  g(`brightness-row-${id}`)?.style.setProperty('display', isOn && dtype === 'light' ? 'flex' : 'none');
  g(`volume-row-${id}`)?.style.setProperty('display', isOn && dtype === 'speaker' ? 'flex' : 'none');
  if (isLock) {
    const lb = g(`lock-btn-${id}`);
    if (lb) {
      lb.className = `lock-btn ${isOn ? "unlock" : "lock"}`;
      lb.innerHTML = isOn ? `<i class="fas fa-lock-open"></i> BUKA KUNCI` : `<i class="fas fa-lock"></i> TERKUNCI`;
    }
  }
  const qc = g(`qc-${id}`);
  if (qc) {
    qc.classList.toggle("on", isOn);
    const qs = qc.querySelector(".qc-status");
    if (qs) qs.textContent = isLock ? (isOn ? "Terbuka" : "Terkunci") : (isOn ? "Aktif" : "Mati");
    const pill = qc.querySelector('.qc-pill');
    if (pill) {
      pill.className = `qc-pill ${isOn ? 'on' : 'off'}`;
      pill.textContent = isLock ? (isOn ? 'OPEN' : 'LOCK') : (isOn ? 'ON' : 'OFF');
    }
    const qt = qc.querySelector("input[type=checkbox]");
    if (qt) qt.checked = isOn;
  }
}

function toggleDeviceState(deviceId, newState) {
  const id   = String(deviceId);
  const prev = STATE.deviceStates[id];
  STATE.deviceStates[id] = newState;
  if (newState && !prev) STATE.deviceOnAt[id] = Date.now();
  else if (!newState) delete STATE.deviceOnAt[id];
  updateDeviceUI(id);
  const t = STATE.deviceTopics[id];
  if (t?.pub) publishMQTT(t.pub, buildDevicePayload(id, newState));
  apiPost("update_device_state", { id, state: newState ? 1 : 0, trigger: "Manual" }).catch(() => {});
  addLog(STATE.devices[id]?.name, newState ? "Dinyalakan" : "Dimatikan", "Manual", "info");
  updateDashboardStats();
}

function buildDevicePayload(deviceId, state) {
  const id     = String(deviceId);
  const extras = STATE.deviceExtras[id] || {};
  const device = STATE.devices[id];
  const dtype  = getDeviceType(device?.icon);
  const base   = { state: state ? 1 : 0 };
  if (dtype === "fan" && state) return { ...base, speed: extras.fanSpeed || 50 };
  if (dtype === "ac" && state) return { ...base, mode: extras.acMode || "cool", temp: extras.acTemp || 24 };
  if (dtype === "light" && state) return { ...base, brightness: extras.brightness || 100 };
  if (dtype === "speaker" && state) return { ...base, volume: extras.volume || 60 };
  return base;
}

function applyDeviceState(deviceId, newState, reason = "Automation") {
  const id = String(deviceId);
  if (STATE.deviceStates[id] === newState) return;
  STATE.deviceStates[id] = newState;
  if (newState) STATE.deviceOnAt[id] = Date.now();
  else delete STATE.deviceOnAt[id];
  updateDeviceUI(id);
  const t = STATE.deviceTopics[id];
  if (t?.pub) publishMQTT(t.pub, buildDevicePayload(id, newState));
  if (reason !== "AI Assistant (Sync)") apiPost("update_device_state", { id, state: newState ? 1 : 0, trigger: reason }).catch(() => {});
  addLog(STATE.devices[id]?.name, `${newState ? "ON" : "OFF"} (${reason})`, "Automation", newState ? "success" : "info");
  updateDashboardStats();
}

function setFanSpeed(deviceId, speed) {
  const id = String(deviceId);
  if (!STATE.deviceExtras[id]) STATE.deviceExtras[id] = {};
  STATE.deviceExtras[id].fanSpeed = parseInt(speed);
  const t = STATE.deviceTopics[id];
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
  const id = String(deviceId);
  if (!STATE.deviceExtras[id]) STATE.deviceExtras[id] = {};
  const cur = STATE.deviceExtras[id].acTemp || 24;
  const nxt = Math.min(30, Math.max(16, cur + delta));
  STATE.deviceExtras[id].acTemp = nxt;
  const el = document.getElementById(`ac-temp-${id}`);
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
  const id = String(deviceId);
  const isOn = STATE.deviceStates[id];
  toggleDeviceState(id, !isOn);
}

function buildDeviceCardHTML(id) {
  const device = STATE.devices[id];
  const isOn = !!STATE.deviceStates[id];
  const dtype = getDeviceType(device.icon);
  const isLock = (dtype === 'lock' || dtype === 'door');
  const dname = escHtml(device.name);
  const tname = getDeviceTypeName(device.icon);
  const extra = buildDeviceExtraHTML(id, device);

  return `
    <div class="device-card ${isOn ? 'on' : ''}" id="card-${id}">
      <div class="device-card-header">
        <div class="device-icon ${isOn ? 'on' : ''}" id="icon-${id}">
          <i class="fas ${device.icon || 'fa-plug'}"></i>
        </div>
        <div class="device-actions">
          <button class="icon-btn" onclick="openTopicSettings('${id}')"><i class="fas fa-cog"></i></button>
          <button class="trash-btn" onclick="removeDevice('${id}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>
      <div class="device-info">
        <div class="device-name">${dname}</div>
        <div class="device-sub">${tname}</div>
        <div class="device-status" id="lbl-${id}">${isLock ? (isOn ? "Terbuka" : "Terkunci") : (isOn ? "Aktif" : "Mati")}</div>
      </div>
      <div class="device-controls">
        <label class="toggle-wrapper">
          <input type="checkbox" class="toggle-input" id="device-toggle-${id}" ${isOn ? 'checked' : ''} onchange="toggleDeviceState('${id}', this.checked)">
          <span class="toggle-track"></span>
        </label>
        ${extra}
      </div>
    </div>`;
}

function buildDeviceExtraHTML(id, device) {
  const isOn = STATE.deviceStates[id];
  const extras = STATE.deviceExtras[id] || {};
  const dtype = getDeviceType(device.icon);
  const show = isOn ? "" : "none";
  if (dtype === "fan") {
    const spd = extras.fanSpeed || 50;
    return `
      <div id="speed-row-${id}" class="fan-speed-row" style="display:${show}">
        <i class="fas fa-wind" style="font-size:11px;color:var(--ink-4)"></i>
        <input type="range" id="fan-speed-${id}" class="fan-slider" min="0" max="100" step="25" value="${spd}" oninput="setFanSpeed('${id}',this.value)">
        <span id="fan-speed-label-${id}" class="fan-speed-val">${spd}%</span>
      </div>`;
  }
  if (dtype === "ac") {
    const modes = [
      { key: "cool", icon: "❄️", label: "Cool" }, { key: "heat", icon: "🔥", label: "Heat" },
      { key: "fan", icon: "🌀", label: "Fan" }, { key: "dry", icon: "💧", label: "Dry" },
      { key: "auto", icon: "♾️", label: "Auto" },
    ];
    const temp = extras.acTemp || 24;
    const mode = extras.acMode || "cool";
    return `
      <div id="ac-ctrl-${id}" class="ac-controls" style="display:${show}">
        <div class="ac-mode-row">${modes.map((m) => `<button class="ac-mode-btn${m.key === mode ? " active" : ""}" data-mode="${m.key}" onclick="setACMode('${id}','${m.key}')" title="${m.label}">${m.icon}</button>`).join("")}</div>
        <div class="ac-temp-row">
          <button class="ac-temp-btn" onclick="adjustACTemp('${id}',-1)">−</button>
          <div class="ac-temp-val"><span id="ac-temp-${id}">${temp}°C</span></div>
          <button class="ac-temp-btn" onclick="adjustACTemp('${id}',1)">+</button>
        </div>
      </div>`;
  }
  if (dtype === "light") {
    const bri = extras.brightness || 100;
    return `
      <div id="brightness-row-${id}" class="brightness-row" style="display:${show}">
        <i class="fas fa-sun" style="font-size:11px;color:var(--amber)"></i>
        <input type="range" id="brightness-${id}" class="brightness-slider" min="10" max="100" step="10" value="${bri}" oninput="setLightBrightness('${id}',this.value)">
        <span id="brightness-label-${id}" class="brightness-val">${bri}%</span>
      </div>`;
  }
  if (dtype === "speaker") {
    const vol = extras.volume || 60;
    return `
      <div id="volume-row-${id}" class="volume-row" style="display:${show}">
        <i class="fas fa-volume-${vol > 50 ? "high" : vol > 0 ? "low" : "xmark"}" id="vol-icon-${id}" style="font-size:11px;color:var(--purple)"></i>
        <input type="range" id="volume-${id}" class="volume-slider" min="0" max="100" step="5" value="${vol}" oninput="setVolume('${id}',this.value)">
        <span id="volume-label-${id}" class="volume-val">${vol}%</span>
      </div>`;
  }
  if (dtype === "lock" || dtype === "door") {
    return `
      <div class="lock-control">
        <button id="lock-btn-${id}" onclick="toggleLock('${id}')" class="lock-btn ${isOn ? "unlock" : "lock"}">
          ${isOn ? '<i class="fas fa-lock-open"></i> BUKA KUNCI' : '<i class="fas fa-lock"></i> TERKUNCI'}
        </button>
      </div>`;
  }
  return "";
}

function renderDevices() {
  const grid = document.getElementById('devicesGrid');
  const empty = document.getElementById('emptyDevices');
  if (!grid) return;
  const keys = Object.keys(STATE.devices || {});
  grid.innerHTML = '';
  if (empty) empty.classList.toggle('hidden', keys.length > 0);
  keys.forEach((id) => {
    const wrap = document.createElement('div');
    wrap.innerHTML = buildDeviceCardHTML(String(id)).trim();
    const node = wrap.firstElementChild;
    if (node) grid.appendChild(node);
  });
}

function filterDevices(q) {
  const lq = q.toLowerCase();
  document.querySelectorAll(".device-card").forEach((c) => {
    const id = c.id.replace("card-", "");
    c.style.display = (STATE.devices[id]?.name?.toLowerCase() || "").includes(lq) ? "" : "none";
  });
}

function renderQuickControls() {
  const container = document.getElementById('quickControlsContainer');
  if (!container) return;
  container.innerHTML = '';
  const selected = (STATE.quickControlDevices || []).map(String).filter((id) => STATE.devices[id]);
  if (!selected.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:32px 16px;color:var(--ink-4)">
        <i class="fas fa-hand-pointer" style="font-size:22px;margin-bottom:10px;display:block;opacity:.25"></i>
        <p style="font-size:12px;margin-bottom:10px">Belum ada perangkat dipilih</p>
        <button onclick="openQuickControlSettings()" style="font-size:11px;color:var(--a);background:none;border:none;cursor:pointer;font-family:inherit">Pilih perangkat →</button>
      </div>`;
    return;
  }
  selected.forEach((id) => {
    const device = STATE.devices[id];
    const isOn   = !!STATE.deviceStates[id];
    const dtype  = getDeviceType(device.icon);
    const isLock = dtype === 'lock' || dtype === 'door';
    const item   = document.createElement('div');
    item.className = `qc-item${isOn ? ' on' : ''}`;
    item.id = `qc-${id}`;
    item.onclick = () => isLock ? toggleLock(id) : toggleDeviceState(id, !STATE.deviceStates[id]);
    item.innerHTML = `
      <div class="qc-info">
        <div class="qc-icon"><i class="fas ${device.icon || 'fa-plug'}"></i></div>
        <div>
          <div class="qc-name">${escHtml(device.name)}</div>
          <div class="qc-status">${isLock ? (isOn ? 'Terbuka' : 'Terkunci') : (isOn ? 'Aktif' : 'Mati')}</div>
        </div>
      </div>
      <div class="qc-pill ${isOn ? 'on' : 'off'}">
        ${isLock ? (isOn ? 'OPEN' : 'LOCK') : (isOn ? 'ON' : 'OFF')}
      </div>`;
    container.appendChild(item);
  });
}

function toggleQuickControlPick(id) {
  const current = (STATE.quickControlDevices || []).map(String);
  const idx = current.indexOf(String(id));
  if (idx >= 0) current.splice(idx, 1);
  else {
    if (current.length >= 4) return showToast('Maksimal 4 perangkat!', 'warning');
    current.push(String(id));
  }
  STATE.quickControlDevices = current;
  renderQuickControlPicker();
}

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
    const isSel  = (STATE.quickControlDevices || []).map(String).includes(String(id));
    const item   = document.createElement('button');
    item.type = 'button';
    item.className = `qc-picker-card${isSel ? ' active' : ''}`;
    item.innerHTML = `
      <div class="qc-picker-icon"><i class="fas ${device.icon || 'fa-plug'}"></i></div>
      <div class="qc-picker-meta">
        <strong>${escHtml(device.name)}</strong>
        <span>${getDeviceTypeName(device.icon)}</span>
      </div>
      <div class="qc-picker-state">${isSel ? 'Dipilih' : 'Pilih'}</div>`;
    item.onclick = () => toggleQuickControlPick(id);
    list.appendChild(item);
  });
}

function openQuickControlSettings() {
  renderQuickControlPicker();
  document.getElementById('quickControlModal')?.classList.add('show');
}

function closeQuickControlSettings() {
  document.getElementById('quickControlModal')?.classList.remove('show');
}

async function saveQuickControlSettings() {
  STATE.quickControlDevices = (STATE.quickControlDevices || []).map(String).slice(0, 4);
  await apiPost('save_settings', { quick_control_devices: STATE.quickControlDevices });
  renderQuickControls();
  closeQuickControlSettings();
  showToast('Quick Control diperbarui!', 'success');
}

function openTopicSettings(deviceId) {
  const id     = String(deviceId);
  const device = STATE.devices[id];
  if (!device) return;
  const topics = STATE.deviceTopics[id] || {};
  const g      = (i) => document.getElementById(i);
  if (g("topicDeviceName")) g("topicDeviceName").textContent = device.name;
  if (g("editDeviceName"))  g("editDeviceName").value  = device.name || "";
  if (g("editDeviceIcon"))  g("editDeviceIcon").value  = device.icon || "fa-plug";
  if (g("deviceTopicSub"))  g("deviceTopicSub").value  = topics.sub || device.topic_sub || "";
  if (g("deviceTopicPub"))  g("deviceTopicPub").value  = topics.pub || device.topic_pub || "";
  const modal = document.getElementById("topicModal");
  if (modal) { 
    modal.dataset.deviceId = id; 
    modal.classList.add("show"); 
  }
}

function closeTopicSettings() { document.getElementById("topicModal")?.classList.remove("show"); }

async function saveDeviceSettings() {
  const modal = document.getElementById("topicModal");
  if (!modal) return;
  const id    = String(modal.dataset.deviceId);
  const name  = document.getElementById("editDeviceName")?.value.trim();
  const icon  = document.getElementById("editDeviceIcon")?.value;
  const sub   = document.getElementById("deviceTopicSub")?.value.trim();
  const pub   = document.getElementById("deviceTopicPub")?.value.trim();
  if (!name) { showToast("Nama perangkat harus diisi!", "warning"); return; }
  const res = await apiPost("update_device", { id, name, icon, topic_sub: sub, topic_pub: pub });
  if (res?.success) {
    STATE.devices[id] = { ...STATE.devices[id], name, icon, topic_sub: sub, topic_pub: pub };
    STATE.deviceTopics[id] = { sub, pub };
    if (STATE.mqtt.connected && sub) { 
      try { STATE.mqtt.client.subscribe(sub); } catch (_) {} 
    }
    renderDevices(); 
    renderQuickControls(); 
    closeTopicSettings();
    showToast("Setting disimpan!", "success");
  } else {
    showToast("Gagal menyimpan setting", "error");
  }
}

function openAddDeviceModal() {
  ["newDeviceName", "newDeviceTopicSub", "newDeviceTopicPub"].forEach((id) => {
    const el = document.getElementById(id); if (el) el.value = "";
  });
  document.getElementById("addDeviceModal")?.classList.add("show");
}

function closeAddDeviceModal() { document.getElementById("addDeviceModal")?.classList.remove("show"); }

async function saveNewDevice() {
  const name = document.getElementById("newDeviceName")?.value.trim();
  if (!name) { showToast("Nama perangkat harus diisi!", "warning"); return; }
  const icon = document.getElementById("newDeviceIcon")?.value || "fa-plug";
  const sub  = document.getElementById("newDeviceTopicSub")?.value.trim();
  const pub  = document.getElementById("newDeviceTopicPub")?.value.trim();
  const res  = await apiPost("add_device", { name, icon, topic_sub: sub, topic_pub: pub });
  if (res?.success) {
    const id = String(res.id);
    STATE.devices[id] = { id, name, icon, type: "switch", device_key: res.device_key, topic_sub: sub, topic_pub: pub };
    STATE.deviceTopics[id] = { sub: sub || "", pub: pub || "" };
    STATE.deviceStates[id] = false;
    STATE.deviceExtras[id] = { fanSpeed: 50, acMode: "cool", acTemp: 24, brightness: 100, volume: 60 };
    if (STATE.mqtt.connected && sub) { try { STATE.mqtt.client.subscribe(sub); } catch (_) {} }
    renderDevices(); renderQuickControls();
    if (document.getElementById("navDeviceCount")) document.getElementById("navDeviceCount").textContent = Object.keys(STATE.devices).length;
    closeAddDeviceModal(); showToast("Perangkat ditambahkan!", "success");
    addLog(name, "Perangkat baru ditambahkan", "System", "success");
    if (typeof cvUI !== "undefined" && typeof cvUI.renderAutomationSettings === "function") cvUI.renderAutomationSettings();
  } else {
    showToast(res?.error || "Gagal menambah perangkat", "error");
  }
}

async function removeDevice(deviceId) {
  const id = String(deviceId);
  if (!confirm(`Hapus "${STATE.devices[id]?.name}"?`)) return;
  const res = await apiPost("delete_device", { id });
  if (res?.success) {
    const name = STATE.devices[id]?.name;
    delete STATE.devices[id]; delete STATE.deviceStates[id];
    delete STATE.deviceTopics[id]; delete STATE.deviceExtras[id]; delete STATE.deviceOnAt[id];
    STATE.quickControlDevices = STATE.quickControlDevices.filter((x) => String(x) !== id);
    renderDevices(); renderQuickControls(); updateDashboardStats();
    showToast("Perangkat dihapus", "info"); addLog(name, "Perangkat dihapus", "System", "warning");
    if (typeof cvUI !== "undefined" && typeof cvUI.renderAutomationSettings === "function") cvUI.renderAutomationSettings();
  } else {
    showToast("Gagal menghapus perangkat", "error");
  }
}
