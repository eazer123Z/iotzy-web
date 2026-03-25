async function loadSchedules() {
  const container = document.getElementById('scheduleListContainer');
  if (!container) return;
  const res = await apiPost('get_schedules');
  if (res && Array.isArray(res)) {
    if (res.length === 0) {
      container.innerHTML = '<div class="empty-state">Belum ada jadwal.</div>';
      return;
    }
    let html = '';
    res.forEach(s => {
      html += `
        <div class="sch-item card mb-2">
          <div style="display:flex; justify-content:space-between; align-items:center">
            <div>
              <div style="font-weight:700; font-size:14px">${escHtml(s.label)}</div>
              <div style="font-size:12px; color:var(--a); font-weight:600">${s.time_hhmm} - ${s.action.toUpperCase()}</div>
            </div>
            <button onclick="deleteSchedule(${s.id})" class="icon-btn red"><i class="fas fa-trash"></i></button>
          </div>
        </div>`;
    });
    container.innerHTML = html;
  }
}

async function saveSchedule() {
  const label = document.getElementById('schLabel').value;
  const time  = document.getElementById('schTime').value;
  const action = document.getElementById('schAction').value;
  const devChecks = document.querySelectorAll('.sch-dev-check:checked');
  const devices = Array.from(devChecks).map(c => c.value);
  if (!label || !time || devices.length === 0) {
    showToast("Lengkapi data jadwal", "warning");
    return;
  }
  const res = await apiPost('add_schedule', { label, time_hhmm: time, action, devices });
  if (res?.success) {
    showToast("Jadwal disimpan", "success");
    loadSchedules();
    document.getElementById('addScheduleForm').reset();
  }
}

function renderScheduleDeviceOptions() {
  const container = document.getElementById('schDevicesList');
  if (!container) return;
  let html = '';
  Object.values(STATE.devices).forEach(d => {
    html += `
      <label class="cb-label">
        <input type="checkbox" class="sch-dev-check" value="${d.id}">
        <span>${escHtml(d.name)}</span>
      </label>`;
  });
  container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('schedule')) {
    loadSchedules();
    renderScheduleDeviceOptions();
  }
});
