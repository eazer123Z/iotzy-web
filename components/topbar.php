<header class="topbar">
  <div class="topbar-left">
    <button id="sidebarToggle" class="sidebar-toggle"><i class="fas fa-bars-staggered"></i></button>
    <div class="page-info">
      <h2 id="currentPageTitle">Dashboard</h2>
      <span class="breadcrumb">Home / <span id="breadcrumbCurrent">Dashboard</span></span>
    </div>
  </div>
  <div class="topbar-right">
    <div class="topbar-actions">
      <div class="mqtt-badge" id="mqttStatusBadge">
        <i class="fas fa-circle-nodes"></i>
        <span>MQTT</span>
        <div class="status-dot disconnected"></div>
      </div>
      <button class="icon-btn" onclick="toggleTheme()" id="themeToggle"><i class="fas fa-moon"></i></button>
      <button class="icon-btn" onclick="openModal('logModal')"><i class="fas fa-terminal"></i></button>
      <div class="notif-wrapper">
        <button class="icon-btn"><i class="fas fa-bell"></i><span class="notif-dot"></span></button>
      </div>
    </div>
    <div class="user-profile" onclick="openPage('settings')">
      <div class="profile-info">
        <span><?= $userData['username'] ?? 'User' ?></span>
        <small>Online</small>
      </div>
      <div class="profile-avatar"><?= substr($userData['username'] ?? 'U',0,1) ?></div>
    </div>
  </div>
</header>
