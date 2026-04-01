  <!-- ═══ SIDEBAR ═══ -->
  <aside id="sidebar" class="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-logo"><i class="fas fa-bolt"></i></div>
      <div class="brand-copy">
        <span class="brand-name">IoTzy</span>
      </div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-cluster">
        <div class="nav-group-head">
          <div class="nav-group-label">Dashboard IoT</div>
        </div>
        <a href="javascript:void(0)" onclick="switchPage('dashboard',this)" class="nav-item active" data-page="dashboard">
          <span class="nav-icon"><i class="fas fa-house"></i></span>
          <span class="nav-label">Overview</span>
        </a>
        <a href="javascript:void(0)" onclick="switchPage('devices',this)" class="nav-item" data-page="devices">
          <span class="nav-icon"><i class="fas fa-microchip"></i></span>
          <span class="nav-label">Perangkat</span>
          <span class="nav-badge" id="navDeviceCount"><?= count($devices) ?></span>
        </a>
        <a href="javascript:void(0)" onclick="switchPage('sensors',this)" class="nav-item" data-page="sensors">
          <span class="nav-icon"><i class="fas fa-signal"></i></span>
          <span class="nav-label">Sensor</span>
          <span class="nav-badge" id="navSensorCount"><?= count($sensors) ?></span>
        </a>
        <a href="javascript:void(0)" onclick="switchPage('automation',this)" class="nav-item" data-page="automation">
          <span class="nav-icon"><i class="fas fa-robot"></i></span>
          <span class="nav-label">Rules Engine</span>
        </a>
        <a href="javascript:void(0)" onclick="switchPage('camera',this)" class="nav-item" data-page="camera">
          <span class="nav-icon"><i class="fas fa-eye"></i></span>
          <span class="nav-label">Computer Vision</span>
          <span class="nav-dot" id="cvNavDot"></span>
        </a>
      </div>

      <div class="nav-cluster nav-cluster-secondary">
        <div class="nav-group-head">
          <div class="nav-group-label">Halaman Informasi</div>
        </div>
        <a href="javascript:void(0)" onclick="switchPage('analytics',this)" class="nav-item" data-page="analytics">
          <span class="nav-icon"><i class="fas fa-chart-bar"></i></span>
          <span class="nav-label">Log & Analitik</span>
        </a>
        <a href="javascript:void(0)" onclick="switchPage('settings',this)" class="nav-item" data-page="settings">
          <span class="nav-icon"><i class="fas fa-gear"></i></span>
          <span class="nav-label">Pengaturan</span>
        </a>
      </div>
    </nav>
    <div class="sidebar-footer">
      <div class="user-pill">
        <div class="user-avatar"><?= htmlspecialchars(strtoupper(substr($user['username'], 0, 1))) ?></div>
        <div class="user-info">
          <span class="user-name"><?= htmlspecialchars($user['full_name'] ?: $user['username']) ?></span>
          <span class="user-role"><?= htmlspecialchars($user['role']) ?></span>
        </div>
        <a href="?route=logout" class="logout-btn" title="Logout"><i class="fas fa-right-from-bracket"></i></a>
      </div>
      <div class="sidebar-bottom-row">
        <div class="mqtt-pill">
          <span class="mqtt-dot" id="sidebarMqttDot"></span>
          <span id="sidebarMqttText">Offline</span>
        </div>
        <button onclick="connectMQTT()" class="icon-btn" title="Hubungkan MQTT">
          <i class="fas fa-wifi"></i>
        </button>
      </div>
    </div>
  </aside>

  <div id="overlay" onclick="toggleSidebar()" class="sidebar-overlay"></div>
