async function loadLogs() {
  const result = await apiPost("get_logs", {});
  if (result && Array.isArray(result)) {
    STATE.logs = result.map((r) => ({
      tanggal:  r.tanggal    || new Date(r.created_at).toLocaleDateString("id-ID"),
      waktu:    r.waktu      || new Date(r.created_at).toLocaleTimeString("id-ID"),
      device:   r.device_name,
      activity: r.activity,
      trigger:  r.trigger_type,
      type:     r.log_type,
      ts:       new Date(r.created_at).getTime(),
    }));
    if (typeof updateLogDisplay === 'function') updateLogDisplay();
  }
}

async function addLog(device, activity, trigger, type = "info") {
  const now = new Date();
  const log = {
    tanggal:  now.toLocaleDateString("id-ID"),
    waktu:    now.toLocaleTimeString("id-ID"),
    device:   device || "System",
    activity,
    trigger,
    type,
    ts: now.getTime(),
  };
  STATE.logs.unshift(log);
  if (STATE.logs.length > CONFIG.app.maxLogs) STATE.logs.length = CONFIG.app.maxLogs;
  if (typeof updateLogDisplay === 'function') updateLogDisplay();
  apiPost("add_log", { device: device || "System", activity, trigger, type }).catch(() => {});
}

function groupLogs(logs) {
  const groups     = [];
  const SESSION_GAP = 120000;
  logs.forEach((log) => {
    const last = groups.find((g) =>
      g.device === log.device && g.trigger === log.trigger && g.latestTs - log.ts < SESSION_GAP);
    if (last) { last.count++; last.activities.unshift(log); last.earliest = log; }
    else groups.push({
      device:     log.device,
      activity:   log.activity,
      trigger:    log.trigger,
      type:       log.type,
      latestTs:   log.ts,
      tanggal:    log.tanggal,
      waktu:      log.waktu,
      count:      1,
      activities: [log],
      earliest:   log,
    });
  });
  return groups;
}

function initLogTabs() {
  const tabs = document.querySelectorAll('.log-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const type = tab.getAttribute('data-type');
      STATE.logTypeFilter = type; 
      updateLogDisplay();
    });
  });
}

function updateLogDisplay() {
  const container = document.getElementById("logsContainer");
  if (!container) return;
  const tf = STATE.logTypeFilter || "device";
  let filtered = STATE.logs;
  if (tf === "device") filtered = filtered.filter(l => l.trigger !== "Automation" && l.trigger !== "Sensor");
  else if (tf === "sensor") filtered = filtered.filter(l => l.trigger === "Sensor");
  else if (tf === "automation") filtered = filtered.filter(l => l.trigger === "Automation");
  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-logs">Tidak ada riwayat untuk kategori ini.</div>`;
    return;
  }
  let html = '<table class="log-table"><thead><tr><th>Waktu</th><th>Perangkat</th><th>Aktivitas</th><th>Trigger</th></tr></thead><tbody>';
  filtered.forEach(l => {
    html += `<tr>
      <td class="log-time">${l.waktu}</td>
      <td class="log-dev">${escHtml(l.device)}</td>
      <td class="log-act">${escHtml(l.activity)}</td>
      <td><span class="log-badge ${l.type}">${l.trigger}</span></td>
    </tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
  initLogTabs();
});
