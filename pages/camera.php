
      <!-- ════════════ CAMERA / CV ════════════ -->
      <div id="view-camera" class="view hidden">
        <div class="view-header">
          <div>
            <h2 class="view-title">Kamera &amp; Computer Vision</h2>
            <p class="view-sub">Deteksi objek real-time · Analisis cahaya · Automasi berbasis kamera</p>
          </div>
        </div>
        <div class="camera-layout">
          <div class="camera-main-col">
            <div class="camera-card">
              <div class="camera-header">
                <span class="card-title">Monitor Live</span>
                <div style="display:flex;gap:8px;align-items:center">
                  <span id="cameraFocusTag" class="live-badge hidden"><i class="fas fa-circle"></i> LIVE</span>
                  <span id="cvLoadingStatus" class="loading-badge hidden"><i class="fas fa-spinner fa-spin"></i> Memuat model…</span>
                  <button onclick="openCameraSelector()" class="icon-btn" title="Pilih kamera"><i class="fas fa-camera-rotate"></i></button>
                  <button onclick="toggleCameraFocus()" class="icon-btn" title="Nyala/Mati"><i class="fas fa-power-off"></i></button>
                </div>
              </div>
              <div class="camera-body" id="cameraFocusContainer" style="position:relative;aspect-ratio:16/9">
                <video id="cameraFocus" autoplay playsinline muted class="camera-video hidden"></video>
                <div id="cameraFocusPlaceholder" class="camera-placeholder">
                  <i class="fas fa-video-slash"></i>
                  <span>Kamera Offline</span>
                  <small>Klik tombol power untuk mengaktifkan</small>
                </div>
                <canvas id="cvOverlayCanvas" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10"></canvas>
                <div id="cvDetectionInfo" class="cv-hud" style="display:none">
                  <div class="hud-item hud-person-count">
                    <i class="fas fa-user"></i>
                    <span id="cvHumanCount">0</span>
                    <span style="font-size:10px;opacity:.8"> orang</span>
                  </div>
                  <div class="hud-item"><i class="fas fa-sun"></i> <span id="cvBrightness">—</span></div>
                  <div class="hud-item"><i class="fas fa-crosshairs"></i> <span id="cvConfidence">—</span></div>
                  <div class="hud-item"><i class="fas fa-tachometer-alt"></i> <span id="cvFpsStatus">—</span></div>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <span class="card-title"><i class="fas fa-robot" style="color:var(--a)"></i> Automasi CV</span>
                <button onclick="if(typeof cvUI!=='undefined')cvUI.renderAutomationSettings()" class="icon-btn" title="Refresh"><i class="fas fa-refresh"></i></button>
              </div>
              <div id="cvAutomationSettings" class="card-body">
                <p style="color:var(--ink-4);font-size:12px;text-align:center;padding:24px">
                  <i class="fas fa-brain" style="display:block;font-size:24px;margin-bottom:10px;opacity:.3"></i>
                  Load model CV terlebih dahulu untuk mengaktifkan automasi
                </p>
              </div>
            </div>
          </div>

          <div class="camera-side-col">
            <div class="card">
              <div class="card-header">
                <span class="card-title"><i class="fas fa-users" style="color:var(--a)"></i> Jumlah Orang</span>
                <span id="cvModelBadge" class="cv-status-badge idle">Idle</span>
              </div>
              <div class="card-body">
                <div class="person-count-display">
                  <div class="person-count-big" id="cvPersonCountBig">0</div>
                  <div class="person-count-label">ORANG TERDETEKSI</div>
                </div>
                <div class="status-list">
                  <div class="status-row"><span class="status-key">Status Model</span><span id="cvSystemStatus" class="status-val muted">Belum dimuat</span></div>
                  <div class="status-row"><span class="status-key">Deteksi</span><span id="cvPresenceStatus" class="status-val muted">—</span></div>
                  <div class="status-row"><span class="status-key">Cahaya</span><span id="cvLightCondition" class="status-val muted">—</span></div>
                  <div class="status-row"><span class="status-key">FPS</span><span id="cvFpsStatus2" class="status-val muted">—</span></div>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-header"><span class="card-title"><i class="fas fa-sun" style="color:var(--amber)"></i> Kecerahan</span></div>
              <div class="card-body">
                <div class="brightness-display"><span id="cvBrightnessLabel" class="brightness-val">—</span></div>
                <div class="progress-track"><div id="cvBrightnessBar" class="progress-fill brightness-bar" style="width:0%"></div></div>
                <div class="progress-labels"><span>Gelap</span><span>Terang</span></div>
              </div>
            </div>

            <div class="card">
              <div class="card-header"><span class="card-title"><i class="fas fa-gamepad" style="color:var(--purple)"></i> Kontrol CV</span></div>
              <div class="card-body cv-controls">
                <button id="btnLoadModel" onclick="initializeCV()" class="btn-cv blue">
                  <i class="fas fa-brain"></i> Load Model COCO-SSD
                </button>
                <button id="btnStartCV" onclick="startCVDetection()" class="btn-cv green" disabled>
                  <i class="fas fa-play"></i> Mulai Deteksi
                </button>
                <button id="btnStopCV" onclick="stopCVDetection()" class="btn-cv red" disabled>
                  <i class="fas fa-stop"></i> Stop Deteksi
                </button>
              </div>
            </div>

            <div class="card">
              <div class="card-header"><span class="card-title">Pengaturan CV</span></div>
              <div class="card-body settings-body">
                <div class="setting-toggle-row">
                  <div><div class="setting-label">Bounding Box</div></div>
                  <label class="toggle-wrapper">
                    <input type="checkbox" id="cvShowBoundingBoxCamera" checked onchange="toggleBoundingBox(this.checked)" class="toggle-input">
                    <span class="toggle-track"></span>
                  </label>
                </div>
                <div class="setting-toggle-row">
                  <div><div class="setting-label">Debug Overlay</div></div>
                  <label class="toggle-wrapper">
                    <input type="checkbox" id="cvShowDebugInfoCamera" checked onchange="toggleDebugInfo(this.checked)" class="toggle-input">
                    <span class="toggle-track"></span>
                  </label>
                </div>
                <div class="field-group">
                  <label>Min. Confidence</label>
                  <div class="field-input-group">
                    <input type="number" id="cvConfidenceThreshold" value="60" min="10" max="99" class="field-input" onchange="updateCVConfig(this.value)">
                    <span class="field-unit">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
