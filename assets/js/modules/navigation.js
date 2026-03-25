/**
 * public/assets/js/modules/navigation.js
 * ───
 * Navigasi & Utilitas UI IoTzy.
 * Mengelola perpindahan halaman antar-modul (SPA), sinkronisasi waktu sistem (Jam/Uptime),
 * serta kontrol akses perangkat keras kamera untuk Computer Vision.
 */


/**
 * Inisialisasi Jam digital real-time di Topbar.
 */
function initClock() {
  const tick = () => {
    const now = new Date();
    const el  = document.getElementById("clock");
    const de  = document.getElementById("date");
    if (el) el.textContent = now.toLocaleTimeString("id-ID");
    if (de) de.textContent = now
      .toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })
      .toUpperCase();
  };
  tick();
  setInterval(tick, 1000);
}

/**
 * Inisialisasi counter waktu aktif (Uptime) sesi web dan durasi nyala tiap perangkat.
 */
function initUptimeCounter() {
  setInterval(() => {
    const e  = Math.floor((Date.now() - STATE.sessionStart) / 1000);
    const h  = Math.floor(e / 3600);
    const m  = Math.floor((e % 3600) / 60);
    const s  = e % 60;
    
    // Update label uptime di dashboard
    const el = document.getElementById("statUptimeVal");
    if (el) {
      if (h > 0)      el.textContent = `${h}j ${m}m`;
      else if (m > 0) el.textContent = `${m}m ${s}d`;
      else            el.textContent = `${s}d`;
    }
    
    // Update durasi per perangkat yang sedang menyala
    updateAllDurations();
  }, 1000);
}

/**
 * Memperbarui label durasi nyala (e.g. "2j 30m nyala") pada setiap kartu perangkat.
 */
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

/**
 * Mapping ID halaman ke Judul Header.
 */
const PAGE_TITLES = {
  dashboard:  "Overview",
  devices:    "Perangkat",
  sensors:    "Sensor",
  automation: "Aturan Otomasi",
  camera:     "Kamera & CV",
  custom:     "Layout Kustom",
  analytics:  "Log Aktivitas",
  settings:   "Pengaturan",
  livetzy:    "LiveTzy Monitor"
};

/**
 * Berpindah antar 'View' tanpa reload halaman (Single Page Application logic).
 */
function switchPage(page, el) {
  // Sembunyikan semua view
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  
  // Tampilkan view target — coba id="page" dulu lalu fallback ke id="view-page"
  const targetView = document.getElementById(page) || document.getElementById(`view-${page}`);
  if (targetView) targetView.classList.remove("hidden");
  
  // Update state navigasi di sidebar
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
  if (el) el.classList.add("active");
  
  // Update judul di Topbar
  const pt = document.getElementById("pageTitle");
  if (pt) pt.textContent = PAGE_TITLES[page] || page;

  // Sync dengan bottom-nav mobile
  document.querySelectorAll(".bn-item").forEach((b) => {
    b.classList.toggle("active", b.dataset.page === page);
  });

  // Jalankan inisialisasi modul spesifik halaman
  if (page === "automation") renderAutomationView();
  
  if (page === "custom") {
    if (typeof renderCustomView === "function") renderCustomView();
    if (typeof syncCustomCameraMirror === "function") syncCustomCameraMirror();
  }
  
  if (page === "camera") {
    // Beri sedikit delay untuk memastikan DOM sudah siap
    setTimeout(() => {
      const c    = document.getElementById("cvOverlayCanvas");
      const cont = document.getElementById("cameraFocusContainer");
      if (c && cont) { c.width = cont.clientWidth; c.height = cont.clientHeight; }
      
      if (typeof cvUI !== "undefined") {
        if (typeof cvUI.initialize === "function") cvUI.initialize();
        if (typeof cvUI.renderAutomationSettings === "function") cvUI.renderAutomationSettings();
      }
    }, 150);
  }
  
  if (page === "analytics") updateLogDisplay();

  // Tutup sidebar otomatis di mobile setelah klik menu
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("overlay")?.classList.remove("show");
}

/**
 * Handle navigasi khusus untuk Bottom Navbar (Mobile).
 */
function switchPageMobile(page, btn) {
  const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
  switchPage(page, navItem);
}

/**
 * Toggle Sidebar menu pada perangkat mobile.
 */
function toggleSidebar() {
  document.getElementById("sidebar")?.classList.toggle("open");
  document.getElementById("overlay")?.classList.toggle("show");
}



