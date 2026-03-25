<div id="schedule" class="view app-section">
  <div class="view-header">
    <div class="v-title">
      <h3><i class="fas fa-calendar-check"></i> Jadwal Otomatis</h3>
      <p>Manajemen waktu operasional perangkat secara terjadwal.</p>
    </div>
  </div>

  <div class="dashboard-layout">
    <div class="ov-main-col">
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-calendar-plus"></i> Tambah Jadwal Baru</span>
        </div>
        <div class="card-body">
          <form id="addScheduleForm" class="settings-grid" style="grid-template-columns:1fr; gap:16px">
            <div class="field-item">
              <label>Nama Jadwal</label>
              <input type="text" id="schLabel" placeholder="Misal: Lampu Teras Malam" class="fi-input" style="width:100%">
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px">
              <div class="field-item">
                <label>Waktu (HH:MM)</label>
                <input type="time" id="schTime" class="fi-input" style="width:100%">
              </div>
              <div class="field-item">
                <label>Aksi</label>
                <select id="schAction" class="fi-input" style="width:100%">
                  <option value="on">Nyalakan (ON)</option>
                  <option value="off">Matikan (OFF)</option>
                </select>
              </div>
            </div>
            <div class="field-item">
              <label>Pilih Perangkat</label>
              <div id="schDevicesList" class="checkbox-group grid-2"></div>
            </div>
            <button type="button" onclick="saveSchedule()" class="btn-primary" style="width:100%">Simpan Jadwal</button>
          </form>
        </div>
      </div>
    </div>

    <div class="ov-side-col">
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-clock"></i> Daftar Jadwal</span>
        </div>
        <div class="card-body" id="scheduleListContainer">
          <div class="empty-state">Memuat jadwal...</div>
        </div>
      </div>
    </div>
  </div>
</div>
