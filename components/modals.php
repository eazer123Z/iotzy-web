<?php ?>
<div id="quickControlModal" class="modal-overlay">
  <div class="modal-content">
    <div class="modal-header">
      <h3>Atur Kontrol Cepat</h3>
      <button onclick="closeQuickControlSettings()" class="modal-close"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <p style="color:var(--text-secondary);font-size:.85rem;margin-bottom:12px">Pilih hingga 4 perangkat untuk akses cepat di Dashboard.</p>
      <div id="quickControlDevicesList" class="quick-controls-grid"></div>
    </div>
    <div class="modal-footer">
      <button onclick="closeQuickControlSettings()" class="btn-secondary">Batal</button>
      <button onclick="saveQuickControlSettings()" class="btn-primary">Simpan</button>
    </div>
  </div>
</div>

<div id="cameraSelectorModal" class="modal-overlay">
  <div class="modal-content">
    <div class="modal-header">
      <h3>Pilih Kamera</h3>
      <button onclick="closeCameraSelector()" class="modal-close"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div id="cameraDevicesList">
        <p class="muted"><i class="fas fa-spinner fa-spin"></i> Memuat daftar kamera…</p>
      </div>
    </div>
    <div class="modal-footer">
      <button onclick="closeCameraSelector()" class="btn-primary">Selesai</button>
    </div>
  </div>
</div>

<div id="topicModal" class="modal-overlay">
  <div class="modal-content">
    <div class="modal-header">
      <h3>Konfigurasi — <span id="topicDeviceName"></span></h3>
      <button onclick="closeTopicSettings()" class="modal-close"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group"><label>Nama Perangkat</label><input type="text" id="editDeviceName"></div>
        <div class="form-group">
          <label>Icon</label>
          <select id="editDeviceIcon">
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
      <div class="form-group"><label>Topic MQTT</label><input type="text" id="deviceTopic" placeholder="iotzy/device/xxx"></div>
    </div>
    <div class="modal-footer">
      <button onclick="closeTopicSettings()" class="btn-secondary">Batal</button>
      <button onclick="saveDeviceSettings()" class="btn-primary">Simpan</button>
    </div>
  </div>
</div>

<div id="addDeviceModal" class="modal-overlay">
  <div class="modal-content">
    <div class="modal-header">
      <h3>Tambah Perangkat</h3>
      <button onclick="closeAddDeviceModal()" class="modal-close"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-group"><label>Nama Perangkat</label><input type="text" id="newDeviceName" placeholder="Lamp Utama"></div>
      <div class="form-group">
        <label>Jenis</label>
        <select id="newDeviceIcon">
          <option value="fa-lightbulb">💡 Lampu</option>
          <option value="fa-wind">🌀 Kipas</option>
          <option value="fa-snowflake">❄️ AC</option>
          <option value="fa-lock">🔒 Kunci</option>
          <option value="fa-video">📹 CCTV</option>
          <option value="fa-plug">🔌 Plug</option>
        </select>
      </div>
      <div class="form-group"><label>Topic MQTT</label><input type="text" id="newDeviceTopic" placeholder="iotzy/device/xxx"></div>
    </div>
    <div class="modal-footer">
      <button onclick="closeAddDeviceModal()" class="btn-secondary">Batal</button>
      <button onclick="saveNewDevice()" class="btn-primary">Tambah</button>
    </div>
  </div>
</div>

<div id="addSensorModal" class="modal-overlay">
  <div class="modal-content">
    <div class="modal-header">
      <h3>Tambah Sensor</h3>
      <button onclick="closeAddSensorModal()" class="modal-close"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-group"><label>Nama Sensor</label><input type="text" id="newSensorName"></div>
      <div class="form-row">
        <div class="form-group"><label>Tipe</label><select id="newSensorType"><option value="temperature">🌡️ Suhu</option><option value="humidity">💧 Lembab</option></select></div>
        <div class="form-group"><label>Satuan</label><input type="text" id="newSensorUnit" placeholder="°C"></div>
      </div>
      <div class="form-group"><label>Topic MQTT</label><input type="text" id="newSensorTopic"></div>
    </div>
    <div class="modal-footer">
      <button onclick="closeAddSensorModal()" class="btn-secondary">Batal</button>
      <button onclick="saveNewSensor()" class="btn-primary">Tambah</button>
    </div>
  </div>
