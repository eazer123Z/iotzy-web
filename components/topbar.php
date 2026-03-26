  <main class="main-content">
    <header class="topbar">
      <div class="topbar-left">
        <button onclick="toggleSidebar()" class="menu-btn"><i class="fas fa-bars"></i></button>
        <div class="breadcrumb">
          <span class="breadcrumb-app">IoTzy</span>
          <i class="fas fa-chevron-right breadcrumb-sep"></i>
          <span id="pageTitle" class="breadcrumb-page">Overview</span>
        </div>
      </div>
      <div class="topbar-right">
        <button id="themeToggleBtn" onclick="toggleTheme()" class="icon-btn theme-toggle-btn" title="Ganti Tema">
          <i class="fas fa-moon"></i>
        </button>
        <div class="mqtt-badge">
          <span class="mqtt-dot" id="mqttStatusDot"></span>
          <span id="mqttStatusText" class="mqtt-label">Disconnected</span>
        </div>
        <div style="text-align:right">
          <span id="clock" class="clock-time">00:00:00</span>
          <span id="date" class="clock-date">—</span>
        </div>
        <div class="user-avatar" style="width:32px;height:32px;font-size:.75rem;border-radius:8px" title="<?= htmlspecialchars($user['username']) ?>">
          <?= htmlspecialchars(strtoupper(substr($user['username'], 0, 1))) ?>
        </div>
      </div>
    </header>

    <div class="page-wrapper">
