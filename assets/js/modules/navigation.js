/**
 * assets/js/modules/navigation.js
 * ───
 * Navigasi & Utilitas UI IoTzy V2.
 * Mengelola perpindahan halaman SPA dengan animasi transisi,
 * jam digital, uptime counter, dan kontrol sidebar mobile.
 */

/* ── Jam Digital Realtime ── */
function initClock() {
  const tick = () => {
    const now = new Date();
    const el  = document.getElementById("clock");
    const de  = document.getElementById("date");
    const ov  = document.getElementById("ovClock");
    if (el) el.textContent = now.toLocaleTimeString("id-ID");
    if (de) de.textContent = now
      .toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })
      .toUpperCase();
    if (ov) ov.textContent = now.toLocaleTimeString("id-ID", { hour12: false });
  };
  tick();
  setInterval(tick, 1000);
}

/* ── Uptime Counter ── */
function initUptimeCounter() {
  setInterval(() => {
    const e  = Math.floor((Date.now() - STATE.sessionStart) / 1000);
    const h  = Math.floor(e / 3600);
    const m  = Math.floor((e % 3600) / 60);
    const s  = e % 60;
    const el = document.getElementById("statUptimeVal");
    if (el) {
      if (h > 0)      el.textContent = `${h}j ${m}m`;
      else if (m > 0) el.textContent = `${m}m ${s}d`;
      else            el.textContent = `${s}d`;
    }
    updateAllDurations();
  }, 1000);
}

/* ── Device Duration Labels ── */
function updateAllDurations() {
  Object.keys(STATE.devices).forEach((id) => {
    const el = document.getElementById(`dur-${id}`);
    if (!el) return;
    if (STATE.deviceStates[id] && STATE.deviceOnAt[id]) {
      const sec = Math.floor((Date.now() - STATE.deviceOnAt[id]) / 1000);
      const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
      el.textContent = h > 0 ? `${h}j ${m}m` : m > 0 ? `${m}m ${s}d` : `${s}d nyala`;
      el.className = "device-duration on";
    } else {
      el.textContent = "Mati";
      el.className   = "device-duration";
    }
  });
}

/* ── Page Titles Mapping ── */
const PAGE_TITLES = {
  dashboard:  "Overview",
  devices:    "Perangkat",
  sensors:    "Sensor",
  automation: "Rules Engine",
  camera:     "Computer Vision",
  analytics:  "Log & Analytics",
  settings:   "Pengaturan",
};

/* ── Variabel state halaman aktif ── */
let _currentPage = 'dashboard';

/* ── SPA Page Switch dengan Animasi ── */
function switchPage(page, el) {
  // Guard: jika sudah di halaman yang sama, skip
  if (page === _currentPage && document.getElementById(page) && !document.getElementById(page).classList.contains('hidden')) {
    return;
  }

  // Sembunyikan semua view
  document.querySelectorAll(".view").forEach((v) => {
    v.classList.add("hidden");
    v.classList.remove("entering");
  });
  
  // Tampilkan view target dengan animasi (Instant UI)
  const targetView = document.getElementById(page) || document.getElementById(`view-${page}`);
  if (targetView) {
    targetView.classList.remove("hidden");
    targetView.classList.add("entering");
    // Gunakan requestAnimationFrame untuk transisi yang lebih smooth
    requestAnimationFrame(() => {
      setTimeout(() => targetView.classList.remove("entering"), 300);
    });
  }
  
  _currentPage = page;

  // Update state navigasi di sidebar
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
  if (el) {
    el.classList.add("active");
  } else {
    const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navEl) navEl.classList.add("active");
  }
  
  // Update judul di Topbar
  const pt = document.getElementById("pageTitle");
  if (pt) pt.textContent = PAGE_TITLES[page] || page;

  // Sync dengan bottom-nav mobile
  document.querySelectorAll(".bn-item").forEach((b) => {
    b.classList.toggle("active", b.dataset.page === page);
  });

  // Jalankan inisialisasi modul spesifik halaman secara Async (Non-blocking)
  setTimeout(() => {
    if (page === "automation") {
      renderAutomationView();
      if (typeof ensureAutomationScheduleUi === "function") {
        ensureAutomationScheduleUi().catch(() => {});
      }
    }
    
    if (page === "camera") {
      const c    = document.getElementById("cvOverlayCanvas");
      const cont = document.getElementById("cameraFocusContainer");
      if (c && cont) { c.width = cont.clientWidth; c.height = cont.clientHeight; }
      if (typeof listCameraDevices === "function") {
        listCameraDevices({ ensureLabels: false }).catch(() => {});
      }
      if (typeof cameraLive !== "undefined") {
        if (typeof cameraLive.initialize === "function") cameraLive.initialize();
        if (typeof cameraLive.refreshSessions === "function") cameraLive.refreshSessions({ force: true }).catch(() => {});
      }
      if (typeof cvUI !== "undefined") {
        if (typeof cvUI.initialize === "function") cvUI.initialize();
        if (typeof cvUI.renderAutomationSettings === "function") cvUI.renderAutomationSettings();
      }
    }
    
    if (page === "analytics") {
      if (typeof loadLogs === "function") {
        loadLogs(typeof getAnalyticsDate === "function" ? getAnalyticsDate() : undefined).catch(() => {
          if (typeof updateLogDisplay === "function") updateLogDisplay();
        });
      } else if (typeof updateLogDisplay === "function") {
        updateLogDisplay();
      }
    }
  }, 0);

  // Tutup sidebar otomatis di mobile setelah klik menu
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("overlay")?.classList.remove("show");
}

/* ── Mobile Bottom Nav Handler ── */
function switchPageMobile(page, btn) {
  const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
  switchPage(page, navItem);
}

/* ── Toggle Sidebar Mobile ── */
function toggleSidebar() {
  document.getElementById("sidebar")?.classList.toggle("open");
  document.getElementById("overlay")?.classList.toggle("show");
}

/* ── Settings Tab Switching ── */
function switchSettingsTab(btn) {
  // Deactivate semua tab
  document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.settings-panel').forEach(p => {
    p.classList.remove('active');
  });
  
  // Activate tab yang diklik
  btn.classList.add('active');
  const panelId = btn.dataset.panel;
  const panel = document.getElementById(panelId);
  if (panel) panel.classList.add('active');
  if (typeof ensureSettingsPanelData === "function") {
    ensureSettingsPanelData(panelId).catch(() => {});
  }
}

/* ── Apply Theme from Settings Dropdown ── */
function applyThemeFromSettings(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon(theme);
  if (typeof updateThemeChrome === "function") updateThemeChrome(theme);
  apiPost("save_settings", { theme: theme }).catch(e => console.warn("Gagal sinkron tema:", e));
}
