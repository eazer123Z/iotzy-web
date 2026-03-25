<div id="dashboard" class="view app-section">
  <div class="overview-header">
    <div class="ov-title">
      <h1>Selamat Datang, <?= htmlspecialchars($user['username']) ?></h1>
      <p>Berikut adalah ringkasan kondisi rumah pintar Anda saat ini.</p>
    </div>
    <div class="ov-date" id="ovClock">--:--:--</div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon green"><i class="fas fa-plug"></i></div>
      <div class="stat-body">
        <div class="stat-value" id="statActiveDevicesVal">0</div>
        <div class="stat-label">Perangkat Aktif</div>
        <div class="stat-sub" id="statActiveDevicesSub">dari 0 perangkat</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon sky"><i class="fas fa-gauge-high"></i></div>
      <div class="stat-body">
        <div class="stat-value" id="statSensorsOnlineVal">0</div>
        <div class="stat-label">Sensor Aktif</div>
        <div class="stat-sub" id="statSensorsOnlineSub">dari 0 sensor</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon amber"><i class="fas fa-bell"></i></div>
      <div class="stat-body">
        <div class="stat-value" id="statAlertsVal">0</div>
        <div class="stat-label">Notifikasi</div>
        <div class="stat-sub">Sistem normal</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon purple"><i class="fas fa-cloud"></i></div>
      <div class="stat-body">
        <div class="stat-value" id="statMqttVal">...</div>
        <div class="stat-label">Koneksi Cloud</div>
        <div class="stat-sub" id="statMqttSub">Menghubungkan...</div>
      </div>
    </div>
  </div>

  <div class="dashboard-layout">
    <div class="ov-main-col">
      <div class="card chart-card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-chart-line"></i> Monitoring Sensor Terkini</span>
          <select id="ovChartSensorSelect" class="ov-select">
            <option value="all">Semua Sensor</option>
          </select>
        </div>
        <div class="card-body">
          <div id="ovOverviewChart" class="ov-chart-placeholder">
            <div class="chart-mock">
               <div class="bar" style="height:40%"></div>
               <div class="bar" style="height:60%"></div>
               <div class="bar" style="height:35%"></div>
               <div class="bar" style="height:80%"></div>
            </div>
            <span>Grafik sedang disiapkan...</span>
          </div>
        </div>
      </div>

      <div class="card summary-card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-clipboard-list"></i> Ringkasan Status</span>
        </div>
        <div class="card-body summary-list" id="ovStatusSummary">
          <p>Memindai kondisi ruangan...</p>
        </div>
      </div>
    </div>

    <div class="ov-side-col">
      <div class="card quick-controls-card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-bolt"></i> Kontrol Cepat</span>
          <button onclick="openQuickControlSettings()" class="icon-btn" title="Pilih perangkat"><i class="fas fa-gear"></i></button>
        </div>
        <div class="card-body">
          <div id="quickControlsContainer" class="quick-controls-grid">
            <p class="muted">Belum ada perangkat favorit.</p>
          </div>
        </div>
      </div>

      <div class="card live-indicator-card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-video"></i> Kamera Utama</span>
          <button onclick="navSwitch('camera')" class="ov-link">Detail <i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="card-body camera-mini-wrap">
          <div id="miniCameraPreview" class="mini-cam-preview">
            <i class="fas fa-video-slash"></i>
            <span>Preview kamera nonaktif</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
