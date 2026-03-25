<div id="camera" class="view app-section">
  <div class="camera-main-layout">
    <div class="cv-left-col">
      <div class="cv-camera-card">
        <div class="cv-cam-header">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="cv-cam-icon"><i class="fas fa-video"></i></div>
            <div>
              <div class="cv-cam-title">Vision Center</div>
              <div class="cv-cam-sub" id="cvCamSubText">Kamera tidak aktif</div>
            </div>
          </div>
          <div class="cv-cam-actions">
            <span id="cvLiveBadge" class="cv-live-badge hidden">LIVE</span>
            <button class="cv-pow-btn" id="cvPowerBtn" onclick="toggleCameraFocus()"><i class="fas fa-power-off"></i></button>
          </div>
        </div>
        <div class="cv-cam-body" id="cameraFocusContainer">
          <video id="cameraFocus" autoplay playsinline muted class="camera-video-focus hidden"></video>
          <div id="cvCamPlaceholder" class="cv-cam-placeholder">
            <div class="cv-placeholder-icon"><i class="fas fa-video-slash"></i></div>
            <div class="cv-placeholder-txt">Visual Intelligence Offline</div>
            <button class="btn-primary" onclick="toggleCameraFocus()">Aktifkan Vision</button>
          </div>
          <div id="cvLoadingStatus" class="cv-loading-overlay hidden">
            <i class="fas fa-spinner fa-spin"></i> Memuat AI Model...
          </div>
        </div>
        <div class="cv-cam-footer">
          <div class="cv-stat-item">
            <span class="cv-stat-label">Human Count</span>
            <span class="cv-stat-val" id="cvHumanCount">0</span>
          </div>
          <div class="cv-stat-item">
            <span class="cv-stat-label">Confidence</span>
            <span class="cv-stat-val" id="cvConfidence">0%</span>
          </div>
          <div class="cv-stat-item">
            <span class="cv-stat-label">Brightness</span>
            <span class="cv-stat-val" id="cvBrightness">0%</span>
          </div>
          <div class="cv-stat-item">
            <span class="cv-stat-label">Condition</span>
            <span class="cv-stat-val" id="cvLightCondition">N/A</span>
          </div>
        </div>
      </div>
      <div class="cv-info-grid">
        <div class="cv-info-card">
          <div class="cv-info-head">
            <i class="fas fa-microchip"></i>
            <span>System Status</span>
          </div>
          <div class="cv-info-body">
            <div class="status-row">
              <span>Engine TF.js</span>
              <span class="status-val ok" id="cvSystemStatus">Siap</span>
            </div>
            <div class="status-row">
              <span>Presence</span>
              <span class="status-val muted" id="cvPresenceStatus">Tidak Terdeteksi</span>
            </div>
          </div>
        </div>
        <div class="cv-info-card">
          <div class="cv-info-head">
            <i class="fas fa-sun"></i>
            <span>Light Analysis</span>
          </div>
          <div class="cv-info-body">
            <div class="cv-light-bar-bg">
              <div class="cv-light-bar-fill" id="cvBrightnessBar" style="width:0%"></div>
            </div>
            <div class="status-row" style="margin-top:8px">
              <span>Luminosity</span>
              <span class="status-val" id="cvBrightnessLabel">0%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="cv-right-col">
      <div class="cv-settings-card">
        <div class="cv-settings-header">
          <i class="fas fa-wand-magic-sparkles"></i>
          <span>CV Automation Rules</span>
        </div>
        <div class="cv-settings-body" id="cvAutomationSettings">
          <div class="cv-loading-placeholder">
            <i class="fas fa-circle-notch fa-spin"></i>
            Memuat konfigurasi...
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
