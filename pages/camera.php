<div id="camera" class="view app-section hidden">
  <div class="view-header">
    <div class="v-title">
      <h3><i class="fas fa-eye"></i> Computer Vision</h3>
      <p>Deteksi orang dan cahaya dari kamera.</p>
    </div>
  </div>

  <div class="camera-layout">
    <div class="camera-panel">
      <div class="cv-panel-head">
        <div>
          <div class="cv-panel-kicker">Realtime Browser Camera</div>
          <h4 class="cv-panel-title">Monitor Frame, Deteksi Orang, dan Cahaya</h4>
          <p class="cv-panel-subtitle">Pilih kamera, nyalakan stream, lalu aktifkan deteksi AI saat Anda siap.</p>
        </div>
        <div class="cv-status-rail">
          <span id="cvModelBadge" class="cv-status-badge idle">Idle</span>
          <span id="cvSystemStatus" class="status-val muted">Tidak Aktif</span>
          <span id="cvLoadingStatus" class="cv-inline-loading hidden">
            <i class="fas fa-spinner fa-spin"></i> Memuat model...
          </span>
        </div>
      </div>

      <div class="camera-controls-top cv-control-bar">
        <div class="cv-control-select">
          <label class="cv-toolbar-label" for="cameraSelect">Sumber Kamera</label>
          <select id="cameraSelect" class="form-select" onchange="switchCamera(this.value)">
            <option value="">Memuat daftar kamera...</option>
          </select>
          <div id="cvSessionMeta" class="cv-session-meta">Pilih kamera browser ini atau source device lain pada akun yang sama.</div>
        </div>
        <div class="cv-control-actions">
          <button id="btnStartCam" class="btn-primary btn-sm" onclick="startCamera()">
            <i class="fas fa-play"></i> Mulai Kamera
          </button>
          <button id="btnStopCam" class="btn-secondary btn-sm" onclick="stopCamera()" style="display:none">
            <i class="fas fa-stop"></i> Stop Kamera
          </button>
          <button id="btnStartCV" class="btn-secondary btn-sm" onclick="startDetection()" style="display:none">
            <i class="fas fa-brain"></i> Mulai Deteksi AI
          </button>
          <button id="btnStopCV" class="btn-danger btn-sm" onclick="stopDetection()" style="display:none">
            <i class="fas fa-square"></i> Stop Deteksi
          </button>
        </div>
      </div>

      <div class="cv-camera-stage">
        <div class="camera-feed" id="cameraFocusContainer">
          <video id="cameraFocus" autoplay playsinline muted style="display:none"></video>
          <canvas id="cvOverlayCanvas" style="display:none"></canvas>
          <div class="cv-camera-empty">
            <i id="cameraFocusTag" class="fas fa-video-slash"></i>
            <span id="cameraFocusPlaceholder">Kamera belum aktif</span>
            <small>Nyalakan kamera untuk mulai memantau frame.</small>
          </div>

          <div id="cvDetectionInfo" class="cv-detection-hud" style="display:none">
            <div class="cv-hud-chip">
              <span class="cv-hud-label">Presensi</span>
              <span id="cvPresenceStatus" class="status-val muted">Tidak Terdeteksi</span>
            </div>
            <div class="cv-hud-chip">
              <span class="cv-hud-label">Akurasi</span>
              <span id="cvConfidence" class="cv-hud-value">0%</span>
            </div>
            <div class="cv-hud-chip cv-hud-chip-meter">
              <span class="cv-hud-label">Cahaya</span>
              <div class="cv-light-meter">
                <div id="cvBrightnessBar" class="cv-light-meter-fill"></div>
              </div>
              <span id="cvBrightnessLabel" class="cv-hud-value">0%</span>
            </div>
          </div>
        </div>

        <div class="cv-stage-note">
          <i class="fas fa-circle-info"></i>
          Hasil paling stabil didapat saat wajah atau tubuh berada di tengah frame dan pencahayaan tidak terlalu backlight.
        </div>
      </div>

    </div>

    <div class="cv-stats-panel">
      <div class="cv-summary-card">
        <div class="cv-summary-head">
          <div>
            <div class="cv-panel-kicker">Insight Real-time</div>
            <h4 class="cv-summary-title">Ringkasan Deteksi</h4>
          </div>
          <span class="cv-summary-chip">Browser + AI Lokal</span>
        </div>

        <div class="cv-stat-grid">
          <div class="cv-stat-card">
            <div class="cv-stat-icon cv-accent"><i class="fas fa-users"></i></div>
            <div class="cv-stat-value" id="cvPersonCount">0</div>
            <div class="cv-stat-label">Orang</div>
            <div class="cv-stat-sub">Jumlah yang sedang terdeteksi</div>
          </div>
          <div class="cv-stat-card">
            <div class="cv-stat-icon cv-amber"><i class="fas fa-sun"></i></div>
            <div class="cv-stat-value" id="cvBrightness">0%</div>
            <div class="cv-stat-label">Cahaya</div>
            <div class="cv-stat-sub">Intensitas frame saat ini</div>
          </div>
          <div class="cv-stat-card">
            <div class="cv-stat-icon cv-blue"><i class="fas fa-lightbulb"></i></div>
            <div class="cv-stat-value" id="cvLightCondition">—</div>
            <div class="cv-stat-label">Kondisi</div>
            <div class="cv-stat-sub">Klasifikasi terang atau gelap</div>
          </div>
          <div class="cv-stat-card">
            <div class="cv-stat-icon cv-green"><i class="fas fa-microchip"></i></div>
            <div class="cv-stat-value" id="cvModelStatus">Idle</div>
            <div class="cv-stat-label">AI Status</div>
            <div class="cv-stat-sub">Status model dan backend aktif</div>
          </div>
        </div>

        <div class="cv-perf-card">
          <div class="cv-perf-meta">
            <div class="cv-stat-icon cv-muted"><i class="fas fa-gauge"></i></div>
            <div>
              <div class="cv-perf-title" id="cvPerfLabel" title="Laju inferensi model AI per detik, bukan FPS video kamera">AI Deteksi / Detik</div>
              <div class="cv-perf-sub">Menggambarkan seberapa cepat model menganalisis frame</div>
            </div>
          </div>
          <div class="cv-perf-value" id="cvFPS">0</div>
        </div>
      </div>

      <div class="card cv-automation-card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-sliders"></i> CV Automation</span>
          <span class="cv-summary-chip">Rule Engine</span>
        </div>
        <div class="card-body" id="cvAutomationSettings">
          <p class="muted cv-automation-empty">Pengaturan otomasi CV akan muncul saat kamera aktif.</p>
        </div>
      </div>
    </div>
  </div>
</div>
