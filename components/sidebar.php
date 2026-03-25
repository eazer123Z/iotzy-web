<aside id="sidebar" class="sidebar">
  <div class="sidebar-header">
    <div class="sidebar-logo"><i class="fas fa-bolt"></i></div>
    <div class="brand-info">
      <span class="brand-name">IoTzy<br><small style="font-size:9px;opacity:0.6;font-weight:600;letter-spacing:1px">DASHBOARD</small></span>
    </div>
    <button class="sidebar-toggle menu-btn" style="margin-left:auto"><i class="fas fa-bars-staggered"></i></button>
  </div>
  <nav class="sidebar-nav">
    <div class="nav-group-label">OVERVIEW</div>
    <a href="#dashboard" class="nav-item active" data-page="dashboard"><i class="fas fa-house-chimney nav-icon"></i><span class="nav-label">Overview</span></a>

    <div class="nav-group-label">MONITOR</div>
    <a href="#devices" class="nav-item" data-page="devices"><i class="fas fa-microchip nav-icon"></i><span class="nav-label">Devices</span></a>
    <a href="#sensors" class="nav-item" data-page="sensors"><i class="fas fa-gauge-high nav-icon"></i><span class="nav-label">Sensors</span></a>

    <div class="nav-group-label">KAMERA & CV</div>
    <a href="#camera" class="nav-item" data-page="camera"><i class="fas fa-video nav-icon"></i><span class="nav-label">Live Feed</span></a>
    <a href="#camera_cv" class="nav-item" data-page="camera_cv"><i class="fas fa-brain nav-icon"></i><span class="nav-label">CV Detection</span></a>
    <a href="#recordings" class="nav-item" data-page="recordings"><i class="fas fa-photo-film nav-icon"></i><span class="nav-label">Recordings</span></a>

    <div class="nav-group-label">AUTOMATION</div>
    <a href="#automation" class="nav-item" data-page="automation"><i class="fas fa-robot nav-icon"></i><span class="nav-label">Rules & Triggers</span></a>
    <a href="#schedule" class="nav-item" data-page="schedule"><i class="fas fa-calendar-check nav-icon"></i><span class="nav-label">Schedules</span></a>

    <div class="nav-group-label">HISTORY</div>
    <a href="#analytics" class="nav-item" data-page="analytics"><i class="fas fa-chart-line nav-icon"></i><span class="nav-label">Statistics</span></a>
    <a href="#logs" class="nav-item" data-page="logs"><i class="fas fa-list-ul nav-icon"></i><span class="nav-label">Activity Logs</span></a>

    <div class="nav-group-label">PREFERENCES</div>
    <a href="#settings" class="nav-item" data-page="settings"><i class="fas fa-sliders nav-icon"></i><span class="nav-label">Settings</span></a>
  </nav>
  <div class="sidebar-footer">
    <div class="user-pill">
      <div class="user-avatar"><?= substr(strtoupper($user['username'] ?? 'U'),0,1) ?></div>
      <div class="user-info">
        <span class="user-name"><?= htmlspecialchars($user['username'] ?? 'User') ?></span>
        <span class="user-role"><?= htmlspecialchars($user['role'] ?? 'Admin') ?></span>
      </div>
      <form action="<?= APP_URL ?>/?route=logout" method="POST" style="margin:0;display:inline">
        <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
        <button type="submit" class="logout-btn" title="Keluar dari sistem">
          <i class="fas fa-power-off"></i>
        </button>
      </form>
    </div>
  </div>
</aside>
