<div id="logs" class="view app-section">
  <div class="view-header">
    <div class="view-title">Riwayat Aktivitas</div>
    <div class="view-sub">Log sistem IoTzy secara real-time</div>
  </div>

  <div class="card logs-card">
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
    <div class="card-body no-padding">
      <div id="logsContainer" class="logs-list">
        <div class="empty-logs">Memuat data riwayat...</div>
      </div>
    </div>
  </div>
</div>
