
      <!-- ════════════ DASHBOARD ════════════ -->
      <div id="view-dashboard" class="view">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon green"><i class="fas fa-plug"></i></div>
            <div class="stat-body">
              <div class="stat-value" id="statActiveDevicesVal">0</div>
              <div class="stat-label">Perangkat Aktif</div>
              <div class="stat-sub" id="statActiveDevicesSub">dari 0</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon sky"><i class="fas fa-signal"></i></div>
            <div class="stat-body">
              <div class="stat-value" id="statSensorsOnlineVal">0</div>
              <div class="stat-label">Sensor Online</div>
              <div class="stat-sub" id="statSensorsOnlineSub">dari 0</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon amber"><i class="fas fa-wifi"></i></div>
            <div class="stat-body">
              <div class="stat-value" id="statMqttVal">—</div>
              <div class="stat-label">MQTT Broker</div>
              <div class="stat-sub" id="statMqttSub">tidak terhubung</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon purple"><i class="fas fa-clock"></i></div>
            <div class="stat-body">
              <div class="stat-value" id="statUptimeVal">0d</div>
              <div class="stat-label">Sesi Aktif</div>
              <div class="stat-sub">sejak login</div>
            </div>
          </div>
        </div>

        <div class="dashboard-main">
          <div class="camera-card">
            <div class="camera-header">
              <span class="card-title"><i class="fas fa-video" style="color:var(--a)"></i> Live Feed</span>
              <div style="display:flex;gap:8px;align-items:center">
                <span id="camTag" class="live-badge hidden"><i class="fas fa-circle"></i> LIVE</span>
                <button onclick="openCameraSelector()" class="icon-btn" title="Pilih kamera"><i class="fas fa-camera-rotate"></i></button>
                <button onclick="toggleCamera()" class="icon-btn" title="Toggle kamera"><i class="fas fa-power-off"></i></button>
              </div>
            </div>
            <div class="camera-body">
              <video id="camera" autoplay playsinline muted class="camera-video hidden"></video>
              <div id="camPlaceholder" class="camera-placeholder">
                <i class="fas fa-video-slash"></i>
                <span>Kamera Offline</span>
                <small>Klik power untuk mengaktifkan</small>
              </div>
            </div>
          </div>
          <div class="quick-card">
            <div class="quick-header">
              <span class="card-title"><i class="fas fa-bolt" style="color:var(--amber)"></i> Kontrol Cepat</span>
              <button onclick="openQuickControlSettings()" class="icon-btn" title="Pilih perangkat"><i class="fas fa-pen-to-square"></i></button>
            </div>
            <div id="quickControlsContainer" class="quick-body"></div>
          </div>
        </div>
      </div>
