<nav class="bottom-nav">
  <button class="bn-item active" data-page="dashboard" onclick="switchPageMobile('dashboard', this)">
    <i class="fas fa-house"></i>
    <span>Home</span>
  </button>
  <button class="bn-item" data-page="devices" onclick="switchPageMobile('devices', this)">
    <i class="fas fa-plug"></i>
    <span>Device</span>
  </button>
  <button class="bn-item" data-page="sensors" onclick="switchPageMobile('sensors', this)">
    <i class="fas fa-signal"></i>
    <span>Sensor</span>
  </button>
  <button class="bn-item" data-page="camera" onclick="switchPageMobile('camera', this)">
    <i class="fas fa-eye"></i>
    <span>Kamera</span>
  </button>
  <button class="bn-item bn-item-more" data-page="more" onclick="toggleMobileHub()">
    <i class="fas fa-ellipsis"></i>
    <span>Menu</span>
  </button>
</nav>

<div id="mobileNavOverlay" class="mobile-nav-overlay" onclick="closeMobileHub()"></div>
<div id="mobileNavHub" class="mobile-nav-hub" aria-hidden="true">
  <div class="mobile-nav-hub-header">
    <div>
      <div class="mobile-nav-title">Menu Lainnya</div>
      <p class="mobile-nav-subtitle">Akses halaman tambahan.</p>
    </div>
    <button class="icon-btn mobile-nav-close" type="button" onclick="closeMobileHub()" title="Tutup menu">
      <i class="fas fa-times"></i>
    </button>
  </div>

  <div class="mobile-nav-section">
    <div class="mobile-nav-section-label">Dashboard IoT</div>
    <div class="mobile-nav-grid">
      <button class="mobile-nav-link" data-page="automation" onclick="switchPageMobile('automation', this); closeMobileHub();">
        <i class="fas fa-robot"></i>
        <span>Rules Engine</span>
      </button>
    </div>
  </div>

  <div class="mobile-nav-section">
    <div class="mobile-nav-section-label">Halaman Informasi</div>
    <div class="mobile-nav-grid">
      <button class="mobile-nav-link" data-page="analytics" onclick="switchPageMobile('analytics', this); closeMobileHub();">
        <i class="fas fa-chart-bar"></i>
        <span>Log & Analitik</span>
      </button>
      <button class="mobile-nav-link" data-page="settings" onclick="switchPageMobile('settings', this); closeMobileHub();">
        <i class="fas fa-gear"></i>
        <span>Pengaturan</span>
      </button>
    </div>
  </div>
</div>
