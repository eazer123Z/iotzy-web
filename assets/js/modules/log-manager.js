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
    if (typeof updateDashboardActivityFeed === 'function') updateDashboardActivityFeed();
    if (typeof updateLogStats === 'function') updateLogStats();
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
  if (STATE.logs.length > (CONFIG.app.maxLogs || 500)) STATE.logs.length = (CONFIG.app.maxLogs || 500);
  if (typeof updateLogDisplay === 'function') updateLogDisplay();
  if (typeof updateDashboardActivityFeed === 'function') updateDashboardActivityFeed();
  if (typeof updateLogStats === 'function') updateLogStats();
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
      <td><span class="log-type-badge ${l.type}">${l.trigger}</span></td>
    </tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
  initLogTabs();
});

// Mengekstrak 5 log teratas untuk ditampilkan di Dashboard Utama
function updateDashboardActivityFeed() {
  const feed = document.getElementById("activityFeedContainer");
  if (!feed) return;
  
  if (!STATE.logs || STATE.logs.length === 0) {
    feed.innerHTML = '<p class="muted" style="text-align:center;font-size:.85rem">Belum ada aktivitas tercatat.</p>';
    return;
  }
  
  const recentLogs = STATE.logs.slice(0, 5);
  let html = '';
  
  const iconMap = {
    'Manual': 'fa-hand-pointer',
    'Automation': 'fa-robot',
    'Sensor': 'fa-temperature-half',
    'AI Assistant': 'fa-comment-dots',
    'System': 'fa-microchip'
  };
  
  const colorMap = {
    'Manual': 'var(--accent)',
    'Automation': 'var(--purple)',
    'Sensor': 'var(--info)',
    'AI Assistant': 'var(--success)',
    'System': 'var(--text-muted)'
  };
  
  recentLogs.forEach(log => {
    const icon = iconMap[log.trigger] || 'fa-bolt';
    const color = colorMap[log.trigger] || 'var(--text-secondary)';
    
    html += `
      <div class="activity-item">
        <div class="activity-icon" style="color:${color}">
          <i class="fas ${icon}"></i>
        </div>
        <div class="activity-content">
          <div class="activity-title">${escHtml(log.device)} — ${escHtml(log.activity)}</div>
          <div class="activity-meta">
            <span class="activity-time">${log.waktu}</span> • 
            <span class="activity-trigger" style="color:${color}">${log.trigger}</span>
          </div>
        </div>
      </div>
    `;
  });
  
  if (STATE.logs.length > 5) {
    html += `<button class="ov-link" style="width:100%; text-align:center; margin-top:10px" onclick="switchPage('analytics')">Lihat Semua Aktivitas <i class="fas fa-arrow-right"></i></button>`;
  }
  
  feed.innerHTML = html;
}

function clearAllLogs() {
  if (!confirm("Hapus semua riwayat aktivitas?")) return;
  apiPost("clear_logs").then(res => {
    if (res?.success) {
      STATE.logs = [];
      updateLogDisplay();
      updateDashboardActivityFeed();
      showToast("Seluruh log telah dihapus.", "success");
    }
  });
}

function exportLog() {
  if (STATE.logs.length === 0) { showToast("Tidak ada data untuk diekspor", "warning"); return; }
  let csv = "Waktu,Perangkat,Aktivitas,Trigger,Tipe\n";
  STATE.logs.forEach(l => {
    csv += `${l.waktu},"${l.device}","${l.activity}","${l.trigger}","${l.type}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', `IoTzy_Logs_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function updateLogStats() {
  const g = (id) => document.getElementById(id);
  if (!g("logStatTotal")) return;
  
  const total = STATE.logs.length;
  const success = STATE.logs.filter(l => l.type === 'success' || l.type === 'info').length;
  const warning = STATE.logs.filter(l => l.type === 'warning' || l.type === 'error').length;
  
  g("logStatTotal").textContent   = total;
  g("logStatSuccess").textContent = success;
  g("logStatWarning").textContent = warning;
}
