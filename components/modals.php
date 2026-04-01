<?php ?>
<div id="quickControlModal" class="modal-overlay">
  <div class="modal-content quick-control-modal">
    <div class="modal-header">
      <h3>Atur Kontrol Cepat</h3>
      <button onclick="closeQuickControlSettings()" class="modal-close"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body quick-control-modal-body">
      <div class="quick-control-summary">
        <p class="quick-control-hint">Pilih sampai 4 perangkat favorit.</p>
        <span id="quickControlSelectionCount" class="quick-control-count">0 / 4 dipilih</span>
      </div>
      <div id="quickControlDevicesList" class="qc-picker-grid"></div>
    </div>
    <div class="modal-footer">
      <button onclick="closeQuickControlSettings()" class="btn-secondary">Batal</button>
      <button onclick="saveQuickControlSettings()" id="btnSaveQuickControl" class="btn-primary">Simpan</button>
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
        <p class="muted"><i class="fas fa-spinner fa-spin"></i> Memuat daftar kamera...</p>
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
      <h3>Konfigurasi - <span id="topicDeviceName"></span></h3>
      <button onclick="closeTopicSettings()" class="modal-close"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group"><label>Nama Perangkat</label><input type="text" id="editDeviceName"></div>
        <div class="form-group">
          <label>Perangkat</label>
          <select id="editDeviceTemplate" onchange="syncDeviceFormFromTemplate('edit')"></select>
          <small id="editDeviceKindHint" class="muted">Ikon dan jenis perangkat akan mengikuti pilihan ini.</small>
        </div>
      </div>
      <div class="form-group"><label>Topic</label><input type="text" id="deviceTopic" placeholder="iotzy/device/xxx"></div>
    </div>
    <div class="modal-footer">
      <button onclick="closeTopicSettings()" class="btn-secondary">Batal</button>
      <button onclick="saveDeviceSettings()" id="btnSaveDeviceEdit" class="btn-primary">Simpan</button>
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
        <label>Perangkat</label>
        <select id="newDeviceTemplate" onchange="syncDeviceFormFromTemplate('new')"></select>
        <small id="newDeviceKindHint" class="muted">Ikon dan jenis perangkat akan terdeteksi otomatis.</small>
      </div>
      <div class="form-group"><label>Topic</label><input type="text" id="newDeviceTopic" placeholder="iotzy/device/xxx"></div>
    </div>
    <div class="modal-footer">
      <button onclick="closeAddDeviceModal()" class="btn-secondary">Batal</button>
      <button onclick="saveNewDevice()" id="btnSaveNewDevice" class="btn-primary">Tambah</button>
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
        <div class="form-group">
          <label>Sensor</label>
          <select id="newSensorTemplate" onchange="syncSensorFormFromTemplate('new')"></select>
          <small id="newSensorTypeHint" class="muted">Ikon, jenis, dan satuan sensor akan mengikuti pilihan ini.</small>
        </div>
        <div class="form-group"><label>Perangkat</label><select id="newSensorDevice"></select></div>
      </div>
      <div class="form-group"><label>Topic</label><input type="text" id="newSensorTopic"></div>
    </div>
    <div class="modal-footer">
      <button onclick="closeAddSensorModal()" class="btn-secondary">Batal</button>
      <button onclick="saveNewSensor()" id="btnSaveNewSensor" class="btn-primary">Tambah</button>
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
      <div class="form-group"><label>Nama Sensor</label><input type="text" id="ssEditName"></div>
      <div class="form-row">
        <div class="form-group">
          <label>Sensor</label>
          <select id="ssEditTemplate" onchange="syncSensorFormFromTemplate('edit')"></select>
          <small id="ssEditTypeHint" class="muted">Ikon, jenis, dan satuan sensor akan mengikuti pilihan ini.</small>
        </div>
        <div class="form-group"><label>Perangkat</label><select id="ssEditDevice"></select></div>
      </div>
      <div class="form-group"><label>Topic</label><input type="text" id="ssEditTopic"></div>
    </div>
    <div class="modal-footer">
      <button onclick="closeSensorSettings()" class="btn-secondary">Batal</button>
      <button onclick="saveSensorSettings()" id="btnSaveSensorEdit" class="btn-primary">Simpan</button>
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
      <button onclick="saveMQTTConfig()" id="btnSaveMQTT" class="btn-primary">Hubungkan</button>
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
        <span id="addRuleSensorLabel" style="font-weight:600;font-size:.85rem">-</span>
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
          <option value="on">Nyalakan (ON)</option>
          <option value="off">Matikan (OFF)</option>
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
      <button onclick="saveNewAutomationRule()" id="btnSaveNewRule" class="btn-primary">Buat Aturan</button>
    </div>
  </div>
</div>
