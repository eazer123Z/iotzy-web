<div id="analytics" class="view app-section">
  <div class="view-header">
    <div class="v-title">
      <h3><i class="fas fa-chart-pie"></i> Analytics Hub</h3>
      <p>Wawasan mendalam dan statistik penggunaan perangkat Anda.</p>
    </div>
  </div>
  <div class="analytics-grid">
    <div class="card glass premium">
      <div class="card-header"><span class="card-title"><i class="fas fa-bolt"></i> Konsumsi Energi</span></div>
      <div class="card-body">
        <div class="mock-chart-container">
          <div class="mock-chart-bar" style="height: 40%; --del: 0.1s"></div>
          <div class="mock-chart-bar" style="height: 70%; --del: 0.2s"></div>
          <div class="mock-chart-bar" style="height: 55%; --del: 0.3s"></div>
          <div class="mock-chart-bar" style="height: 90%; --del: 0.4s"></div>
          <div class="mock-chart-bar" style="height: 65%; --del: 0.5s"></div>
          <div class="mock-chart-bar active" style="height: 85%; --del: 0.6s"></div>
        </div>
        <div class="stat-summary">
          <div class="ss-item"><span>Tertinggi</span><strong>1.2 kWh</strong></div>
          <div class="ss-item"><span>Rata-rata</span><strong>0.8 kWh</strong></div>
        </div>
      </div>
    </div>

    <div class="card glass premium">
      <div class="card-header"><span class="card-title"><i class="fas fa-microchip"></i> Uptime Sistem</span></div>
      <div class="card-body">
        <div class="uptime-circle-container">
          <svg viewBox="0 0 36 36" class="circular-chart">
            <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path class="circle" stroke-dasharray="98, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <text x="18" y="20.35" class="percentage">98%</text>
          </svg>
        </div>
        <p class="stat-desc">Sistem beroperasi optimal selama 30 hari terakhir tanpa kegagalan kritis.</p>
      </div>
    </div>
    
    <div class="card glass premium full-width">
      <div class="card-header"><span class="card-title"><i class="fas fa-robot"></i> Efisiensi Otomasi</span></div>
      <div class="card-body">
        <div class="efficiency-grid">
          <div class="eff-item">
             <i class="fas fa-leaf"></i>
             <div><strong>15%</strong><span>Energy Saved</span></div>
          </div>
          <div class="eff-item">
             <i class="fas fa-toggle-on"></i>
             <div><strong>420</strong><span>Actions Executed</span></div>
          </div>
          <div class="eff-item">
             <i class="fas fa-clock"></i>
             <div><strong>12h</strong><span>Manual Time Saved</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="view-header" style="margin-top:24px; margin-bottom:16px;">
    <div class="v-title">
      <h3><i class="fas fa-clock-rotate-left"></i> Riwayat Aktivitas & Log</h3>
      <p>Log aktivitas perangkat, sensor, dan AI system secara real-time.</p>
    </div>
    <div class="v-actions">
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input type="text" placeholder="Filter log…" oninput="typeof filterLogs === 'function' ? filterLogs(this.value) : null">
      </div>
      <button onclick="typeof clearLogs === 'function' ? clearLogs() : null" class="btn-ghost red"><i class="fas fa-trash-can"></i> Bersihkan Log</button>
    </div>
  </div>

  <div class="card glass premium">
    <div class="card-header tabs-header" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid var(--border);">
      <div class="log-tabs" style="display:flex; gap:8px;">
        <button class="log-tab active" data-type="device" style="background:transparent; border:none; padding:6px 12px; color:var(--ink-4); cursor:pointer; font-weight:600; border-radius:var(--r-sm);">Device</button>
        <button class="log-tab" data-type="sensor" style="background:transparent; border:none; padding:6px 12px; color:var(--ink-4); cursor:pointer; font-weight:600; border-radius:var(--r-sm);">Sensor</button>
        <button class="log-tab" data-type="automation" style="background:transparent; border:none; padding:6px 12px; color:var(--ink-4); cursor:pointer; font-weight:600; border-radius:var(--r-sm);">Automation</button>
      </div>
    </div>
    <div class="card-body no-padding logs-fixed-height" style="max-height: 400px; overflow-y: auto;">
      <div id="logsContainer" class="log-table-wrapper" style="width:100%; text-align:center; padding:32px; color:var(--ink-5);">
        <i class="fas fa-spinner fa-spin" style="margin-bottom:10px; font-size:24px;"></i><br>
        Memuat data riwayat...
      </div>
    </div>
  </div>
</div>
