async function ensureSchedulesLoaded(forceRefresh = false) {
  if (!forceRefresh && STATE.schedulesLoaded) return STATE.schedules || [];
  if (!forceRefresh && STATE.scheduleLoadPromise) return STATE.scheduleLoadPromise;

  STATE.scheduleLoadPromise = apiPost('get_schedules')
    .then((res) => {
      STATE.schedules = Array.isArray(res) ? res : [];
      STATE.schedulesLoaded = true;
      return STATE.schedules;
    })
    .finally(() => {
      STATE.scheduleLoadPromise = null;
    });

  return STATE.scheduleLoadPromise;
}

async function loadSchedules(forceRefresh = false) {
  const container = document.getElementById('scheduleListContainer');
  const schedules = await ensureSchedulesLoaded(forceRefresh);
  if (!container) return schedules;
  if (Array.isArray(schedules)) {
    if (schedules.length === 0) {
      container.innerHTML = '<div class="empty-state">Belum ada jadwal.</div>';
      return schedules;
    }
    let html = '';
    schedules.forEach(s => {
      html += `
        <div class="sch-item card mb-2">
          <div style="display:flex; justify-content:space-between; align-items:center">
            <div>
              <div style="font-weight:700; font-size:14px">${escHtml(s.label)}</div>
              <div style="font-size:12px; color:var(--a); font-weight:600">${escHtml(s.time_hhmm || '')} - ${escHtml((s.action || 'on').toUpperCase())}</div>
            </div>
            <button onclick="deleteSchedule(${s.id})" class="icon-btn red"><i class="fas fa-trash"></i></button>
          </div>
        </div>`;
    });
    container.innerHTML = html;
  }
  return schedules;
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
    STATE.schedulesLoaded = false;
    loadSchedules(true);
    document.getElementById('addScheduleForm').reset();
  }
}

async function deleteSchedule(id) {
  if (!id) return;
  const res = await apiPost('delete_schedule', { id });
  if (res?.success) {
    STATE.schedules = (STATE.schedules || []).filter((item) => String(item.id) !== String(id));
    STATE.schedulesLoaded = true;
    loadSchedules();
    showToast("Jadwal dihapus", "success");
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

async function ensureAutomationScheduleUi(forceRefresh = false) {
  renderScheduleDeviceOptions();
  return loadSchedules(forceRefresh);
}
