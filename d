[33mcommit a99e3de809a25517b0bcfc6ca6e95cc816a28e7b[m[33m ([m[1;36mHEAD -> [m[1;32mmain[m[33m, [m[1;31morigin/main[m[33m)[m
Author: eazer123Z <rendyaulianur@gmail.com>
Date:   Thu Mar 26 05:05:09 2026 +0800

    Auto-update: Thu 03/26/2026  5:05:09.75

[1mdiff --git a/components/sidebar.php b/components/sidebar.php[m
[1mindex 36288c7..7cf68a5 100644[m
[1m--- a/components/sidebar.php[m
[1m+++ b/components/sidebar.php[m
[36m@@ -37,9 +37,11 @@[m
         <span class="user-name"><?= htmlspecialchars($user['username'] ?? 'User') ?></span>[m
         <span class="user-role"><?= htmlspecialchars($user['role'] ?? 'Admin') ?></span>[m
       </div>[m
[31m-      <form action="?route=logout" method="POST" style="margin:0;display:inline">[m
[32m+[m[32m      <form action="<?= APP_URL ?>/?route=logout" method="POST" style="margin:0;display:inline">[m
         <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">[m
[31m-        <button type="submit" class="logout-btn"><i class="fas fa-right-from-bracket"></i></button>[m
[32m+[m[32m        <button type="submit" class="logout-btn" title="Keluar dari sistem">[m
[32m+[m[32m          <i class="fas fa-power-off"></i>[m
[32m+[m[32m        </button>[m
       </form>[m
     </div>[m
   </div>[m

[33mcommit 76f932dadd15e3f7c0e13023a3476d0c36db52be[m
Author: eazer123Z <rendyaulianur@gmail.com>
Date:   Thu Mar 26 04:09:00 2026 +0800

    Auto-update: Thu 03/26/2026  4:09:00.28

[1mdiff --git a/components/sidebar.php b/components/sidebar.php[m
[1mindex e324f60..36288c7 100644[m
[1m--- a/components/sidebar.php[m
[1m+++ b/components/sidebar.php[m
[36m@@ -4,7 +4,7 @@[m
     <div class="brand-info">[m
       <span class="brand-name">IoTzy<br><small style="font-size:9px;opacity:0.6;font-weight:600;letter-spacing:1px">DASHBOARD</small></span>[m
     </div>[m
[31m-    <button id="sidebarToggle" class="menu-btn" style="margin-left:auto"><i class="fas fa-bars-staggered"></i></button>[m
[32m+[m[32m    <button class="sidebar-toggle menu-btn" style="margin-left:auto"><i class="fas fa-bars-staggered"></i></button>[m
   </div>[m
   <nav class="sidebar-nav">[m
     <div class="nav-group-label">OVERVIEW</div>[m

[33mcommit 7f0850939d561e843486e61a273953926172c44d[m
Author: eazer123Z <rendyaulianur@gmail.com>
Date:   Thu Mar 26 03:50:36 2026 +0800

    Auto-update: Thu 03/26/2026  3:50:36.39

[1mdiff --git a/components/sidebar.php b/components/sidebar.php[m
[1mindex fd251be..e324f60 100644[m
[1m--- a/components/sidebar.php[m
[1m+++ b/components/sidebar.php[m
[36m@@ -1,76 +1,46 @@[m
[31m-<?php ?>[m
[31m-  <!-- ═══ SIDEBAR ═══ -->[m
[31m-  <aside id="sidebar" class="sidebar">[m
[31m-    <div class="sidebar-header">[m
[31m-      <div class="sidebar-logo"><i class="fas fa-bolt"></i></div>[m
[31m-      <div>[m
[31m-        <span class="brand-name">IoTzy</span>[m
[31m-      </div>[m
[32m+[m[32m<aside id="sidebar" class="sidebar">[m
[32m+[m[32m  <div class="sidebar-header">[m
[32m+[m[32m    <div class="sidebar-logo"><i class="fas fa-bolt"></i></div>[m
[32m+[m[32m    <div class="brand-info">[m
[32m+[m[32m      <span class="brand-name">IoTzy<br><small style="font-size:9px;opacity:0.6;font-weight:600;letter-spacing:1px">DASHBOARD</small></span>[m
     </div>[m
[31m-    <nav class="sidebar-nav">[m
[31m-      <div class="nav-group-label">Monitor</div>[m
[31m-      <a href="#" onclick="switchPage('dashboard',this)" class="nav-item active" data-page="dashboard">[m
[31m-        <span class="nav-icon"><i class="fas fa-house"></i></span>[m
[31m-        <span class="nav-label">Overview</span>[m
[31m-      </a>[m
[32m+[m[32m    <button id="sidebarToggle" class="menu-btn" style="margin-left:auto"><i class="fas fa-bars-staggered"></i></button>[m
[32m+[m[32m  </div>[m
[32m+[m[32m  <nav class="sidebar-nav">[m
[32m+[m[32m    <div class="nav-group-label">OVERVIEW</div>[m
[32m+[m[32m    <a href="#dashboard" class="nav-item active" data-page="dashboard"><i class="fas fa-house-chimney nav-icon"></i><span class="nav-label">Overview</span></a>[m
 [m
[31m-      <a href="#" onclick="switchPage('devices',this)" class="nav-item" data-page="devices">[m
[31m-        <span class="nav-icon"><i class="fas fa-microchip"></i></span>[m
[31m-        <span class="nav-label">Perangkat</span>[m
[31m-        <span class="nav-badge" id="navDeviceCount"><?= count($devices) ?></span>[m
[31m-      </a>[m
[31m-      <a href="#" onclick="switchPage('sensors',this)" class="nav-item" data-page="sensors">[m
[31m-        <span class="nav-icon"><i class="fas fa-signal"></i></span>[m
[31m-        <span class="nav-label">Sensor</span>[m
[31m-        <span class="nav-badge" id="navSensorCount"><?= count($sensors) ?></span>[m
[31m-      </a>[m
[32m+[m[32m    <div class="nav-group-label">MONITOR</div>[m
[32m+[m[32m    <a href="#devices" class="nav-item" data-page="devices"><i class="fas fa-microchip nav-icon"></i><span class="nav-label">Devices</span></a>[m
[32m+[m[32m    <a href="#sensors" class="nav-item" data-page="sensors"><i class="fas fa-gauge-high nav-icon"></i><span class="nav-label">Sensors</span></a>[m
 [m
[31m-      <div class="nav-group-label" style="margin-top:18px">Otomasi</div>[m
[31m-      <a href="#" onclick="switchPage('automation',this)" class="nav-item" data-page="automation">[m
[31m-        <span class="nav-icon"><i class="fas fa-sliders"></i></span>[m
[31m-        <span class="nav-label">Aturan Otomasi</span>[m
[31m-      </a>[m
[31m-      <a href="#" onclick="switchPage('camera',this)" class="nav-item" data-page="camera">[m
[31m-        <span class="nav-icon"><i class="fas fa-eye"></i></span>[m
[31m-        <span class="nav-label">Kamera &amp; CV</span>[m
[31m-        <span class="nav-dot" id="cvNavDot"></span>[m
[31m-      </a>[m
[32m+[m[32m    <div class="nav-group-label">KAMERA & CV</div>[m
[32m+[m[32m    <a href="#camera" class="nav-item" data-page="camera"><i class="fas fa-video nav-icon"></i><span class="nav-label">Live Feed</span></a>[m
[32m+[m[32m    <a href="#camera_cv" class="nav-item" data-page="camera_cv"><i class="fas fa-brain nav-icon"></i><span class="nav-label">CV Detection</span></a>[m
[32m+[m[32m    <a href="#recordings" class="nav-item" data-page="recordings"><i class="fas fa-photo-film nav-icon"></i><span class="nav-label">Recordings</span></a>[m
 [m
[31m-      <div class="nav-group-label" style="margin-top:18px">Sistem</div>[m
[31m-      <a href="#" onclick="switchPage('analytics',this)" class="nav-item" data-page="analytics">[m
[31m-        <span class="nav-icon"><i class="fas fa-list-ul"></i></span>[m
[31m-        <span class="nav-label">Log Aktivitas</span>[m
[31m-      </a>[m
[31m-      <a href="#" onclick="switchPage('settings',this)" class="nav-item" data-page="settings">[m
[31m-        <span class="nav-icon"><i class="fas fa-gear"></i></span>[m
[31m-        <span class="nav-label">Pengaturan</span>[m
[31m-      </a>[m
[31m-    </nav>[m
[31m-    <div class="sidebar-footer">[m
[31m-      <div class="user-pill">[m
[31m-        <div class="user-avatar"><?= htmlspecialchars(strtoupper(substr($user['username'], 0, 1))) ?></div>[m
[31m-        <div class="user-meta">[m
[31m-          <span class="user-name"><?= htmlspecialchars($user['full_name'] ?: $user['username']) ?></span>[m
[31m-          <span class="user-role"><?= htmlspecialchars($user['role']) ?></span>[m
[31m-        </div>[m
[31m-        <form method="POST" action="<?= APP_URL ?>/?route=logout" class="logout-form">[m
[31m-          <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(generateCsrfToken()) ?>">[m
[31m-          <button type="submit" class="logout-btn" title="Logout">[m
[31m-            <i class="fas fa-right-from-bracket"></i>[m
[31m-          </button>[m
[31m-        </form>[m
[31m-      </div>[m
[31m-      <div class="sidebar-bottom-row">[m
[31m-        <div class="mqtt-pill">[m
[31m-          <span class="mqtt-dot" id="sidebarMqttDot"></span>[m
[31m-          <span id="sidebarMqttText">Offline</span>[m
[31m-        </div>[m
[31m-        <button onclick="connectMQTT()" class="icon-btn" title="Hubungkan MQTT"[m
[31m-          style="border:1px solid var(--sb-border);background:rgba(255,255,255,.04);color:var(--sb-text)">[m
[31m-          <i class="fas fa-wifi"></i>[m
[31m-        </button>[m
[32m+[m[32m    <div class="nav-group-label">AUTOMATION</div>[m
[32m+[m[32m    <a href="#automation" class="nav-item" data-page="automation"><i class="fas fa-robot nav-icon"></i><span class="nav-label">Rules & Triggers</span></a>[m
[32m+[m[32m    <a href="#schedule" class="nav-item" data-page="schedule"><i class="fas fa-calendar-check nav-icon"></i><span class="nav-label">Schedules</span></a>[m
[32m+[m
[32m+[m[32m    <div class="nav-group-label">HISTORY</div>[m
[32m+[m[32m    <a href="#analytics" class="nav-item" data-page="analytics"><i class="fas fa-chart-line nav-icon"></i><span class="nav-label">Statistics</span></a>[m
[32m+[m[32m    <a href="#logs" class="nav-item" data-page="logs"><i class="fas fa-list-ul nav-icon"></i><span class="nav-label">Activity Logs</span></a>[m
[32m+[m
[32m+[m[32m    <div class="nav-group-label">PREFERENCES</div>[m
[32m+[m[32m    <a href="#settings" class="nav-item" data-page="settings"><i class="fas fa-sliders nav-icon"></i><span class="nav-label">Settings</span></a>[m
[32m+[m[32m  </nav>[m
[32m+[m[32m  <div class="sidebar-footer">[m
[32m+[m[32m    <div class="user-pill">[m
[32m+[m[32m      <div class="user-avatar"><?= substr(strtoupper($user['username'] ?? 'U'),0,1) ?></div>[m
[32m+[m[32m      <div class="user-info">[m
[32m+[m[32m        <span class="user-name"><?= htmlspecialchars($user['username'] ?? 'User') ?></span>[m
[32m+[m[32m        <span class="user-role"><?= htmlspecialchars($user['role'] ?? 'Admin') ?></span>[m
       </div>[m
[32m+[m[32m      <form action="?route=logout" method="POST" style="margin:0;display:inline">[m
[32m+[m[32m        <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">[m
[32m+[m[32m        <button type="submit" class="logout-btn"><i class="fas fa-right-from-bracket"></i></button>[m
[32m+[m[32m      </form>[m
     </div>[m
[31m-  </aside>[m
[31m-[m
[31m-  <div id="overlay" onclick="toggleSidebar()" class="sidebar-overlay"></div>[m
[32m+[m[32m  </div>[m
[32m+[m[32m</aside>[m
