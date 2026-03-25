<?php ?>
<div id="quickControlModal" class="modal-backdrop">
  <div class="modal">
    <div class="modal-header"><h3>Atur Kontrol Cepat</h3><button onclick="closeQuickControlSettings()" class="modal-close"><i class="fas fa-times"></i></button></div>
    <p class="modal-sub" style="padding:0 20px 8px">Klik kartu perangkat untuk pilih atau lepas. Maksimal 4 perangkat tampil di dashboard.</p>
    <div id="quickControlDevicesList" class="modal-list qc-picker-grid" style="padding:0 20px 12px"></div>
    <div class="modal-footer"><button onclick="closeQuickControlSettings()" class="btn-ghost">Batal</button><button onclick="saveQuickControlSettings()" class="btn-primary">Simpan</button></div>
  </div>
</div>
<div id="cameraSelectorModal" class="modal-backdrop">
  <div class="modal">
    <div class="modal-header"><h3>Pilih Kamera</h3><button onclick="closeCameraSelector()" class="modal-close"><i class="fas fa-times"></i></button></div>
    <div id="cameraDevicesList" class="modal-list" style="padding:12px 20px"><p class="modal-loading">Memuat daftar kamera…</p></div>
    <div class="modal-footer"><button onclick="closeCameraSelector()" class="btn-ghost">Tutup</button></div>
  </div>
</div>
<div id="topicModal" class="modal-backdrop">
  <div class="modal">
    <div class="modal-header"><h3>Setting — <span id="topicDeviceName"></span></h3><button onclick="closeTopicSettings()" class="modal-close"><i class="fas fa-times"></i></button></div>
    <div class="modal-fields">
      <div class="field-row-2">
        <div class="field-group"><label>Nama Perangkat</label><input type="text" id="editDeviceName" class="form-input" placeholder="Nama perangkat"></div>
        <div class="field-group">
          <label>Icon Perangkat</label>
          <select id="editDeviceIcon" class="form-input form-select">
            <option value="fa-lightbulb">💡 Lampu</option>
            <option value="fa-wind">🌀 Kipas Angin</option>
            <option value="fa-snowflake">❄️ AC / Pendingin</option>
            <option value="fa-tv">📺 Televisi</option>
            <option value="fa-lock">🔒 Kunci Pintu</option>
            <option value="fa-door-open">🚪 Pintu</option>
            <option value="fa-video">📹 Kamera CCTV</option>
            <option value="fa-volume-up">🔊 Speaker</option>
            <option value="fa-plug">🔌 Stop Kontak</option>
          </select>
        </div>
      </div>
      <div class="field-group"><label>Subscribe Topic</label><input type="text" id="deviceTopicSub" class="form-input" placeholder="iotzy/device/xxx/status"></div>
      <div class="field-group"><label>Publish Topic</label><input type="text" id="deviceTopicPub" class="form-input" placeholder="iotzy/device/xxx/control"></div>
      <p class="form-hint">Payload ON: <code>{"state": 1}</code> · Payload OFF: <code>{"state": 0}</code></p>
    </div>
    <div class="modal-footer"><button onclick="closeTopicSettings()" class="btn-ghost">Batal</button><button onclick="saveDeviceSettings()" class="btn-primary">Simpan</button></div>
  </div>
</div>
<div id="addDeviceModal" class="modal-backdrop">
  <div class="modal">
    <div class="modal-header"><h3>Tambah Perangkat Baru</h3><button onclick="closeAddDeviceModal()" class="modal-close"><i class="fas fa-times"></i></button></div>
    <div class="modal-fields">
      <div class="field-group"><label>Nama Perangkat</label><input type="text" id="newDeviceName" class="form-input" placeholder="cth: Lampu Kamar"></div>
      <div class="field-group">
        <label>Jenis / Icon</label>
        <select id="newDeviceIcon" class="form-input form-select">
          <option value="fa-lightbulb">💡 Lampu</option>
          <option value="fa-wind">🌀 Kipas Angin</option>
          <option value="fa-snowflake">❄️ AC / Pendingin</option>
          <option value="fa-tv">📺 Televisi</option>
          <option value="fa-lock">🔒 Kunci Pintu</option>
          <option value="fa-door-open">🚪 Pintu</option>
          <option value="fa-video">📹 Kamera CCTV</option>
          <option value="fa-volume-up">🔊 Speaker</option>
          <option value="fa-plug">🔌 Stop Kontak</option>
        </select>
      </div>
      <div class="field-row-2">
        <div class="field-group"><label>Subscribe Topic</label><input type="text" id="newDeviceTopicSub" class="form-input" placeholder="iotzy/device/xxx/status"></div>
        <div class="field-group"><label>Publish Topic</label><input type="text" id="newDeviceTopicPub" class="form-input" placeholder="iotzy/device/xxx/control"></div>
      </div>
    </div>
    <div class="modal-footer"><button onclick="closeAddDeviceModal()" class="btn-ghost">Batal</button><button onclick="saveNewDevice()" class="btn-primary"><i class="fas fa-plus"></i> Tambah</button></div>
  </div>
