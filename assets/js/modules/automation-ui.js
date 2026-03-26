const SENSOR_AUTO_META = {
  temperature: {
    icon: "fa-temperature-half", color: "var(--red)", bg: "var(--red-bg)", label: "Suhu", unit: "°C",
    conditions: [
      { key: "gt",    label: "Lebih dari (>)", defaultVal: 28 },
      { key: "lt",    label: "Kurang dari (<)", defaultVal: 24 },
      { key: "range", label: "Di luar rentang" },
    ],
    templates: [
      { name: "🌡️ Suhu Tinggi → Kipas Max",    condition: "gt", threshold: 28, action: "speed_high", targetIcon: "fa-wind"      },
      { name: "🌡️ Suhu Tinggi → AC ON",         condition: "gt", threshold: 28, action: "on",         targetIcon: "fa-snowflake" },
      { name: "🌡️ Suhu Normal → Kipas Lambat",  condition: "lt", threshold: 26, action: "speed_low",  targetIcon: "fa-wind"      },
      { name: "🌡️ Suhu Rendah → AC OFF",        condition: "lt", threshold: 24, action: "off",        targetIcon: "fa-snowflake" },
    ],
  },
  humidity:    { icon: "fa-droplet",              color: "var(--blue)",   bg: "var(--blue-bg)",   label: "Kelembaban",      unit: "%",    conditions: [{ key: "gt", label: "Lebih dari (>)", defaultVal: 75 }, { key: "lt", label: "Kurang dari (<)", defaultVal: 35 }, { key: "range", label: "Di luar rentang" }], templates: [{ name: "💧 Lembab > 75% → AC Dry", condition: "gt", threshold: 75, action: "on", targetIcon: "fa-snowflake" }, { name: "💧 Lembab > 80% → Kipas ON", condition: "gt", threshold: 80, action: "on", targetIcon: "fa-wind" }] },
  brightness:  { icon: "fa-sun",                  color: "var(--amber)",  bg: "var(--amber-bg)",  label: "Kecerahan",       unit: "",     conditions: [{ key: "lt", label: "Gelap (<)", defaultVal: 0.35 }, { key: "gt", label: "Terang (>)", defaultVal: 0.65 }], templates: [{ name: "🌙 Gelap → Lampu ON", condition: "lt", threshold: 0.35, action: "on", targetIcon: "fa-lightbulb" }, { name: "☀️ Terang → Lampu OFF", condition: "gt", threshold: 0.65, action: "off", targetIcon: "fa-lightbulb" }] },
  presence:    { icon: "fa-user-check",            color: "var(--green)",  bg: "var(--green-bg)",  label: "Kehadiran",       unit: "",     conditions: [{ key: "detected", label: "Terdeteksi" }, { key: "absent", label: "Tidak Ada" }], templates: [{ name: "👤 Ada Orang → Lampu ON", condition: "detected", action: "on", targetIcon: "fa-lightbulb" }, { name: "👤 Tidak Ada → Semua OFF", condition: "absent", action: "off", targetIcon: "fa-lightbulb" }] },
  motion:      { icon: "fa-person-running",        color: "var(--purple)", bg: "var(--purple-bg)", label: "Gerakan",         unit: "",     conditions: [{ key: "detected", label: "Ada Gerakan" }, { key: "absent", label: "Tidak Ada Gerakan" }], templates: [{ name: "🏃 Gerakan → Lampu ON", condition: "detected", action: "on", targetIcon: "fa-lightbulb" }, { name: "🏃 Tidak Ada → Lampu OFF", condition: "absent", action: "off", targetIcon: "fa-lightbulb" }] },
  air_quality: { icon: "fa-wind",                  color: "var(--teal)",   bg: "var(--teal-bg)",   label: "Kualitas Udara",  unit: "AQI",  conditions: [{ key: "gt", label: "Lebih dari (>)", defaultVal: 150 }, { key: "lt", label: "Kurang dari (<)", defaultVal: 50 }], templates: [{ name: "💨 Buruk >150 → Kipas ON", condition: "gt", threshold: 150, action: "on", targetIcon: "fa-wind" }, { name: "💨 Bahaya >200 → Alarm ON", condition: "gt", threshold: 200, action: "on", targetIcon: "fa-volume-up" }] },
  smoke:       { icon: "fa-fire",                  color: "var(--red)",    bg: "var(--red-bg)",    label: "Asap",            unit: "ppm",  conditions: [{ key: "gt", label: "Terdeteksi (>)", defaultVal: 50 }], templates: [{ name: "🔥 Asap > 50ppm → Alarm ON", condition: "gt", threshold: 50, action: "on", targetIcon: "fa-volume-up" }] },
  gas:         { icon: "fa-triangle-exclamation",  color: "var(--amber)",  bg: "var(--amber-bg)",  label: "Gas",             unit: "ppm",  conditions: [{ key: "gt", label: "Terdeteksi (>)", defaultVal: 200 }], templates: [{ name: "⚠️ Gas > 200ppm → Alarm ON", condition: "gt", threshold: 200, action: "on", targetIcon: "fa-volume-up" }] },
};

