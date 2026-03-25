<?php ?>
<div id="quickControlModal" class="modal-backdrop">
  <div class="modal">
    <div class="modal-header">
      <h3>Atur Kontrol Cepat</h3>
      <button onclick="closeQuickControlSettings()" class="modal-close"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-fields">
      <p class="modal-sub">Pilih hingga 4 perangkat untuk akses cepat di Dashboard.</p>
      <div id="quickControlDevicesList" class="modal-list qc-picker-grid"></div>
    </div>
    <div class="modal-footer">
      <button onclick="closeQuickControlSettings()" class="btn-ghost">Batal</button>
      <button onclick="saveQuickControlSettings()" class="btn-primary">Simpan</button>
    </div>
  </div>
</div>

<div id="cameraSelectorModal" class="modal-backdrop">
  <div class="modal">
    <div class="modal-header">
      <h3>Pilih Kamera</h3>
      <button onclick="closeCameraSelector()" class="modal-close"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-fields">
      <div id="cameraDevicesList" class="modal-list">
        <p class="modal-loading"><i class="fas fa-spinner fa-spin"></i> Memuat daftar kamera…</p>
      </div>
    </div>
    <div class="modal-footer">
      <button onclick="closeCameraSelector()" class="btn-primary">Selesai</button>
    </div>
  </div>
</div>

<div id="topicModal" class="modal-backdrop">
  <div class="modal">
    <div class="modal-header">
      <h3>Konfigurasi — <span id="topicDeviceName"></span></h3>
      <button onclick="closeTopicSettings()" class="modal-close"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-fields">
      <div class="field-row-2">
        <div class="field-group"><label>Nama Perangkat</label><input type="text" id="editDeviceName" class="form-input"></div>
        <div class="field-group">
          <label>Icon</label>
          <select id="editDeviceIcon" class="form-input form-select">
            <option value="fa-lightbulb">💡 Lampu</option>
            <option value="fa-wind">🌀 Kipas</option>
            <option value="fa-snowflake">❄️ AC</option>
            <option value="fa-tv">📺 TV</option>
            <option value="fa-lock">🔒 Kunci</option>
            <option value="fa-video">📹 CCTV</option>
            <option value="fa-plug">🔌 Plug</option>
          </select>
        </div>
      </div>
      <div class="field-group"><label>Subscribe Topic</label><input type="text" id="deviceTopicSub" class="form-input"></div>
      <div class="field-group"><label>Publish Topic</label><input type="text" id="deviceTopicPub" class="form-input"></div>
    </div>
    <div class="modal-footer">
      <button onclick="closeTopicSettings()" class="btn-ghost">Batal</button>
      <button onclick="saveDeviceSettings()" class="btn-primary">Simpan</button>
    </div>
  </div>
</div>

<div id="addDeviceModal" class="modal-backdrop">
  <div class="modal">
    <div class="modal-header">
      <h3>Tambah Perangkat</h3>
      <button onclick="closeAddDeviceModal()" class="modal-close"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-fields">
      <div class="field-group"><label>Nama Perangkat</label><input type="text" id="newDeviceName" class="form-input" placeholder="Lamp Utama"></div>
      <div class="field-group">
        <label>Jenis</label>
        <select id="newDeviceIcon" class="form-input form-select">
          <option value="fa-lightbulb">💡 Lampu</option>
          <option value="fa-wind">🌀 Kipas</option>
          <option value="fa-snowflake">❄️ AC</option>
          <option value="fa-lock">🔒 Kunci</option>
          <option value="fa-video">📹 CCTV</option>
          <option value="fa-plug">🔌 Plug</option>
        </select>
      </div>
      <div class="field-group"><label>Topic MQTT</label><input type="text" id="newDeviceTopicPub" class="form-input" placeholder="iotzy/device/xxx"></div>
    </div>
    <div class="modal-footer">
      <button onclick="closeAddDeviceModal()" class="btn-ghost">Batal</button>
      <button onclick="saveNewDevice()" class="btn-primary">Tambah</button>
    </div>
  </div>
</div>

