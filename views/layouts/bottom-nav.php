<?php

?>
    </div><!-- /page-wrapper -->
  </main>

  <!-- ═══ BOTTOM NAV (MOBILE) ═══ -->
  <nav class="bottom-nav" id="bottomNav">
    <div class="bottom-nav-inner">
      <button class="bn-item active" onclick="switchPageMobile('dashboard', this)" data-page="dashboard">
        <div class="bn-icon"><i class="fas fa-house"></i></div>
        <span class="bn-label">Overview</span>
      </button>
      <button class="bn-item" onclick="switchPageMobile('devices', this)" data-page="devices">
        <div class="bn-icon"><i class="fas fa-microchip"></i></div>
        <span class="bn-label">Perangkat</span>
      </button>
      <button class="bn-item" onclick="switchPageMobile('sensors', this)" data-page="sensors">
        <div class="bn-icon"><i class="fas fa-signal"></i></div>
        <span class="bn-label">Sensor</span>
      </button>
      <button class="bn-item" onclick="switchPageMobile('automation', this)" data-page="automation">
        <div class="bn-icon"><i class="fas fa-sliders"></i></div>
        <span class="bn-label">Otomasi</span>
      </button>

      <button class="bn-item" onclick="switchPageMobile('camera', this)" data-page="camera">
        <div class="bn-icon"><i class="fas fa-video"></i></div>
        <span class="bn-label">Kamera</span>
      </button>
      <button class="bn-item" onclick="switchPageMobile('settings', this)" data-page="settings">
        <div class="bn-icon"><i class="fas fa-gear"></i></div>
        <span class="bn-label">Setting</span>
      </button>
    </div>
  </nav>

</div><!-- /app-shell -->