async function initAutomationRules() {
  if (!STATE.automationRules) STATE.automationRules = {};
  const result = await apiPost("get_automation_rules", {});
  if (result && typeof result === "object") {
    STATE.automationRules = result;
  }
}

async function addAutomationRule(sensorId, rule) {
  const sid = sensorId ? parseInt(sensorId) : null;
  const result = await apiPost("add_automation_rule", {
    sensor_id:     sid,
    device_id:     parseInt(rule.deviceId),
    condition:     rule.condition,
    threshold:     rule.threshold,
    threshold_min: rule.thresholdMin,
    threshold_max: rule.thresholdMax,
    action:        rule.action,
    delay:         rule.delay || 0,
    start_time:    rule.startTime || null,
    end_time:      rule.endTime || null,
    from_template: rule.fromTemplate || null,
  });
  if (result?.success) {
    const key = sensorId ? String(sensorId) : ('device_' + rule.deviceId);
    if (!STATE.automationRules[key]) STATE.automationRules[key] = [];
    STATE.automationRules[key].push({
      ...rule,
      ruleId:    result.rule_id,
      dbId:      result.id,
      enabled:   true,
      lastFired: null,
    });
    if (typeof renderAutomationView === 'function') renderAutomationView();
    showToast("Aturan ditambahkan!", "success");
  } else {
    showToast("Gagal menambah aturan", "error");
  }
}

async function removeAutomationRule(sensorId, ruleId) {
  const id   = String(sensorId);
  const rule = (STATE.automationRules[id] || []).find((r) => r.ruleId === ruleId);
  if (!rule?.dbId) return;
  const result = await apiPost("delete_automation_rule", { id: rule.dbId });
  if (result?.success) {
    STATE.automationRules[id] = (STATE.automationRules[id] || []).filter((r) => r.ruleId !== ruleId);
    if (!STATE.automationRules[id].length) delete STATE.automationRules[id];
    if (typeof renderAutomationView === 'function') renderAutomationView();
    showToast("Aturan dihapus", "info");
  }
}

async function toggleAutomationRule(sensorId, ruleId, enabled) {
  const id   = String(sensorId);
  const rule = (STATE.automationRules[id] || []).find((r) => r.ruleId === ruleId);
  if (!rule?.dbId) return;
  await apiPost("update_automation_rule", { id: rule.dbId, is_enabled: enabled ? 1 : 0 });
  rule.enabled = enabled;
}

function applyAutomationTemplate(sensorId, tpl) {
  const matchDev = Object.entries(STATE.devices).find(([, d]) => d.icon === tpl.targetIcon);
  if (!matchDev) { showToast("Tidak ada perangkat yang cocok untuk template ini", "warning"); return; }
  const rule = {
    condition:    tpl.condition,
    threshold:    tpl.threshold,
    thresholdMin: tpl.thresholdMin,
    thresholdMax: tpl.thresholdMax,
    deviceId:     matchDev[0],
    action:       tpl.action,
    delay:        0,
    fromTemplate: tpl.name,
  };
  addAutomationRule(sensorId, rule);
}

