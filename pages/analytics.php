<div id="analytics" class="view app-section hidden">
  <div class="view-header">
    <div class="v-title">
      <h3><i class="fas fa-chart-bar"></i> Log & Analytics</h3>
      <p>Riwayat aktivitas seluruh perangkat dan sistem IoT.</p>
    </div>
    <div class="v-actions">
      <button class="btn-secondary btn-sm" onclick="exportLog()">
        <i class="fas fa-file-export"></i> Export
      </button>
      <button class="btn-danger btn-sm" onclick="clearAllLogs()">
        <i class="fas fa-trash"></i> Hapus Semua
      </button>
    </div>
  </div>

  <div class="log-stats-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:20px; margin-bottom:24px; padding:0 2px">
    <div class="stat-card mini" style="background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:15px; display:flex; align-items:center; gap:15px">
      <div class="stat-icon" style="background:rgba(59,130,246,0.1); color:var(--primary); width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.1rem"><i class="fas fa-list-ul"></i></div>
      <div class="stat-body">
        <div class="stat-value" id="logStatTotal" style="font-size:1.2rem; font-weight:700">0</div>
        <div class="stat-label" style="font-size:0.75rem; color:var(--text-muted)">Total Aktivitas</div>
      </div>
    </div>
    <div class="stat-card mini" style="background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:15px; display:flex; align-items:center; gap:15px">
      <div class="stat-icon" style="background:rgba(16,185,129,0.1); color:var(--success); width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.1rem"><i class="fas fa-check-circle"></i></div>
      <div class="stat-body">
        <div class="stat-value" id="logStatSuccess" style="font-size:1.2rem; font-weight:700">0</div>
        <div class="stat-label" style="font-size:0.75rem; color:var(--text-muted)">Aksi Berhasil</div>
      </div>
    </div>
    <div class="stat-card mini" style="background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:15px; display:flex; align-items:center; gap:15px">
      <div class="stat-icon" style="background:rgba(245,158,11,0.1); color:var(--warning); width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.1rem"><i class="fas fa-triangle-exclamation"></i></div>
      <div class="stat-body">
        <div class="stat-value" id="logStatWarning" style="font-size:1.2rem; font-weight:700">0</div>
        <div class="stat-label" style="font-size:0.75rem; color:var(--text-muted)">Peringatan</div>
      </div>
    </div>
  </div>

  <div class="log-toolbar">
    <div class="log-filter-tabs">
      <button class="log-filter-tab active" onclick="filterLogType('all',this)">Semua</button>
      <button class="log-filter-tab" onclick="filterLogType('success',this)">Success</button>
      <button class="log-filter-tab" onclick="filterLogType('info',this)">Info</button>
      <button class="log-filter-tab" onclick="filterLogType('warning',this)">Warning</button>
      <button class="log-filter-tab" onclick="filterLogType('error',this)">Error</button>
    </div>
    <div class="search-box">
      <i class="fas fa-search"></i>
      <input type="text" placeholder="Cari log..." oninput="filterLogSearch(this.value)">
    </div>
  </div>

  <div id="logsContainer">
    <p class="muted" style="text-align:center;padding:40px">Memuat log aktivitas...</p>
  </div>
</div>
