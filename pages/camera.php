<div id="camera" class="view app-section hidden">
  <div class="view-header">
    <div class="v-title">
      <h3><i class="fas fa-eye"></i> Computer Vision</h3>
      <p>Deteksi objek & analisis pencahayaan real-time berbasis Computer Vision.</p>
    </div>
  </div>

  <div class="camera-layout">
    <div class="camera-panel">
      
      <div class="camera-controls-top" style="display:flex; gap:10px; margin-bottom:16px; align-items:center; flex-wrap:wrap">
        <select id="cameraSelect" class="form-select" onchange="switchCamera(this.value)" style="flex:1 1 260px; min-width:220px; padding:8px 14px; border-radius:8px; border:1px solid var(--border); background:var(--bg); color:var(--text)">
          <option value="">Memuat daftar kamera...</option>
        </select>
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
          <i class="fas fa-stop"></i> Stop Deteksi
        </button>
      </div>

      <div class="camera-feed" id="cameraFocusContainer">
        <video id="cameraFocus" autoplay playsinline muted style="display:none"></video>
        <canvas id="cvOverlayCanvas" style="display:none"></canvas>
        <i id="cameraFocusTag" class="fas fa-video-slash" style="font-size:2rem;opacity:.3"></i>
        <span id="cameraFocusPlaceholder" style="font-size:.85rem">Kamera belum aktif</span>
      </div>
      
    </div>

    <div class="cv-stats-panel">
      <div class="cv-stat-grid">
        <div class="cv-stat-card">
          <div class="cv-stat-icon" style="color:var(--accent)"><i class="fas fa-users"></i></div>
          <div class="cv-stat-value" id="cvPersonCount">0</div>
          <div class="cv-stat-label">Orang</div>
        </div>
        <div class="cv-stat-card">
          <div class="cv-stat-icon" style="color:var(--warning)"><i class="fas fa-sun"></i></div>
          <div class="cv-stat-value" id="cvBrightness">0%</div>
          <div class="cv-stat-label">Cahaya</div>
        </div>
        <div class="cv-stat-card">
          <div class="cv-stat-icon" style="color:var(--info)"><i class="fas fa-lightbulb"></i></div>
          <div class="cv-stat-value" id="cvLightCondition">—</div>
          <div class="cv-stat-label">Kondisi</div>
        </div>
        <div class="cv-stat-card">
          <div class="cv-stat-icon" style="color:var(--success)"><i class="fas fa-microchip"></i></div>
          <div class="cv-stat-value" id="cvModelStatus">Idle</div>
          <div class="cv-stat-label">AI Status</div>
        </div>
      </div>
      <div class="cv-stat-card" style="flex-direction:row; justify-content:space-between; padding:10px 20px">
        <div style="display:flex; align-items:center; gap:10px">
          <div class="cv-stat-icon" style="color:var(--text-muted); margin:0"><i class="fas fa-gauge"></i></div>
          <div class="cv-stat-label" style="margin:0">Frame Per Second</div>
        </div>
        <div class="cv-stat-value" id="cvFPS" style="font-size:1rem">0</div>
      </div>

      <div class="card" style="margin-top:4px">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-sliders"></i> CV Automation</span>
        </div>
        <div class="card-body" id="cvAutomationSettings">
          <p class="muted" style="font-size:.82rem">Pengaturan otomasi CV akan muncul saat kamera aktif.</p>
        </div>
      </div>
    </div>
  </div>
</div>