function renderAutomationView() {
  const grid   = document.getElementById("automationGrid");
  const empty  = document.getElementById("emptyAutomation");
  if (!grid) return;
  grid.innerHTML = "";
  const sensorKeys = Object.keys(STATE.sensors);
  const deviceKeys = Object.keys(STATE.devices);
  
  if (!sensorKeys.length && !deviceKeys.length) { 
    if (empty) empty.classList.remove("hidden"); return; 
  }
  if (empty) empty.classList.add("hidden");

  sensorKeys.forEach((sensorId) => {
    const sensor   = STATE.sensors[sensorId];
    const meta     = SENSOR_AUTO_META[sensor.type] || SENSOR_AUTO_META.temperature;
    const rules    = STATE.automationRules[String(sensorId)] || [];
    const curVal   = STATE.sensorData[sensorId];
    const valBadge = curVal !== null && curVal !== undefined
      ? `<span class="auto-val-badge">${parseFloat(curVal).toFixed(1)}${sensor.unit || meta.unit}</span>`
      : `<span style="font-size:11px;color:var(--ink-4)">Menunggu data…</span>`;
    
    const availTemplates = (meta.templates || []).filter((t) =>
      Object.values(STATE.devices).some((d) => d.icon === t.targetIcon));
    
    const card = document.createElement("div");
    card.className = "auto-card";
    card.innerHTML = `
      <div class="auto-card-head">
        <div class="auto-card-head-l">
          <div class="auto-icon" style="background:${meta.bg};color:${meta.color}"><i class="fas ${meta.icon}"></i></div>
          <div><div class="auto-card-title">${escHtml(sensor.name)}</div><div class="auto-card-sub">${meta.label} · ${valBadge}</div></div>
        </div>
      </div>
      <div class="auto-card-body">
        ${availTemplates.length
          ? `<div><div class="auto-templates-label">Template Cepat</div>
             <div class="template-chips">${availTemplates.map((t) =>
                `<button class="template-chip" onclick="applyAutomationTemplate('${sensorId}', ${JSON.stringify(t).split('"').join("&quot;")})" title="${t.name}">${t.name}</button>`
             ).join("")}</div></div>`
          : ""
        }
        <div>
          <div class="auto-section-label">Aturan Aktif</div>
          <div id="rules-list-${sensorId}" class="rules-stack">
            ${rules.length === 0
              ? '<div class="rules-empty">Belum ada aturan sensor.</div>'
              : rules.map((r) => buildRuleRowHTML(sensorId, r, sensor, meta)).join("")
            }
          </div>
        </div>
        <button onclick="openAddRuleModal('${sensorId}')" class="btn-ghost full" style="margin-top:8px">
          <i class="fas fa-plus"></i> Tambah Aturan Sensor
        </button>
      </div>`;
    grid.appendChild(card);
  });

  deviceKeys.forEach((deviceId) => {
    const device = STATE.devices[deviceId];
    const key    = 'device_' + deviceId;
    const rules  = STATE.automationRules[key] || [];
    
    const card = document.createElement("div");
    card.className = "auto-card device-auto-card";
    card.innerHTML = `
      <div class="auto-card-head">
        <div class="auto-card-head-l">
          <div class="auto-icon" style="background:var(--surface-3);color:var(--ink-2)"><i class="fas ${device.icon || 'fa-plug'}"></i></div>
          <div><div class="auto-card-title">${escHtml(device.name)}</div><div class="auto-card-sub">Setup Operasional Perangkat</div></div>
        </div>
      </div>
      <div class="auto-card-body">
        <div>
          <div class="auto-section-label">Jadwal Operasional / Manual</div>
          <div id="rules-list-${key}" class="rules-stack">
            ${rules.length === 0
              ? '<div class="rules-empty">Belum ada jadwal operasional manual.</div>'
              : rules.map((r) => buildRuleRowHTML(null, r)).join("")
            }
          </div>
        </div>
        <button onclick="openAddRuleModal(null, '${deviceId}')" class="btn-ghost full" style="margin-top:8px">
          <i class="fas fa-clock"></i> Tambah Jadwal Manual
        </button>
      </div>`;
    grid.appendChild(card);
  });
}

