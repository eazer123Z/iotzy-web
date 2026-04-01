<div id="sensors" class="view app-section hidden">
  <div class="view-header">
    <div class="v-title">
      <h3><i class="fas fa-signal"></i> Monitoring Sensor</h3>
      <p>Data sensor real-time.</p>
    </div>
    <div class="v-actions">
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input type="text" placeholder="Cari sensor..." oninput="filterSensors(this.value)">
      </div>
      <button class="btn-primary" onclick="openAddSensorModal()">
        <i class="fas fa-plus"></i> Tambah Sensor
      </button>
    </div>
  </div>
  <div id="sensorsGrid" class="sensors-grid"></div>
  <div id="emptySensors" class="empty-state hidden">
    <i class="fas fa-signal"></i>
    <p>Belum ada sensor terdaftar</p>
    <button class="btn-primary" onclick="openAddSensorModal()">Tambah Sensor</button>
  </div>
</div>
