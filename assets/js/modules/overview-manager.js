const Overview = {
  init() {
    this.startClock();
    this.updateSummary();
    this.initChartSelect();
    setInterval(() => this.updateSummary(), 10000);
  },
  startClock() {
    const el = document.getElementById('ovClock');
    if (!el) return;
    const upd = () => {
      const now = new Date();
      el.textContent = now.toLocaleTimeString('id-ID', { hour12: false });
    };
    upd();
    setInterval(upd, 1000);
  },
  updateSummary() {
    const el = document.getElementById('ovStatusSummary');
    if (!el) return;
    const activeDevs = Object.values(STATE.deviceStates || {}).filter(Boolean).length;
    const totalDevs  = Object.keys(STATE.devices || {}).length;
    let html = '';
    if (activeDevs === 0) {
      html = `<p><i class="fas fa-info-circle" style="color:var(--blue)"></i> Semua perangkat dalam kondisi <b>Standby</b>. Tidak ada konsumsi daya berlebih.</p>`;
    } else {
      html = `<p><i class="fas fa-bolt" style="color:var(--amber)"></i> Ada <b>${activeDevs} perangkat</b> sedang menyala. Sistem memantau penggunaan energi secara real-time.</p>`;
    }
    const tempSensor = Object.values(STATE.sensors || {}).find(s => s.type === 'temperature');
    if (tempSensor && STATE.sensorData[tempSensor.id]) {
      const val = parseFloat(STATE.sensorData[tempSensor.id]);
      html += `<p><i class="fas fa-thermometer-half" style="color:var(--red)"></i> Suhu ruangan saat ini <b>${val}°C</b>. Kondisi cukup ${val > 28 ? 'hangat' : 'nyaman'}.</p>`;
    }
    el.innerHTML = html;
  },
  initChartSelect() {
    const sel = document.getElementById('ovChartSensorSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="all">Semua Sensor</option>';
    Object.values(STATE.sensors || {}).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      sel.appendChild(opt);
    });
  }
};
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('dashboard')) Overview.init();
});
window.Overview = Overview;