<div id="addSensorModal" class="modal-backdrop">
  <div class="modal">
    <div class="modal-header">
      <h3>Tambah Sensor</h3>
      <button onclick="closeAddSensorModal()" class="modal-close"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-fields">
      <div class="field-group"><label>Nama Sensor</label><input type="text" id="newSensorName" class="form-input"></div>
      <div class="field-row-2">
        <div class="field-group"><label>Tipe</label><select id="newSensorType" class="form-input form-select"><option value="temperature">🌡️ Suhu</option><option value="humidity">💧 Lembab</option></select></div>
        <div class="field-group"><label>Satuan</label><input type="text" id="newSensorUnit" class="form-input" placeholder="°C"></div>
      </div>
      <div class="field-group"><label>Topic MQTT</label><input type="text" id="newSensorTopic" class="form-input"></div>
    </div>
    <div class="modal-footer">
      <button onclick="closeAddSensorModal()" class="btn-ghost">Batal</button>
      <button onclick="saveNewSensor()" class="btn-primary">Tambah</button>
    </div>
  </div>
</div>

<div id="mqttConfigModal" class="modal-backdrop">
  <div class="modal">
    <div class="modal-header">
      <h3>Konfigurasi MQTT</h3>
      <button onclick="closeMQTTConfigModal()" class="modal-close"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-fields">
      <div class="field-group"><label>Broker URL</label><input type="text" id="mqttBroker" class="form-input"></div>
      <div class="field-row-2">
        <div class="field-group"><label>Port</label><input type="number" id="mqttPort" class="form-input"></div>
        <div class="field-group" style="padding-top:28px">
          <label class="toggle-label-row">
            <span>SSL/TLS</span>
            <label class="toggle-wrapper">
              <input type="checkbox" id="mqttUseSSL" class="toggle-input">
              <span class="toggle-track"></span>
            </label>
          </label>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button onclick="closeMQTTConfigModal()" class="btn-ghost">Batal</button>
      <button onclick="saveMQTTConfig()" class="btn-primary">Hubungkan</button>
    </div>
  </div>
</div>


<div id="addRuleModal" class="modal-backdrop">
  <div class="modal">
    <div class="modal-header">
      <h3>Tambah Otomasi</h3>
      <button onclick="closeAddRuleModal()" class="modal-close"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-fields">
      <!-- Sensor info row (disembunyikan untuk mode device/jadwal) -->
      <div class="field-group" style="background:var(--surface-2);border-radius:var(--r);padding:10px 12px;margin-bottom:4px;">
        <label>Sensor</label>
        <div style="display:flex;align-items:center;gap:10px;margin-top:4px">
          <div id="addRuleSensorIcon" style="width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;background:var(--a-light);color:var(--a)"></div>
          <span id="addRuleSensorLabel" style="font-weight:600;font-size:13px;">—</span>
        </div>
      </div>
      <div class="field-group">
        <label>Kondisi</label>
        <select id="addRuleCondition" class="form-input form-select"></select>
      </div>
      <!-- Threshold tunggal (gt/lt) -->
      <div class="field-group" id="addRuleThresholdRow">
        <label>Nilai Ambang <span id="addRuleUnit" style="color:var(--ink-4);font-weight:500"></span></label>
        <input type="number" id="addRuleThreshold" class="form-input" step="0.1">
      </div>
      <!-- Threshold range (min-max) -->
      <div class="field-row-2" id="addRuleRangeRow" style="display:none">
        <div class="field-group"><label>Batas Bawah</label><input type="number" id="addRuleThresholdMin" class="form-input" step="0.1"></div>
        <div class="field-group"><label>Batas Atas</label><input type="number" id="addRuleThresholdMax" class="form-input" step="0.1"></div>
      </div>
      <div class="field-group">
        <label>Perangkat yang Dikontrol</label>
        <select id="addRuleDevice" class="form-input form-select"></select>
      </div>
      <div class="field-group">
        <label>Aksi</label>
        <select id="addRuleAction" class="form-input form-select">
          <option value="on">⚡ Nyalakan (ON)</option>
          <option value="off">✕ Matikan (OFF)</option>
        </select>
      </div>
      <!-- Jam operasional (opsional) -->
      <div class="field-row-2">
        <div class="field-group"><label>Aktif Dari (opsional)</label><input type="time" id="addRuleStartTime" class="form-input"></div>
        <div class="field-group"><label>Aktif Hingga (opsional)</label><input type="time" id="addRuleEndTime" class="form-input"></div>
      </div>
      <div class="field-group">
        <label>Delay (ms)</label>
        <input type="number" id="addRuleDelay" class="form-input" value="0" min="0" step="500">
      </div>
    </div>
    <div class="modal-footer">
      <button onclick="closeAddRuleModal()" class="btn-ghost">Batal</button>
      <button onclick="saveNewAutomationRule()" class="btn-primary">Buat Aturan</button>
    </div>
  </div>
</div>
