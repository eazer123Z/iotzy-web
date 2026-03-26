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