function buildRuleRowHTML(sensorId, rule, sensor = null, meta = null) {
  const device    = STATE.devices[String(rule.deviceId)];
  const devName   = device ? escHtml(device.name) : `<span class="text-danger"><i class="fas fa-exclamation-triangle"></i> Perangkat Terhapus</span>`;
  const condLabel = getConditionLabel(rule, sensor, meta);
  
  let actionBadge = "";
  switch (rule.action) {
    case "on":         actionBadge = `<span class="rule-badge-on">NYALAKAN</span>`;          break;
    case "off":        actionBadge = `<span class="rule-badge-off">MATIKAN</span>`;          break;
    case "speed_high": actionBadge = `<span class="rule-badge-speed">💨 MAX (75%)</span>`;   break;
    case "speed_mid":  actionBadge = `<span class="rule-badge-speed">🌬️ MEDIUM (50%)</span>`; break;
    case "speed_low":  actionBadge = `<span class="rule-badge-speed">🌬️ LOW (25%)</span>`;  break;
    default:           actionBadge = `<span class="rule-badge-on">${rule.action.toUpperCase()}</span>`;
  }

  const timeLabel = (rule.startTime && rule.endTime) 
    ? `<div class="rule-time-window"><i class="fas fa-clock"></i> ${rule.startTime.substring(0,5)} – ${rule.endTime.substring(0,5)}</div>` 
    : "";
  
  const devIcon = device ? `<i class="fas ${device.icon || "fa-plug"}" style="font-size:10px;opacity:0.6"></i>` : "";
  const fromTpl = rule.fromTemplate
    ? `<div class="rule-tpl-badge"><i class="fas fa-magic"></i> Template: ${escHtml(rule.fromTemplate)}</div>`
    : "";
  
  const sid = sensorId ? String(sensorId) : ('device_' + rule.deviceId);
  return `<div class="rule-row" id="rule-row-${rule.ruleId}">
    <label class="toggle-wrapper" style="flex-shrink:0">
      <input type="checkbox" class="toggle-input" ${rule.enabled ? "checked" : ""}
        onchange="toggleAutomationRule('${sid}','${rule.ruleId}',this.checked)">
      <span class="toggle-track"></span>
    </label>
    <div style="flex:1;min-width:0;font-size:11px">
      <div style="font-weight:600;color:var(--ink);display:flex;align-items:center;gap:5px;flex-wrap:wrap">
        <span style="color:var(--ink-3)">${condLabel}</span>
        <span>→</span>${actionBadge} ${devIcon}<span>${devName}</span>
      </div>
      ${fromTpl}
      ${timeLabel}
      ${rule.delay > 0 ? `<div style="font-size:10px;color:var(--ink-4)">Delay: ${rule.delay}ms</div>` : ""}
    </div>
    <button onclick="removeAutomationRule('${sid}','${rule.ruleId}')" class="trash-btn" title="Hapus">
      <i class="fas fa-trash"></i>
    </button>
  </div>`;
}

function getConditionLabel(rule, sensor, meta) {
  if (rule.condition === "time_only") return "Terjadwal";
  if (!sensor || !meta) return "Trigger";
  const u = sensor.unit || meta.unit || "";
  switch (rule.condition) {
    case "gt":       return `> ${rule.threshold}${u}`;
    case "lt":       return `< ${rule.threshold}${u}`;
    case "range":    return `di luar ${rule.thresholdMin}–${rule.thresholdMax}${u}`;
    case "detected": return "terdeteksi";
    case "absent":   return "tidak ada";
    default:         return rule.condition;
  }
}

let _addRuleSensorId = null;
let _addRuleDeviceId = null;

function openAddRuleModal(sensorId, deviceId = null) {
  _addRuleSensorId = sensorId ? String(sensorId) : null;
  _addRuleDeviceId = deviceId ? String(deviceId) : null;
  const modal = document.getElementById("addRuleModal");
  if (!modal) return;
  const sensorRow = document.querySelector('.field-group[style*="background:var(--surface-2)"]');
  const condSel   = document.getElementById("addRuleCondition");
  const devSel    = document.getElementById("addRuleDevice");
  document.getElementById("addRuleThreshold").value = "";
  document.getElementById("addRuleThresholdMin").value = "";
  document.getElementById("addRuleThresholdMax").value = "";
  document.getElementById("addRuleStartTime").value = "";
  document.getElementById("addRuleEndTime").value = "";
  if (_addRuleSensorId) {
    if (sensorRow) sensorRow.style.display = "flex";
    const sensor = STATE.sensors[_addRuleSensorId];
    const meta   = SENSOR_AUTO_META[sensor.type] || SENSOR_AUTO_META.temperature;
    if (document.getElementById("addRuleSensorLabel")) document.getElementById("addRuleSensorLabel").textContent = sensor.name;
    const iconEl = document.getElementById("addRuleSensorIcon");
    if (iconEl) {
      iconEl.innerHTML = `<i class="fas ${meta.icon}"></i>`;
      iconEl.style.cssText = `background:${meta.bg};color:${meta.color};width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0`;
    }
    if (condSel) {
        condSel.innerHTML = meta.conditions.map((c) => `<option value="${c.key}">${c.label}</option>`).join("");
        condSel.onchange = () => updateRuleConditionUI(condSel.value, meta);
    }
    const devKeys = Object.keys(STATE.devices);
    if (devSel) devSel.innerHTML = devKeys.length
      ? devKeys.map((id) => `<option value="${id}">${escHtml(STATE.devices[id].name)}</option>`).join("")
      : "<option disabled>Belum ada perangkat</option>";
    if (condSel) updateRuleConditionUI(condSel.value, meta);
  } else {
    if (sensorRow) sensorRow.style.display = "none";
    if (condSel) condSel.innerHTML = `<option value="time_only">Berdasarkan Waktu Saja</option>`;
    if (devSel) {
        const devKeys = Object.keys(STATE.devices);
        devSel.innerHTML = devKeys.map((id) => `<option value="${id}" ${_addRuleDeviceId === id ? 'selected' : ''}>${escHtml(STATE.devices[id].name)}</option>`).join("");
    }
    updateRuleConditionUI("time_only", null);
  }
  if (devSel) {
      devSel.onchange = () => updateRuleActionOptions(devSel.value);
      updateRuleActionOptions(devSel.value);
  }
  if (document.getElementById("addRuleDelay")) document.getElementById("addRuleDelay").value = 0;
  modal.classList.add("active");
}

