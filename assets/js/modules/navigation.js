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
    if (el) el.textContent = now.toLocaleTimeString("id-ID");
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
  const devicesView = document.getElementById("devices");
  if (devicesView && devicesView.classList.contains("hidden")) return;
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

/* ── Page Meta Mapping ── */
const PAGE_META = {
  dashboard: {
    title: "Overview",
    description: "Ringkasan kondisi rumah dan kontrol favorit Anda."
  },
  devices: {
    title: "Perangkat",
    description: "Kelola aktuator, status, dan kontrol perangkat utama."
  },
  sensors: {
    title: "Sensor",
    description: "Pantau pembacaan sensor realtime dengan tampilan yang lebih fokus."
  },
  automation: {
    title: "Rules Engine",
    description: "Atur automasi, jadwal, dan logika respons pintar."
  },
  camera: {
    title: "Computer Vision",
    description: "Pantau live camera, analisis visual, dan workflow CV."
  },
  analytics: {
    title: "Log & Analitik",
    description: "Tinjau histori aktivitas, durasi aktif, dan insight harian."
  },
  settings: {
    title: "Pengaturan",
    description: "Atur profil, integrasi, keamanan, dan preferensi sistem."
  },
};

const MOBILE_HUB_PAGES = new Set(["automation", "analytics", "settings"]);

/* ── Variabel state halaman aktif ── */
let _currentPage = 'dashboard';
let _pageSwitchTicket = 0;

async function ensurePageAssets(page) {
  if (typeof ensureFeatureGroup !== "function") return;

  const tasks = [];
  if (["dashboard", "devices", "sensors", "analytics"].includes(page)) {
    tasks.push(ensureFeatureGroup("realtimeCore"));
  }
  if (page === "automation") {
    tasks.push(ensureFeatureGroup("automation"));
  }
  if (page === "camera") {
    tasks.push(ensureFeatureGroup("camera"));
    tasks.push(ensureFeatureGroup("automation"));
  }
  if (page === "analytics") {
    tasks.push(ensureFeatureGroup("analytics"));
  }
  if (page === "settings") {
    tasks.push(ensureFeatureGroup("settings"));
  }

  if (!tasks.length) return;
  await Promise.allSettled(tasks);
}

function runPageSetup(page, ticket) {
  if (ticket !== _pageSwitchTicket || _currentPage !== page) return;

  if (page === "dashboard") {
    if (typeof renderQuickControls === "function") {
      renderQuickControls();
    }
    if (typeof Overview !== "undefined" && typeof Overview.init === "function") {
      Overview.init();
    }
  }

  if (page === "devices" && typeof renderDevices === "function") {
    renderDevices(true);
  }

  if (page === "sensors") {
    if (typeof renderSensors === "function") {
      renderSensors(true);
    }
    if (typeof Overview !== "undefined" && typeof Overview.initChartSelect === "function") {
      Overview.initChartSelect();
    }
  }

  if (page === "automation") {
    if (typeof renderAutomationView === "function") {
      renderAutomationView();
    }
    if (typeof ensureAutomationScheduleUi === "function") {
      ensureAutomationScheduleUi().catch(() => {});
    }
  }

  if (page === "camera") {
    const c = document.getElementById("cvOverlayCanvas");
    const cont = document.getElementById("cameraFocusContainer");
    if (c && cont) {
      c.width = cont.clientWidth;
      c.height = cont.clientHeight;
    }
    if (typeof listCameraDevices === "function") {
      listCameraDevices({ ensureLabels: false }).catch(() => {});
    }
    if (typeof cameraLive !== "undefined" && typeof cameraLive.initialize === "function") {
      cameraLive.initialize();
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
}

/* ── SPA Page Switch dengan Animasi ── */
async function switchPage(page, el) {
  // Guard: jika sudah di halaman yang sama, skip
  if (page === _currentPage && document.getElementById(page) && !document.getElementById(page).classList.contains('hidden')) {
    return;
  }

  const ticket = ++_pageSwitchTicket;
  const pageAssetsPromise = Promise.resolve(ensurePageAssets(page)).catch(() => {});

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
  
  // Update konteks halaman di Topbar
  const meta = PAGE_META[page] || {
    title: page,
    description: "Halaman sistem IoT."
  };
  const pt = document.getElementById("pageTitle");
  if (pt) pt.textContent = meta.title;
  const pd = document.getElementById("pageDescription");
  if (pd) {
    pd.textContent = meta.description || "";
    pd.hidden = !meta.description;
  }
  if (typeof document !== "undefined") {
    document.title = `${meta.title} | IoTzy`;
    document.documentElement.setAttribute("data-active-page", page);
  }

  // Sync dengan bottom-nav mobile
  document.querySelectorAll(".bn-item").forEach((b) => {
    const isMore = b.dataset.page === "more";
    const shouldActive = isMore ? MOBILE_HUB_PAGES.has(page) : b.dataset.page === page;
    b.classList.toggle("active", shouldActive);
  });
  document.querySelectorAll(".mobile-nav-link").forEach((b) => {
    b.classList.toggle("active", b.dataset.page === page);
  });
  closeMobileHub();

  // Jalankan inisialisasi modul spesifik halaman setelah asset siap, tanpa menahan UI
  pageAssetsPromise.finally(() => {
    setTimeout(() => runPageSetup(page, ticket), 0);
  });

  // Tutup sidebar otomatis di mobile setelah klik menu
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("overlay")?.classList.remove("show");
}

/* ── Mobile Bottom Nav Handler ── */
function switchPageMobile(page, btn) {
  const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
  switchPage(page, navItem);
}

function toggleMobileHub(forceOpen) {
  const hub = document.getElementById("mobileNavHub");
  const overlay = document.getElementById("mobileNavOverlay");
  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : !hub?.classList.contains("open");
  hub?.classList.toggle("open", shouldOpen);
  overlay?.classList.toggle("show", shouldOpen);
  if (hub) hub.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
}

function closeMobileHub() {
  toggleMobileHub(false);
}

/* ── Toggle Sidebar Mobile ── */
function toggleSidebar() {
  if (window.innerWidth <= 768) {
    toggleMobileHub(true);
    return;
  }
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
