<div id="devices" class="view app-section hidden">
  <div class="view-header">
    <div class="v-title">
      <h3><i class="fas fa-microchip"></i> Monitoring Perangkat</h3>
      <p>Kontrol perangkat real-time.</p>
    </div>
    <div class="v-actions">
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input type="text" placeholder="Cari perangkat..." oninput="filterDevices(this.value)">
      </div>
      <button class="btn-primary" onclick="openAddDeviceModal()">
        <i class="fas fa-plus"></i> Tambah Perangkat
      </button>
    </div>
  </div>
  <div id="devicesGrid" class="devices-grid"></div>
  <div id="emptyDevices" class="empty-state hidden">
    <i class="fas fa-plug"></i>
    <p>Belum ada perangkat terhubung</p>
    <button class="btn-primary" onclick="openAddDeviceModal()">Tambah Perangkat</button>
  </div>
</div>