</div>
<div id="addSensorModal" class="modal-backdrop">
  <div class="modal">
    <div class="modal-header"><h3>Tambah Sensor Baru</h3><button onclick="closeAddSensorModal()" class="modal-close"><i class="fas fa-times"></i></button></div>
    <div class="modal-fields">
      <div class="field-group"><label>Nama Sensor</label><input type="text" id="newSensorName" class="form-input" placeholder="cth: Sensor Suhu"></div>
      <div class="field-row-2">
        <div class="field-group">
          <label>Tipe Sensor</label>
          <select id="newSensorType" class="form-input form-select">
            <option value="temperature">🌡️ Suhu</option>
            <option value="humidity">💧 Kelembaban</option>
            <option value="air_quality">💨 Kualitas Udara</option>
            <option value="presence">👤 Kehadiran</option>
            <option value="brightness">☀️ Kecerahan</option>
          </select>
        </div>
        <div class="field-group"><label>Satuan</label><input type="text" id="newSensorUnit" class="form-input" placeholder="°C, %, ppm…"></div>
      </div>
      <div class="field-group"><label>MQTT Topic</label><input type="text" id="newSensorTopic" class="form-input" placeholder="iotzy/sensor/suhu"></div>
    </div>
    <div class="modal-footer"><button onclick="closeAddSensorModal()" class="btn-ghost">Batal</button><button onclick="saveNewSensor()" class="btn-primary"><i class="fas fa-plus"></i> Tambah</button></div>
  </div>
</div>
<div id="mqttConfigModal" class="modal-backdrop">
  <div class="modal">
    <div class="modal-header"><h3>Konfigurasi MQTT</h3><button onclick="closeMQTTConfigModal()" class="modal-close"><i class="fas fa-times"></i></button></div>
    <div class="modal-fields">
      <div class="field-group">
        <label>Template</label>
        <select id="mqttTemplate" class="form-input form-select" onchange="applyMQTTTemplate(this.value)">
          <option value="">— Pilih Template —</option>
          <option value="local">🏠 IoTzy Local Docker</option>
          <option value="hivemq">☁️ HiveMQ Cloud</option>
        </select>
      </div>
      <div class="field-group"><label>Broker URL</label><input type="text" id="mqttBroker" class="form-input" value="<?= htmlspecialchars($settings['mqtt_broker'] ?? '') ?>"></div>
      <div class="field-row-2">
        <div class="field-group"><label>Port</label><input type="number" id="mqttPort" class="form-input" value="<?= (int)($settings['mqtt_port'] ?? 8884) ?>"></div>
        <div class="field-group" style="padding-top:22px">
          <label class="toggle-label-row">
            <span>Gunakan SSL</span>
            <label class="toggle-wrapper">
              <input type="checkbox" id="mqttUseSSL" <?= !empty($settings['mqtt_use_ssl']) ? 'checked' : '' ?> class="toggle-input">
              <span class="toggle-track"></span>
            </label>
          </label>
        </div>
      </div>
    </div>
    <div class="modal-footer"><button onclick="closeMQTTConfigModal()" class="btn-ghost">Batal</button><button onclick="saveMQTTConfig()" class="btn-primary">Simpan & Hubungkan</button></div>
  </div>
</div>
<div id="addRuleModal" class="modal-backdrop">
  <div class="modal">
    <div class="modal-header"><h3>Tambah Aturan Otomasi</h3><button onclick="closeAddRuleModal()" class="modal-close"><i class="fas fa-times"></i></button></div>
    <div class="modal-fields">
      <div class="field-group"><label>Kondisi Sensor</label><select id="addRuleCondition" class="form-input form-select"></select></div>
      <div class="field-group"><label>Nilai Ambang</label><input type="number" id="addRuleThreshold" class="form-input"></div>
      <div class="field-group"><label>Perangkat Kontrol</label><select id="addRuleDevice" class="form-input form-select"></select></div>
      <div class="field-group">
        <label>Aksi</label>
        <select id="addRuleAction" class="form-input form-select">
          <option value="on">⚡ Nyalakan</option>
          <option value="off">✕ Matikan</option>
        </select>
      </div>
    </div>
    <div class="modal-footer"><button onclick="closeAddRuleModal()" class="btn-ghost">Batal</button><button onclick="saveNewAutomationRule()" class="btn-primary">Tambah Aturan</button></div>
  </div>
</div>
