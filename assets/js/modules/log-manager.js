const LOG_CHARTS = {
  timeline: null,
  devices: null,
};
const LOG_PERSIST_QUEUE = [];
const LOG_RECENT_PERSIST = new Map();
const LOG_PERSIST_INTERVAL_MS = 700;
const LOG_PERSIST_DEDUPE_MS = 4000;
const LOG_PERSIST_MAX_QUEUE = 80;
let logPersistTimer = null;
let logPersistBusy = false;
let logPersistBlockedUntil = 0;

function buildLogPersistPayload(device, activity, trigger, extra = {}) {
  return {
    device: device || "System",
    activity,
    trigger,
    device_id: extra.device_id ?? null,
    sensor_id: extra.sensor_id ?? null,
    metadata: extra.metadata ?? null,
  };
}

function buildLogPersistKey(payload) {
  return [
    String(payload.device || "").trim().toLowerCase(),
    String(payload.activity || "").trim().toLowerCase(),
    String(payload.trigger || "").trim().toLowerCase(),
    String(payload.device_id ?? ""),
    String(payload.sensor_id ?? ""),
  ].join("|");
}

function pruneRecentPersistLogKeys(now = Date.now()) {
  const ttl = LOG_PERSIST_DEDUPE_MS * 6;
  LOG_RECENT_PERSIST.forEach((ts, key) => {
    if ((now - ts) > ttl) {
      LOG_RECENT_PERSIST.delete(key);
    }
  });
}

function scheduleLogPersist(delay = LOG_PERSIST_INTERVAL_MS) {
  if (logPersistBusy || logPersistTimer || !LOG_PERSIST_QUEUE.length) return;
  const wait = Math.max(delay, logPersistBlockedUntil - Date.now(), 0);
  logPersistTimer = setTimeout(() => {
    flushQueuedLogPersist().catch(() => {});
  }, wait);
}

async function flushQueuedLogPersist() {
  if (logPersistBusy) return;
  if (logPersistTimer) {
    clearTimeout(logPersistTimer);
    logPersistTimer = null;
  }

  const nextPayload = LOG_PERSIST_QUEUE.shift();
  if (!nextPayload) return;

  logPersistBusy = true;
  try {
    const result = await apiPost("add_log", nextPayload, {
      key: null,
      refresh: false,
      timeout: 6000,
      silentError: true,
    });

    if (result?.success === false && String(result.error || "").includes("429")) {
      logPersistBlockedUntil = Date.now() + 5000;
      LOG_PERSIST_QUEUE.unshift(nextPayload);
    } else {
      logPersistBlockedUntil = 0;
    }
  } finally {
    logPersistBusy = false;
    if (LOG_PERSIST_QUEUE.length) {
      scheduleLogPersist();
    }
  }
}

function enqueueLogPersist(payload) {
  const now = Date.now();
  pruneRecentPersistLogKeys(now);

  const key = buildLogPersistKey(payload);
  const lastPersistAt = LOG_RECENT_PERSIST.get(key) || 0;
  if ((now - lastPersistAt) < LOG_PERSIST_DEDUPE_MS) {
    return;
  }

  LOG_RECENT_PERSIST.set(key, now);
  if (LOG_PERSIST_QUEUE.length >= LOG_PERSIST_MAX_QUEUE) {
    LOG_PERSIST_QUEUE.shift();
  }
  LOG_PERSIST_QUEUE.push(payload);
  scheduleLogPersist();
}

function getAnalyticsDate() {
  return STATE.analyticsDate || new Date().toISOString().slice(0, 10);
}

function normalizeLogRecord(row) {
  const createdAt = row.created_at || `${row.tanggal || ''} ${row.waktu || ''}`;
  const ts = createdAt ? new Date(createdAt).getTime() : Date.now();
  return {
    id: row.id || ts,
    created_at: row.created_at || null,
    tanggal: row.tanggal || new Date(ts).toLocaleDateString("id-ID"),
    waktu: row.waktu || new Date(ts).toLocaleTimeString("id-ID"),
    device: row.device || row.device_name || "System",
    activity: row.activity || "",
    trigger: row.trigger || row.trigger_type || "System",
    device_id: row.device_id ?? null,
    sensor_id: row.sensor_id ?? null,
    sensor_name: row.sensor_name || null,
    metadata: row.metadata || null,
    ts,
  };
}

