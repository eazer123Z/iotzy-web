<div id="logs" class="view app-section">
  <div class="view-header">
    <div class="v-title">
      <h3><i class="fas fa-clock-rotate-left"></i> Riwayat Aktivitas</h3>
      <p>Log aktivitas perangkat dan sistem IoTzy secara real-time.</p>
    </div>
  </div>

  <div class="card logs-card glass premium">
    <div class="card-header tabs-header">
      <div class="log-tabs">
        <button class="log-tab active" data-type="device"><i class="fas fa-plug"></i> Device Logs</button>
        <button class="log-tab" data-type="sensor"><i class="fas fa-gauge-high"></i> Sensor Logs</button>
        <button class="log-tab" data-type="automation"><i class="fas fa-robot"></i> Automation Logs</button>
      </div>
      <div class="log-actions">
        <button onclick="clearLogs()" class="text-btn red"><i class="fas fa-trash-can"></i> Bersihkan</button>
      </div>
    </div>
    <div class="card-body no-padding logs-fixed-height">
      <div id="logsContainer" class="logs-list glass premium">
        <div class="empty-logs">Memuat data riwayat...</div>
      </div>
    </div>
  </div>
</div>
