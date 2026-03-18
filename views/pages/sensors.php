
      <!-- ════════════ SENSORS ════════════ -->
      <div id="view-sensors" class="view hidden">
        <div class="view-header">
          <div>
            <h2 class="view-title">Sensor</h2>
            <p class="view-sub">Monitoring data real-time dari semua sensor IoT Anda</p>
          </div>
          <div class="view-actions">
            <div class="search-box">
              <i class="fas fa-search"></i>
              <input type="text" placeholder="Cari sensor…" oninput="filterSensors(this.value)">
            </div>
            <button onclick="openAddSensorModal()" class="btn-primary"><i class="fas fa-plus"></i> Tambah</button>
          </div>
        </div>
        <div id="sensorsGrid" class="sensor-grid"></div>
        <div id="emptySensors" class="empty-state hidden">
          <i class="fas fa-signal"></i>
          <p>Belum ada sensor</p>
          <div class="hint">Tambahkan sensor untuk memantau kondisi ruangan secara real-time</div>
          <button onclick="openAddSensorModal()" class="btn-primary" style="margin-top:8px"><i class="fas fa-plus"></i> Tambah Sensor</button>
        </div>
      </div>
