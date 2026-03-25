<div id="camera" class="view app-section">
  <div class="view-header">
    <div class="v-title">
      <h3><i class="fas fa-video"></i> AI Vision Center</h3>
      <p>Monitoring cerdas dan deteksi objek real-time dengan Visual Intelligence.</p>
    </div>
    <div class="v-actions">
      <span id="cvLiveBadge" class="cv-live-badge hidden">LIVE</span>
      <button class="btn-primary" id="cvPowerBtn" onclick="toggleCameraFocus()">
        <i class="fas fa-power-off"></i> <span id="cvPowerText">Aktifkan Vision</span>
      </button>
    </div>
  </div>

  <div class="cv-layout">
    <div class="cv-left-col">
      <div class="cv-cam-card">
        <div class="cv-cam-body" id="cameraFocusContainer">
          <video id="cameraFocus" autoplay playsinline muted class="camera-video-focus hidden"></video>
          <div id="cvCamPlaceholder" class="cv-cam-placeholder">
            <div class="cv-placeholder-icon"><i class="fas fa-video-slash"></i></div>
            <div class="cv-placeholder-txt">Visual Intelligence Offline</div>
            <button class="btn-primary" onclick="toggleCameraFocus()" style="margin-top:10px">Aktifkan Vision</button>
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
        <div class="cv-info-card glass">
          <div class="cv-info-head"><i class="fas fa-microchip"></i> System Status</div>
          <div class="cv-info-body">
            <div class="status-row"><span>Engine TF.js</span><span class="status-val ok" id="cvSystemStatus">Siap</span></div>
            <div class="status-row"><span>Presence</span><span class="status-val muted" id="cvPresenceStatus">Tidak Terdeteksi</span></div>
          </div>
        </div>
        <div class="cv-info-card glass">
          <div class="cv-info-head"><i class="fas fa-sun"></i> Light Analysis</div>
          <div class="cv-info-body">
            <div class="cv-light-bar-bg"><div class="cv-light-bar-fill" id="cvBrightnessBar" style="width:0%"></div></div>
            <div class="status-row"><span>Luminosity</span><span class="status-val" id="cvBrightnessLabel">0%</span></div>
          </div>
        </div>
      </div>
    </div>

    <div class="cv-right-col">
      <div class="card glass">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-wand-magic-sparkles"></i> Vision Rules</span>
        </div>
        <div class="card-body" id="cvAutomationSettings">
          <div class="cv-loading-placeholder">
            <i class="fas fa-circle-notch fa-spin"></i> Memuat konfigurasi...
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