function isUserFacingLog(log) {
  const deviceName = String(log?.device || "").trim().toLowerCase();
  const trigger = String(log?.trigger || "").trim().toLowerCase();
  const hasEntity = Number(log?.device_id || 0) > 0 || Number(log?.sensor_id || 0) > 0;

  if (hasEntity) return true;
  if (deviceName === "system" || deviceName === "mqtt") return false;
  if (trigger === "system") return false;
  return String(log?.activity || "").trim() !== "";
}

async function loadLogs(date = getAnalyticsDate()) {
  STATE.analyticsDate = date;
  const dateInput = document.getElementById("logSummaryDate");
  if (dateInput && dateInput.value !== date) {
    dateInput.value = date;
  }

  const cacheKey = `iotzy_cache_logs_${date}`;
  const cacheKeySummary = `iotzy_cache_summary_${date}`;

  // 1. Tampilkan dari Cache dulu (Instant)
  const cachedLogs = typeof PerformanceOptimizer !== "undefined" ? PerformanceOptimizer.Cache.get(cacheKey) : null;
  const cachedSummary = typeof PerformanceOptimizer !== "undefined" ? PerformanceOptimizer.Cache.get(cacheKeySummary) : null;

  if (cachedLogs) {
    STATE.logs = cachedLogs.map(normalizeLogRecord).filter(isUserFacingLog);
    updateLogDisplay();
    updateDashboardActivityFeed();
  }

  if (cachedSummary) {
    STATE.analytics = cachedSummary;
    renderAnalyticsSummary();
    renderAnalyticsCharts();
    renderAnalyticsDevices();
    renderAnalyticsPower();
  }

  // 2. Fetch Fresh Data in Background (SWR)
  try {
    const [logsResult, summaryResult] = await Promise.all([
      apiPost("get_logs", { date, limit: 500 }),
      apiPost("get_logs_daily_summary", { date }),
    ]);

    if (Array.isArray(logsResult)) {
      STATE.logs = logsResult.map(normalizeLogRecord).filter(isUserFacingLog);
      if (typeof PerformanceOptimizer !== "undefined") {
        PerformanceOptimizer.Cache.set(cacheKey, logsResult);
      }
    }

    if (summaryResult?.success && summaryResult.data) {
      STATE.analytics = summaryResult.data;
      if (typeof PerformanceOptimizer !== "undefined") {
        PerformanceOptimizer.Cache.set(cacheKeySummary, summaryResult.data);
      }
    }

    updateLogDisplay();
    updateDashboardActivityFeed();
    updateLogStats();
    renderAnalyticsSummary();
    renderAnalyticsCharts();
    renderAnalyticsDevices();
    renderAnalyticsPower();
  } catch (e) {
    console.error("Load Fresh Logs Error:", e);
  }
}

async function addLog(device, activity, trigger, _type = "info", extra = {}) {
  const now = new Date();
  const log = normalizeLogRecord({
    created_at: now.toISOString(),
    device,
    activity,
    trigger,
    ...extra,
  });
  if (isUserFacingLog(log)) {
    STATE.logs.unshift(log);
    if (STATE.logs.length > (CONFIG.app.maxLogs || 500)) {
      STATE.logs.length = CONFIG.app.maxLogs || 500;
    }
  }
  updateLogDisplay();
  updateDashboardActivityFeed();
  updateLogStats();

  enqueueLogPersist(buildLogPersistPayload(device, activity, trigger, extra));
}

function filterLogSearch(value) {
  STATE.logSearchFilter = String(value || "").trim().toLowerCase();
  updateLogDisplay();
}

function getVisibleLogs() {
  return (STATE.logs || []).filter(isUserFacingLog);
}

function getFilteredLogs() {
  const search = STATE.logSearchFilter || "";
  return getVisibleLogs().filter((log) => {
    if (!search) {
      return true;
    }
    const haystack = `${log.device} ${log.activity} ${log.sensor_name || ""}`.toLowerCase();
    return haystack.includes(search);
  });
}

