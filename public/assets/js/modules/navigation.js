/* 
 * ==================================================================================
 * NAVIGATION & UI UTILITIES MODULE
 * ==================================================================================
 * Mengelola perpindahan halaman (SPA-style), Timer sistem, Jam, dan akses Kamera.
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
  livetzy:    "LiveTzy Monitor",
  admin:      "Admin Panel"
};

/**
 * Berpindah antar 'View' tanpa reload halaman (Single Page Application logic).
 */
function switchPage(page, el) {
  // Sembunyikan semua view
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  
  // Tampilkan view target
  const targetView = document.getElementById(`view-${page}`);
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
  if (page === "admin" && typeof loadAdminUsers === "function") loadAdminUsers();

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

/**
 * Helper untuk akses MediaDevices dengan kompabilitas legacy browser.
 */
async function getUserMediaCompat(constraints) {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    return await navigator.mediaDevices.getUserMedia(constraints);
  }
  const legacyGetMedia =
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.getUserMedia;
  if (legacyGetMedia) {
    return new Promise((resolve, reject) => {
      legacyGetMedia.call(navigator, constraints, resolve, reject);
    });
  }
  throw new Error("Kamera tidak didukung di sistem ini");
}

/**
 * Mendapatkan daftar kamera yang tersedia di perangkat.
 */
async function listCameraDevices() {
  try {
    // Minta izin kamera dulu agar label (nama kamera) terlihat
    const tempStream = await getUserMediaCompat({ video: true });
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      tempStream.getTracks().forEach((t) => t.stop());
      return [];
    }
    
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams    = devices.filter((d) => d.kind === "videoinput");
    STATE.camera.availableDevices = cams;
    
    // Matikan stream sementara
    tempStream.getTracks().forEach((t) => t.stop());
    return cams;
  } catch (err) {
    console.error("Gagal list kamera:", err);
    return [];
  }
}

/**
 * Menyalakan kamera berdasarkan Device ID yang dipilih atau default.
 */
async function startCamera() {
  try {
    // Matikan stream sebelumnya jika ada
    if (STATE.camera.stream) {
      STATE.camera.stream.getTracks().forEach((t) => t.stop());
    }
    
    let constraints;
    if (STATE.camera.selectedDeviceId) {
      constraints = { video: { deviceId: { exact: STATE.camera.selectedDeviceId } } };
    } else {
      // Default: Gunakan kamera belakang pada mobile jika tersedia
      constraints = { video: { facingMode: "environment" } };
    }
    
    const stream = await getUserMediaCompat(constraints);
    STATE.camera.stream = stream;
    STATE.camera.active = true;
    
    // Pasang stream ke elemen video UI
    updateCameraElements(true);
    return true;
  } catch (e) {
    console.error("Start Camera Error:", e);
    // Fallback: Tes dengan resolusi apapun tanpa constraint ketat
    try {
      const fallbackStream = await getUserMediaCompat({ video: true });
      STATE.camera.stream  = fallbackStream;
      STATE.camera.active  = true;
      updateCameraElements(true);
      return true;
    } catch (e2) {
      showToast("Gagal akses kamera: " + e2.message, "error");
      return false;
    }
  }
}

/**
 * Toggle ON/OFF kamera secara global.
 */
async function toggleCamera() {
  try {
    if (!STATE.camera.stream) {
      const success = await startCamera();
      if (success) showToast("Kamera aktif", "success");
    } else {
      STATE.camera.stream.getTracks().forEach((t) => t.stop());
      STATE.camera.stream = null;
      STATE.camera.active = false;
      updateCameraElements(false);
      showToast("Kamera dimatikan", "info");
    }
  } catch (e) {
    showToast("Error kamera: " + e.message, "error");
  }
}

/**
 * Membuka modal pemilihan sumber kamera (untuk perangkat dengan banyak lensa).
 */
function openCameraSelector() {
  const modal = document.getElementById("cameraSelectorModal");
  const list  = document.getElementById("cameraDevicesList");
  if (!modal || !list) return;

  modal.classList.add("show");
  list.innerHTML = "<div class='modal-loading'><i class='fas fa-spinner fa-spin'></i> Mencari Kamera...</div>";

  listCameraDevices().then((devs) => {
    list.innerHTML = "";
    if (devs.length === 0) {
      const btn = document.createElement("button");
      btn.className = "modal-item";
      btn.innerHTML = `<i class="fas fa-camera"></i> Gunakan Kamera Utama`;
      btn.onclick   = () => { STATE.camera.selectedDeviceId = null; closeCameraSelector(); startCamera(); };
      list.appendChild(btn);
      return;
    }
    
    devs.forEach((dev, idx) => {
      const btn = document.createElement("button");
      btn.className = "modal-item" + (dev.deviceId === STATE.camera.selectedDeviceId ? " selected" : "");
      btn.innerHTML = `<i class="fas fa-camera"></i> ${dev.label || "Kamera " + (idx + 1)}`;
      btn.onclick   = () => {
        STATE.camera.selectedDeviceId = dev.deviceId;
        closeCameraSelector();
        if (STATE.camera.active) startCamera();
        else showToast("Kamera dipilih", "info");
      };
      list.appendChild(btn);
    });
  });
}

function closeCameraSelector() {
  document.getElementById("cameraSelectorModal")?.classList.remove("show");
}

/**
 * Memperbarui source video pada semua elemen video UI (Dashboard & Focus view).
 */
function updateCameraElements(isActive) {
  const targets = [
    { v: "camera",      p: "camPlaceholder",          b: "camTag"          },
    { v: "cameraFocus", p: "cameraFocusPlaceholder",  b: "cameraFocusTag" },
  ];
  
  targets.forEach(({ v, p, b }) => {
    const vid = document.getElementById(v);
    const ph  = document.getElementById(p);
    const tag = document.getElementById(b);
    
    if (!vid || !ph) return;
    
    if (isActive && STATE.camera.stream) {
      vid.srcObject = STATE.camera.stream;
      vid.classList.remove("hidden");
      ph.style.display = "none";
      if (tag) tag.classList.remove("hidden");
      vid.play().catch((err) => console.log("Video play interrupted:", err));
    } else {
      vid.srcObject   = null;
      vid.classList.add("hidden");
      ph.style.display = "";
      if (tag) tag.classList.add("hidden");
    }
  });
}


