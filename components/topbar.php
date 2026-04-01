  <main class="main-content">
    <header class="topbar">
      <div class="topbar-left">
        <button onclick="toggleSidebar()" class="menu-btn"><i class="fas fa-bars"></i></button>
        <div class="topbar-context">
          <div class="topbar-context-meta">
            <span id="pageSectionBadge" class="page-section-badge">Dashboard IoT</span>
          </div>
          <div class="topbar-context-copy">
            <div id="pageTitle" class="topbar-page-title">Overview</div>
          </div>
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
        <div class="topbar-clock">
          <span id="clock" class="clock-time">00:00:00</span>
          <span id="date" class="clock-date">-</span>
        </div>
        <div class="topbar-user-chip" title="<?= htmlspecialchars($user['username']) ?>">
          <div class="user-avatar topbar-user-avatar">
            <?= htmlspecialchars(strtoupper(substr($user['username'], 0, 1))) ?>
          </div>
          <div class="topbar-user-copy">
            <span class="topbar-user-name"><?= htmlspecialchars($user['full_name'] ?: $user['username']) ?></span>
            <span class="topbar-user-role"><?= htmlspecialchars($user['role']) ?></span>
          </div>
        </div>
      </div>
    </header>

    <div class="page-wrapper">
