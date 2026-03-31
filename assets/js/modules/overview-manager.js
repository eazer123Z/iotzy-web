const Overview = {
  init() {
    this.refreshClock();
    this.initChartSelect();
    this.updateDashboardRoomSummary();
  },
  refreshClock() {
    const el = document.getElementById('ovClock');
    if (!el) return;
    const upd = () => {
      const now = new Date();
      el.textContent = now.toLocaleTimeString('id-ID', { hour12: false });
    };
    upd();
  },
  initChartSelect() {
    const sel = document.getElementById('ovChartSensorSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="all">Semua Sensor</option>';
    if (window.STATE && window.STATE.sensors) {
      Object.values(window.STATE.sensors).forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        sel.appendChild(opt);
      });
    }
  },
  updateDashboardRoomSummary() {
    const container = document.getElementById('ovStatusSummary');
    if (!container) return;
    
    const cv = window.STATE?.cv || {};
    const condMap = { dark: "Gelap", normal: "Normal", bright: "Terang" };
    const condColor = { dark: "var(--accent)", normal: "var(--success)", bright: "var(--warning)" };

    let html = `
      <div class="summary-item" style="display:flex; gap:12px; margin-bottom:12px; align-items:center">
        <div class="s-icon" style="color:var(--primary); font-size:1.2rem; width:30px; text-align:center"><i class="fas fa-users"></i></div>
        <div class="s-info">
          <div class="s-label" style="font-size:0.75rem; color:var(--text-muted)">Kehadiran Orang</div>
          <div class="s-val" style="font-size:0.9rem; font-weight:600">
            ${cv.personCount > 0 ? `<span style="color:var(--success)">Terdeteksi (${cv.personCount})</span>` : 'Tidak Terdeteksi'}
          </div>
        </div>
      </div>
      <div class="summary-item" style="display:flex; gap:12px; align-items:center">
        <div class="s-icon" style="color:${condColor[cv.lightCondition] || 'var(--text-muted)'}; font-size:1.2rem; width:30px; text-align:center"><i class="fas fa-lightbulb"></i></div>
        <div class="s-info">
          <div class="s-label" style="font-size:0.75rem; color:var(--text-muted)">Kondisi Cahaya</div>
          <div class="s-val" style="font-size:0.9rem; font-weight:600">
            ${condMap[cv.lightCondition] || 'Memindai...'} (${Math.round((cv.brightness || 0) * 100)}%)
          </div>
        </div>
      </div>
    `;
    
    container.innerHTML = html;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('dashboard')) {
    Overview.init();
  }
});

window.Overview = Overview;
