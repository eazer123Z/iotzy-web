
      <!-- ════════════ ANALYTICS ════════════ -->
      <div id="view-analytics" class="view hidden">
        <div class="view-header">
          <div>
            <h2 class="view-title">Log Aktivitas</h2>
            <p class="view-sub">Riwayat aksi sistem — klik baris untuk melihat detail</p>
          </div>
          <div class="view-actions">
            <div class="search-box">
              <i class="fas fa-search"></i>
              <input type="text" placeholder="Filter log…" oninput="filterLogs(this.value)">
            </div>
            <div class="log-filter-btns">
              <button class="log-filter-btn active" onclick="filterLogType('all'); this.closest('.log-filter-btns').querySelectorAll('.log-filter-btn').forEach(b=>b.classList.remove('active')); this.classList.add('active')">Semua</button>
              <button class="log-filter-btn" onclick="filterLogType('success'); this.closest('.log-filter-btns').querySelectorAll('.log-filter-btn').forEach(b=>b.classList.remove('active')); this.classList.add('active')">Sukses</button>
              <button class="log-filter-btn" onclick="filterLogType('error'); this.closest('.log-filter-btns').querySelectorAll('.log-filter-btn').forEach(b=>b.classList.remove('active')); this.classList.add('active')">Error</button>
            </div>
            <button onclick="exportLogsToExcel()" class="btn-ghost"><i class="fas fa-download"></i> Ekspor</button>
            <button onclick="clearLogs()" class="btn-ghost red"><i class="fas fa-trash"></i> Hapus</button>
          </div>
        </div>
        <div class="log-table-wrapper">
          <table class="log-table">
            <thead><tr><th></th><th>Perangkat</th><th>Aktivitas Terakhir</th><th>Trigger</th><th>Waktu</th><th>Jumlah</th></tr></thead>
            <tbody id="logBody"></tbody>
          </table>
          <div id="emptyLog" class="empty-state hidden"><i class="fas fa-inbox"></i><p>Belum ada aktivitas tercatat</p></div>
        </div>
      </div>
