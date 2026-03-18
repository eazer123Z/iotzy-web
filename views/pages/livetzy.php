
      <!-- ════════════ LIVETZY FULLSCREEN ════════════ -->
      <div id="view-livetzy" class="view hidden">
        <div class="view-header">
          <div>
            <h2 class="view-title">
              <i class="fas fa-tv" style="color:var(--a); margin-right:8px"></i>LiveTzy Monitor
            </h2>
            <p class="view-sub">Kustomisasi layout bebas</p>
          </div>
          <div class="view-actions" style="gap:12px">
            <div class="livetzy-stat-pill" id="livetzyMqtt">
              <span class="mqtt-dot" id="livetzyMqttDot"></span>
              <span id="livetzyMqttText">Offline</span>
            </div>
            <div class="livetzy-stat-pill" id="livetzyPersonPill">
              <i class="fas fa-user" style="color:var(--a)"></i>
              <span id="livetzyPersonCount">0</span>
              <span style="opacity:.6">orang</span>
            </div>
            <div class="livetzy-stat-pill" id="livetzyBrightPill">
              <i class="fas fa-sun" style="color:var(--amber)"></i>
              <span id="livetzyBrightness">—</span>
            </div>
            <button class="btn-primary" id="btnEditLiveTzy" onclick="toggleLiveTzyEditMode()" style="padding:6px 14px; font-size:13px; height:36px">
              <i class="fas fa-pen"></i> <span class="hide-mobile">Edit Layout</span>
            </button>
            <button class="btn-primary hidden" id="btnAddWidgetLiveTzy" onclick="showLiveTzyWidgetModal()" style="padding:6px 14px; font-size:13px; background:var(--green); border-color:var(--green); height:36px">
              <i class="fas fa-plus"></i> <span class="hide-mobile">Widget</span>
            </button>
          </div>
        </div>

        <div class="livetzy-body" id="livetzyBody" style="padding:0">
          <div class="grid-stack" id="livetzyGrid">
            <!-- Rendered by JS -->
          </div>
          <div class="livetzy-empty" id="livetzyEmpty" style="display:none">
            <i class="fas fa-layer-group" style="font-size:32px;opacity:.2;margin-bottom:12px"></i>
            <div>Dashboard Kosong</div>
            <small style="color:var(--ink-5)">Klik Edit Layout lalu tambah widget baru</small>
          </div>
        </div>

        <!-- Add Widget Modal — Standardized to match other modals -->
        <div id="livetzyWidgetModal" class="modal-backdrop" style="z-index:10;">
          <div class="modal">
            <div class="modal-header">
              <h3><i class="fas fa-plus-circle" style="color:var(--a);margin-right:8px"></i>Tambah Widget</h3>
              <button class="modal-close" onclick="closeLiveTzyWidgetModal()"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-fields">
              <p class="modal-sub" style="margin-top:-10px; margin-bottom:16px">Pilih tipe widget dan item yang ingin ditambahkan ke dashboard LiveTzy.</p>
              <div class="field-group">
                <label>Tipe Widget</label>
                <select id="ltWidgetType" class="form-input form-select" onchange="updateLtWidgetOptions()">
                  <option value="device">🔌 Perangkat (Kipas, Lampu, dll)</option>
                  <option value="sensor">📡 Sensor</option>
                  <option value="camera">📷 Kamera & CV Monitor</option>
                </select>
              </div>
              <div class="field-group" id="ltWidgetIdField">
                <label>Pilih Item</label>
                <select id="ltWidgetId" class="form-input form-select"></select>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-ghost" onclick="closeLiveTzyWidgetModal()">Batal</button>
              <button class="btn-primary" onclick="addLiveTzyWidgetSubmit()"><i class="fas fa-plus" style="margin-right:6px"></i>Tambah Widget</button>
            </div>
          </div>
        </div>
      </div>

