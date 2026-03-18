
      <!-- ════════════ DEVICES ════════════ -->
      <div id="view-devices" class="view hidden">
        <div class="view-header">
          <div>
            <h2 class="view-title">Perangkat</h2>
            <p class="view-sub">Kelola semua perangkat IoT — kontrol disesuaikan per jenis perangkat</p>
          </div>
          <div class="view-actions">
            <div class="search-box">
              <i class="fas fa-search"></i>
              <input type="text" placeholder="Cari perangkat…" oninput="filterDevices(this.value)">
            </div>
            <button onclick="openAddDeviceModal()" class="btn-primary"><i class="fas fa-plus"></i> Tambah</button>
          </div>
        </div>
        <div id="devicesGrid" class="device-grid"></div>
        <div id="emptyDevices" class="empty-state hidden">
          <i class="fas fa-microchip"></i>
          <p>Belum ada perangkat</p>
          <div class="hint">Tambahkan perangkat IoT Anda dan hubungkan via MQTT</div>
          <button onclick="openAddDeviceModal()" class="btn-primary" style="margin-top:8px"><i class="fas fa-plus"></i> Tambah Perangkat</button>
        </div>
      </div>