function updateRuleActionOptions(deviceId) {
  const device = STATE.devices[String(deviceId)];
  const dtype  = typeof getDeviceType === 'function' ? getDeviceType(device?.icon) : 'plug';
  const sel    = document.getElementById("addRuleAction");
  if (!sel) return;
  let opts = [{ v: "on", l: "⚡ Nyalakan (ON)" }, { v: "off", l: "✕ Matikan (OFF)" }];
  if (dtype === "fan") opts = [...opts,
    { v: "speed_high", l: "💨 Kipas Cepat (75%)" },
    { v: "speed_mid",  l: "🌬️ Kipas Sedang (50%)" },
    { v: "speed_low",  l: "🌬️ Kipas Lambat (25%)" },
  ];
  sel.innerHTML = opts.map((o) => `<option value="${o.v}">${o.l}</option>`).join("");
}

function updateRuleConditionUI(cond, meta) {
  const tRow = document.getElementById("addRuleThresholdRow");
  const rRow = document.getElementById("addRuleRangeRow");
  if (!tRow || !rRow) return;
  if (cond === "range") {
    tRow.style.display = "none"; rRow.style.display = "";
  } else if (cond === "detected" || cond === "absent" || cond === "time_only") {
    tRow.style.display = "none"; rRow.style.display = "none";
  } else {
    tRow.style.display = ""; rRow.style.display = "none";
    if (meta) {
      const c = meta.conditions.find((x) => x.key === cond);
      if (c && c.defaultVal != null) document.getElementById("addRuleThreshold").value = c.defaultVal;
      const sensor = _addRuleSensorId ? STATE.sensors[_addRuleSensorId] : null;
      if (document.getElementById("addRuleUnit")) document.getElementById("addRuleUnit").textContent = sensor?.unit || meta.unit || "";
    }
  }
}

function closeAddRuleModal() { document.getElementById("addRuleModal")?.classList.remove("active"); _addRuleSensorId = null; }

function saveNewAutomationRule() {
  const cond       = document.getElementById("addRuleCondition").value;
  const deviceId   = document.getElementById("addRuleDevice").value;
  const action     = document.getElementById("addRuleAction").value;
  const delay      = parseInt(document.getElementById("addRuleDelay").value) || 0;
  const startTime  = document.getElementById("addRuleStartTime").value;
  const endTime    = document.getElementById("addRuleEndTime").value;
  if (!deviceId || !STATE.devices[String(deviceId)]) { 
    showToast("Pilih perangkat!", "warning"); return; 
  }
  const rule = { 
    condition: cond, 
    deviceId: String(deviceId), 
    action, 
    delay,
    startTime: startTime || null,
    endTime:   endTime   || null
  };
  if (cond === "range") {
    rule.thresholdMin = parseFloat(document.getElementById("addRuleThresholdMin").value);
    rule.thresholdMax = parseFloat(document.getElementById("addRuleThresholdMax").value);
    if (isNaN(rule.thresholdMin) || isNaN(rule.thresholdMax)) { showToast("Isi rentang nilai!", "warning"); return; }
  } else if (cond !== "detected" && cond !== "absent" && cond !== "time_only") {
    rule.threshold = parseFloat(document.getElementById("addRuleThreshold").value);
    if (isNaN(rule.threshold)) { showToast("Isi nilai threshold!", "warning"); return; }
  }
  if (cond === "time_only" && (!startTime || !endTime)) {
    showToast("Isi jam operasional!", "warning"); return;
  }
  addAutomationRule(_addRuleSensorId, rule);
  closeAddRuleModal();
}