function updateLogDisplay() {
  const container = document.getElementById("logsContainer");
  if (!container) return;

  const filtered = getFilteredLogs();
  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-logs">Tidak ada riwayat untuk filter ini.</div>`;
    return;
  }

  const maxRows = CONFIG?.app?.maxRenderedLogs || 180;
  const renderedRows = filtered.slice(0, maxRows);
  let html = '<table class="log-table"><thead><tr><th>Waktu</th><th>Perangkat</th><th>Aktivitas</th></tr></thead><tbody>';
  renderedRows.forEach((log) => {
    html += `<tr>
      <td class="log-time">${escHtml(log.waktu)}</td>
      <td class="log-dev">${escHtml(log.device)}</td>
      <td class="log-act">${escHtml(log.activity)}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  if (filtered.length > renderedRows.length) {
    html += `<div class="muted" style="padding:10px 4px 0; font-size:12px">
      Menampilkan ${renderedRows.length} dari ${filtered.length} log terbaru agar halaman tetap ringan.
    </div>`;
  }
  container.innerHTML = html;
}

function renderAnalyticsSummary() {
  const summary = STATE.analytics?.summary;
  if (!summary) return;

  const dateLabel = document.getElementById("analyticsDateLabel");
  if (dateLabel) dateLabel.textContent = STATE.analytics?.date || getAnalyticsDate();

  const g = (id) => document.getElementById(id);
  if (g("logStatTotal")) g("logStatTotal").textContent = summary.total_logs ?? 0;
  if (g("analyticsActiveDevices")) g("analyticsActiveDevices").textContent = summary.devices_active_today ?? 0;
  if (g("analyticsIdleDevices")) g("analyticsIdleDevices").textContent = `Idle: ${summary.devices_idle_today ?? 0}`;
  if (g("analyticsTotalDuration")) g("analyticsTotalDuration").textContent = summary.total_duration_human || "0d";
  if (g("analyticsOnOffEvents")) g("analyticsOnOffEvents").textContent = `ON: ${summary.device_on_events ?? 0} / OFF: ${summary.device_off_events ?? 0}`;
  if (g("analyticsTotalEnergy")) g("analyticsTotalEnergy").textContent = `${summary.total_energy_kwh ?? 0} kWh`;
  if (g("analyticsCurrentPower")) g("analyticsCurrentPower").textContent = `Power sekarang: ${summary.current_power_watts ?? 0} W`;
}

function destroyChart(instanceKey) {
  if (LOG_CHARTS[instanceKey]) {
    LOG_CHARTS[instanceKey].destroy();
    LOG_CHARTS[instanceKey] = null;
  }
}

function renderAnalyticsCharts() {
  if (typeof Chart === "undefined" || !STATE.analytics) return;

  const timelineCanvas = document.getElementById("analyticsTimelineChart");
  const deviceCanvas = document.getElementById("analyticsDeviceChart");
  if (!timelineCanvas || !deviceCanvas) return;

  const timeline = STATE.analytics.timeline || [];
  const timelineLabels = Array.from({ length: 24 }, (_, hour) => `${hour}:00`);
  if (LOG_CHARTS.timeline) {
    LOG_CHARTS.timeline.data.labels = timelineLabels;
    LOG_CHARTS.timeline.data.datasets[0].data = timeline;
    LOG_CHARTS.timeline.update("none");
  } else {
    LOG_CHARTS.timeline = new Chart(timelineCanvas.getContext("2d"), {
      type: "line",
      data: {
        labels: timelineLabels,
        datasets: [{
          label: "Aktivitas",
          data: timeline,
          borderColor: "#38bdf8",
          backgroundColor: "rgba(56,189,248,0.18)",
          borderWidth: 2,
          fill: true,
          tension: 0.32,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#94a3b8", maxTicksLimit: 8 }, grid: { color: "rgba(148,163,184,0.08)" } },
          y: { ticks: { color: "#94a3b8", precision: 0 }, grid: { color: "rgba(148,163,184,0.08)" } },
        },
      },
    });
  }

  const devices = (STATE.analytics.devices || []).slice(0, 8);
  const deviceLabels = devices.map((device) => device.name);
  const deviceMinutes = devices.map((device) => Math.round((device.active_duration_seconds || 0) / 60));
  if (LOG_CHARTS.devices) {
    LOG_CHARTS.devices.data.labels = deviceLabels;
    LOG_CHARTS.devices.data.datasets[0].data = deviceMinutes;
    LOG_CHARTS.devices.update("none");
  } else {
    LOG_CHARTS.devices = new Chart(deviceCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: deviceLabels,
        datasets: [{
          label: "Menit aktif",
          data: deviceMinutes,
          backgroundColor: ["#22c55e", "#38bdf8", "#f59e0b", "#60a5fa", "#ef4444", "#14b8a6", "#f97316", "#7dd3fc"],
          borderRadius: 10,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#94a3b8" }, grid: { display: false } },
          y: { ticks: { color: "#94a3b8", precision: 0 }, grid: { color: "rgba(148,163,184,0.08)" } },
        },
      },
    });
  }
}

function renderAnalyticsDevices() {
  const container = document.getElementById("analyticsDevicesSummary");
  if (!container) return;

  const devices = STATE.analytics?.devices || [];
  if (!devices.length) {
    container.innerHTML = '<p class="muted">Belum ada data perangkat untuk tanggal ini.</p>';
    return;
  }

  container.innerHTML = devices.map((device) => {
    const sensors = (device.linked_sensors || []).map((sensor) => {
      const value = sensor.latest_value !== null && sensor.latest_value !== undefined
        ? `${sensor.latest_value}${sensor.unit || ""}`
        : "N/A";
      return `<span style="display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:999px; background:rgba(148,163,184,0.08); color:var(--text-secondary); font-size:12px">
        <i class="fas ${escHtml(sensor.icon || "fa-microchip")}"></i>
        ${escHtml(sensor.name)}: ${escHtml(String(value))}
      </span>`;
    }).join("");

    const powerLine = device.latest_power_watts !== null
      ? `<div style="font-size:12px; color:var(--text-muted)">Power: ${device.latest_power_watts} W | Energy: ${device.energy_kwh} kWh</div>`
      : "";

    return `<div class="card" style="padding:16px; border:1px solid var(--border)">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:10px">
        <div>
          <div style="font-size:15px; font-weight:700">${escHtml(device.name)}</div>
          <div style="font-size:12px; color:var(--text-muted)">${escHtml(device.model_label || device.type || "Device")}</div>
        </div>
        <span class="device-status-pill ${device.active_duration_seconds > 0 ? "on" : ""}" style="margin-top:0">
          ${device.active_duration_seconds > 0 ? escHtml(device.state_on_label || "ON") : escHtml(device.state_off_label || "OFF")}
        </span>
      </div>
      <div style="display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:10px; margin-bottom:12px">
        <div><div style="font-size:11px; color:var(--text-muted)">Durasi</div><div style="font-size:13px; font-weight:700">${escHtml(device.active_duration_human || "0d")}</div></div>
        <div><div style="font-size:11px; color:var(--text-muted)">Sesi</div><div style="font-size:13px; font-weight:700">${device.session_count || 0}</div></div>
        <div><div style="font-size:11px; color:var(--text-muted)">Log</div><div style="font-size:13px; font-weight:700">${device.logs_count || 0}</div></div>
      </div>
      ${powerLine}
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:12px">${sensors || '<span class="muted" style="font-size:12px">Belum ada sensor tertaut.</span>'}</div>
    </div>`;
  }).join("");
}

function renderAnalyticsPower() {
  const section = document.getElementById("analyticsPowerSection");
  const total = document.getElementById("analyticsPowerTotal");
  const breakdown = document.getElementById("analyticsPowerBreakdown");
  if (!section || !total || !breakdown) return;

  const devices = (STATE.analytics?.devices || []).filter((device) => {
    return (device.latest_power_watts !== null && device.latest_power_watts !== undefined) || (device.energy_wh || 0) > 0;
  });

  if (!devices.length) {
    section.style.display = "";
    total.textContent = "Belum ada sensor daya terhubung.";
    breakdown.innerHTML = "";
    return;
  }

  const summary = STATE.analytics?.summary || {};
  total.textContent = `Total ${summary.total_energy_kwh || 0} kWh • ${summary.current_power_watts || 0} W • ${summary.power_devices || 0} perangkat terukur`;
  breakdown.innerHTML = devices.map((device) => `
    <div class="card" style="padding:14px">
      <div style="font-size:14px; font-weight:700">${escHtml(device.name)}</div>
      <div style="font-size:12px; color:var(--text-muted); margin-top:4px">${escHtml(device.model_label || device.type || "Device")}</div>
      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-top:12px">
        <div><div style="font-size:11px; color:var(--text-muted)">Now</div><div style="font-size:13px; font-weight:700">${device.latest_power_watts ?? 0} W</div></div>
        <div><div style="font-size:11px; color:var(--text-muted)">Avg</div><div style="font-size:13px; font-weight:700">${device.avg_power_watts ?? 0} W</div></div>
        <div><div style="font-size:11px; color:var(--text-muted)">Peak</div><div style="font-size:13px; font-weight:700">${device.peak_power_watts ?? 0} W</div></div>
      </div>
      <div style="margin-top:10px; font-size:12px; color:var(--text-secondary)">Energi: ${device.energy_kwh || 0} kWh</div>
    </div>
  `).join("");
}

function updateDashboardActivityFeed() {
  const feed = document.getElementById("activityFeedContainer");
  if (!feed) return;

  const visibleLogs = getVisibleLogs();
  if (!visibleLogs.length) {
    feed.innerHTML = '<p class="muted" style="text-align:center;font-size:.85rem">Belum ada aktivitas tercatat.</p>';
    return;
  }

  const recentLogs = visibleLogs.slice(0, 5);
  const iconMap = {
    Manual: "fa-hand-pointer",
    Automation: "fa-robot",
    Sensor: "fa-temperature-half",
    AI: "fa-comment-dots",
    System: "fa-microchip",
    CV: "fa-eye",
    MQTT: "fa-satellite-dish",
  };

  const colorMap = {
    Manual: "var(--accent)",
    Automation: "var(--purple)",
    Sensor: "var(--info)",
    AI: "var(--success)",
    System: "var(--text-muted)",
    CV: "var(--warning)",
    MQTT: "var(--blue)",
  };

  feed.innerHTML = recentLogs.map((log) => {
    const icon = iconMap[log.trigger] || "fa-bolt";
    const color = colorMap[log.trigger] || "var(--text-secondary)";
    return `
      <div class="activity-item">
        <div class="activity-icon" style="color:${color}">
          <i class="fas ${icon}"></i>
        </div>
        <div class="activity-content">
          <div class="activity-title">${escHtml(log.device)} - ${escHtml(log.activity)}</div>
          <div class="activity-meta">
            <span class="activity-time">${log.waktu}</span> •
            <span class="activity-trigger" style="color:${color}">${escHtml(log.trigger)}</span>
          </div>
        </div>
      </div>`;
  }).join("");
}

function clearAllLogs() {
  if (!confirm("Hapus semua riwayat aktivitas?")) return;
  apiPost("clear_logs").then(async (res) => {
    if (res?.success) {
      // 1. Bersihkan State
      STATE.logs = [];
      STATE.analytics = { ...STATE.analytics, summary: { ...STATE.analytics?.summary, total_logs: 0 }, recent_logs: [] };
      
      // 2. Bersihkan Cache agar tidak muncul lagi saat refresh/pindah menu
      const date = getAnalyticsDate();
      if (typeof PerformanceOptimizer !== "undefined") {
        PerformanceOptimizer.Cache.set(`iotzy_cache_logs_${date}`, []);
        PerformanceOptimizer.Cache.set(`iotzy_cache_summary_${date}`, null);
      }
      
      // 3. Update UI
      updateLogDisplay();
      updateDashboardActivityFeed();
      updateLogStats();
      renderAnalyticsSummary();
      
      showToast("Seluruh log telah dihapus.", "success");
    }
  });
}

function exportLog() {
  if (!STATE.logs.length) {
    showToast("Tidak ada data untuk diekspor", "warning");
    return;
  }

  const rows = getFilteredLogs();
  if (!rows.length) {
    showToast("Tidak ada data yang bisa diekspor", "warning");
    return;
  }

  let csv = "Tanggal,Waktu,Perangkat,Aktivitas\n";
  rows.forEach((log) => {
    csv += `"${log.tanggal}","${log.waktu}","${String(log.device).replace(/"/g, '""')}","${String(log.activity).replace(/"/g, '""')}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.setAttribute("hidden", "");
  a.setAttribute("href", url);
  a.setAttribute("download", `IoTzy_Logs_${getAnalyticsDate()}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function updateLogStats() {
  const summary = STATE.analytics?.summary;
  if (!summary) return;
  const g = (id) => document.getElementById(id);
  if (g("logStatTotal")) g("logStatTotal").textContent = summary.total_logs ?? 0;
}

function initLogManager() {
  if (initLogManager._started) return;
  initLogManager._started = true;
  const dateInput = document.getElementById("logSummaryDate");
  if (dateInput) {
    dateInput.value = getAnalyticsDate();
    dateInput.addEventListener("change", () => loadLogs(dateInput.value || getAnalyticsDate()));
  }
}

window.initLogManager = initLogManager;
