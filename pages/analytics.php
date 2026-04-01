<div id="analytics" class="view app-section hidden">
  <div class="view-header">
    <div class="v-title">
      <span class="view-kicker view-kicker-info">Halaman Informasi</span>
      <h3><i class="fas fa-chart-bar"></i> Log & Analytics</h3>
      <p>Ringkasan harian perangkat, sensor, durasi aktif, dan energi opsional dari INA219.</p>
    </div>
    <div class="v-actions" style="gap:12px; flex-wrap:wrap">
      <input
        type="date"
        id="logSummaryDate"
        class="form-select"
        style="min-width:170px; padding:10px 12px; border-radius:10px; border:1px solid var(--border); background:var(--bg-card); color:var(--text)"
      >
      <button class="btn-secondary btn-sm" onclick="exportLog()">
        <i class="fas fa-file-export"></i> Export
      </button>
      <button class="btn-danger btn-sm" onclick="clearAllLogs()">
        <i class="fas fa-trash"></i> Hapus Semua
      </button>
    </div>
  </div>

  <div class="log-stats-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:16px; margin-bottom:20px">
    <div class="stat-card mini" style="padding:16px">
      <div class="stat-label">Aktivitas Hari Ini</div>
      <div class="stat-value" id="logStatTotal">0</div>
      <div class="stat-sub" id="analyticsDateLabel">Tanggal terpilih</div>
    </div>
    <div class="stat-card mini" style="padding:16px">
      <div class="stat-label">Device Aktif</div>
      <div class="stat-value" id="analyticsActiveDevices">0</div>
      <div class="stat-sub" id="analyticsIdleDevices">Idle: 0</div>
    </div>
    <div class="stat-card mini" style="padding:16px">
      <div class="stat-label">Durasi Aktif</div>
      <div class="stat-value" id="analyticsTotalDuration">0d</div>
      <div class="stat-sub" id="analyticsOnOffEvents">ON: 0 / OFF: 0</div>
    </div>
    <div class="stat-card mini" style="padding:16px">
      <div class="stat-label">Energi Harian</div>
      <div class="stat-value" id="analyticsTotalEnergy">0 kWh</div>
      <div class="stat-sub" id="analyticsCurrentPower">Power sekarang: 0 W</div>
    </div>
  </div>

  <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:18px; margin-bottom:20px">
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-clock"></i> Aktivitas per Jam</span>
      </div>
      <div class="card-body">
        <canvas id="analyticsTimelineChart" height="180"></canvas>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-plug-circle-bolt"></i> Durasi per Device</span>
      </div>
      <div class="card-body">
        <canvas id="analyticsDeviceChart" height="180"></canvas>
      </div>
    </div>
  </div>

  <div class="card" id="analyticsPowerSection" style="margin-bottom:20px">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-bolt"></i> Power & Energy</span>
    </div>
    <div class="card-body">
      <div id="analyticsPowerTotal" class="muted">Belum ada sensor daya terhubung.</div>
      <div id="analyticsPowerBreakdown" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:14px; margin-top:14px"></div>
    </div>
  </div>

  <div class="card" style="margin-bottom:20px">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-microchip"></i> Summary Perangkat</span>
    </div>
    <div class="card-body">
      <div id="analyticsDevicesSummary" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:14px">
        <p class="muted">Memuat ringkasan perangkat...</p>
      </div>
    </div>
  </div>

  <div class="log-toolbar">
    <div class="search-box">
      <i class="fas fa-search"></i>
      <input type="text" id="logSearchInput" placeholder="Cari log..." oninput="filterLogSearch(this.value)">
    </div>
  </div>

  <div id="logsContainer">
    <p class="muted" style="text-align:center;padding:40px">Memuat log aktivitas...</p>
  </div>
</div>