</div>

<div id="sensorSettingModal" class="modal-overlay">
  <div class="modal-content">
    <div class="modal-header">
      <h3>Edit Sensor</h3>
      <button onclick="closeSensorSettings()" class="modal-close"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-group"><label>Nama</label><input type="text" id="ssEditName"></div>
      <div class="form-group"><label>Satuan</label><input type="text" id="ssEditUnit"></div>
      <div class="form-group"><label>Topic MQTT</label><input type="text" id="ssEditTopic"></div>
    </div>
    <div class="modal-footer">
      <button onclick="closeSensorSettings()" class="btn-secondary">Batal</button>
      <button onclick="saveSensorSettings()" class="btn-primary">Simpan</button>
    </div>
  </div>
</div>

<div id="mqttConfigModal" class="modal-overlay">
  <div class="modal-content">
    <div class="modal-header">
      <h3>Konfigurasi MQTT</h3>
      <button onclick="closeMQTTConfigModal()" class="modal-close"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-group"><label>Broker URL</label><input type="text" id="mqttBrokerModal"></div>
      <div class="form-row">
        <div class="form-group"><label>Port</label><input type="number" id="mqttPortModal"></div>
        <div class="form-group">
          <label class="form-check">
            <input type="checkbox" id="mqttUseSSLModal">
            SSL/TLS (WSS)
          </label>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button onclick="closeMQTTConfigModal()" class="btn-secondary">Batal</button>
      <button onclick="saveMQTTConfig()" class="btn-primary">Hubungkan</button>
    </div>
  </div>
</div>

<div id="addRuleModal" class="modal-overlay">
  <div class="modal-content">
    <div class="modal-header">
      <h3>Tambah Otomasi</h3>
      <button onclick="closeAddRuleModal()" class="modal-close"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px">
        <div id="addRuleSensorIcon" style="width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;background:var(--accent-bg);color:var(--accent)"></div>
        <span id="addRuleSensorLabel" style="font-weight:600;font-size:.85rem">—</span>
      </div>
      <div class="form-group">
        <label>Kondisi</label>
        <select id="addRuleCondition"></select>
      </div>
      <div class="form-group" id="addRuleThresholdRow">
        <label>Nilai Ambang <span id="addRuleUnit" style="color:var(--text-muted);font-weight:500"></span></label>
        <input type="number" id="addRuleThreshold" step="0.1">
      </div>
      <div class="form-row" id="addRuleRangeRow" style="display:none">
        <div class="form-group"><label>Batas Bawah</label><input type="number" id="addRuleThresholdMin" step="0.1"></div>
        <div class="form-group"><label>Batas Atas</label><input type="number" id="addRuleThresholdMax" step="0.1"></div>
      </div>
      <div class="form-group">
        <label>Perangkat yang Dikontrol</label>
        <select id="addRuleDevice"></select>
      </div>
      <div class="form-group">
        <label>Aksi</label>
        <select id="addRuleAction">
          <option value="on">⚡ Nyalakan (ON)</option>
          <option value="off">✕ Matikan (OFF)</option>
        </select>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Aktif Dari (opsional)</label><input type="time" id="addRuleStartTime"></div>
        <div class="form-group"><label>Aktif Hingga (opsional)</label><input type="time" id="addRuleEndTime"></div>
      </div>
      <div class="form-group">
        <label>Delay (ms)</label>
        <input type="number" id="addRuleDelay" value="0" min="0" step="500">
      </div>
    </div>
    <div class="modal-footer">
      <button onclick="closeAddRuleModal()" class="btn-secondary">Batal</button>
      <button onclick="saveNewAutomationRule()" class="btn-primary">Buat Aturan</button>
    </div>
  </div>
</div>
