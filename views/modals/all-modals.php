<?php

?>

<!-- ══════════════ MODALS ══════════════ -->

<!-- Quick Control Modal -->
<div id="quickControlModal" class="modal-backdrop">
  <div class="modal">
    <div class="modal-header"><h3>Atur Kontrol Cepat</h3><button onclick="closeQuickControlSettings()" class="modal-close"><i class="fas fa-times"></i></button></div>
    <p class="modal-sub" style="padding:0 20px 8px">Klik kartu perangkat untuk pilih atau lepas. Maksimal 4 perangkat tampil di dashboard.</p>
    <div id="quickControlDevicesList" class="modal-list qc-picker-grid" style="padding:0 20px 12px"></div>
    <div class="modal-footer"><button onclick="closeQuickControlSettings()" class="btn-ghost">Batal</button><button onclick="saveQuickControlSettings()" class="btn-primary">Simpan</button></div>
  </div>
</div>


<!-- Camera Selector -->
<div id="cameraSelectorModal" class="modal-backdrop">
  <div class="modal">
    <div class="modal-header"><h3>Pilih Kamera</h3><button onclick="closeCameraSelector()" class="modal-close"><i class="fas fa-times"></i></button></div>
    <div id="cameraDevicesList" class="modal-list" style="padding:12px 20px"><p class="modal-loading">Memuat daftar kamera…</p></div>
    <div class="modal-footer"><button onclick="closeCameraSelector()" class="btn-ghost">Tutup</button></div>
  </div>
</div>

<!-- Device Setting Modal -->
<div id="topicModal" class="modal-backdrop">
  <div class="modal">
    <div class="modal-header">
      <h3>Setting — <span id="topicDeviceName"></span></h3>
      <button onclick="closeTopicSettings()" class="modal-close"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-fields">
      <div class="field-row-2">
        <div class="field-group">
          <label>Nama Perangkat</label>
          <input type="text" id="editDeviceName" class="form-input" placeholder="Nama perangkat">
        </div>
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
      <div class="field-group">
        <label>Subscribe Topic <span class="field-hint">(status dari device → dashboard)</span></label>
        <input type="text" id="deviceTopicSub" class="form-input" placeholder="iotzy/device/lampu/status">
      </div>
      <div class="field-group">
        <label>Publish Topic <span class="field-hint">(kontrol dashboard → device)</span></label>
        <input type="text" id="deviceTopicPub" class="form-input" placeholder="iotzy/device/lampu/control">
      </div>
      <p class="form-hint">Payload ON: <code>{"state": 1}</code> · Payload OFF: <code>{"state": 0}</code></p>
    </div>
    <div class="modal-footer"><button onclick="closeTopicSettings()" class="btn-ghost">Batal</button><button onclick="saveDeviceSettings()" class="btn-primary">Simpan</button></div>
  </div>
</div>

<!-- Add Device Modal -->
<div id="addDeviceModal" class="modal-backdrop">
  <div class="modal">
    <div class="modal-header"><h3>Tambah Perangkat Baru</h3><button onclick="closeAddDeviceModal()" class="modal-close"><i class="fas fa-times"></i></button></div>
    <div class="modal-fields">
      <div class="field-group"><label>Nama Perangkat</label><input type="text" id="newDeviceName" class="form-input" placeholder="cth: Lampu Kamar Tidur"></div>
      <div class="field-group">
        <label>Jenis / Icon</label>
        <select id="newDeviceIcon" class="form-input form-select">
          <option value="fa-lightbulb">💡 Lampu (LED / Bohlam)</option>
          <option value="fa-wind">🌀 Kipas Angin</option>
          <option value="fa-snowflake">❄️ AC / Pendingin</option>
          <option value="fa-tv">📺 Televisi</option>
          <option value="fa-lock">🔒 Kunci Pintu Otomatis</option>
          <option value="fa-door-open">🚪 Sensor / Aktuator Pintu</option>
          <option value="fa-video">📹 Kamera CCTV</option>
          <option value="fa-volume-up">🔊 Speaker / Alarm</option>
          <option value="fa-plug">🔌 Stop Kontak Pintar</option>
        </select>
      </div>
      <div class="field-row-2">
        <div class="field-group"><label>Subscribe Topic</label><input type="text" id="newDeviceTopicSub" class="form-input" placeholder="iotzy/device/xxx/status"></div>
        <div class="field-group"><label>Publish Topic</label><input type="text" id="newDeviceTopicPub" class="form-input" placeholder="iotzy/device/xxx/control"></div>
      </div>
      <p class="form-hint">Kontrol akan disesuaikan otomatis berdasarkan jenis perangkat yang dipilih.</p>
    </div>
    <div class="modal-footer"><button onclick="closeAddDeviceModal()" class="btn-ghost">Batal</button><button onclick="saveNewDevice()" class="btn-primary"><i class="fas fa-plus"></i> Tambah</button></div>
  </div>
</div>

<!-- Add Sensor Modal -->
<div id="addSensorModal" class="modal-backdrop">
  <div class="modal">
    <div class="modal-header"><h3>Tambah Sensor Baru</h3><button onclick="closeAddSensorModal()" class="modal-close"><i class="fas fa-times"></i></button></div>
    <div class="modal-fields">
      <div class="field-group"><label>Nama Sensor</label><input type="text" id="newSensorName" class="form-input" placeholder="cth: Sensor Suhu Ruang Tamu"></div>
      <div class="field-row-2">
        <div class="field-group">
          <label>Tipe Sensor</label>
          <select id="newSensorType" class="form-input form-select">
            <option value="temperature">🌡️ Suhu (DHT11/DHT22)</option>
            <option value="humidity">💧 Kelembaban</option>
            <option value="air_quality">💨 Kualitas Udara (MQ135)</option>
            <option value="presence">👤 Kehadiran (PIR)</option>
            <option value="brightness">☀️ Kecerahan (LDR)</option>
            <option value="motion">🏃 Gerakan</option>
            <option value="smoke">🔥 Asap (MQ2)</option>
            <option value="gas">⚠️ Gas (MQ7)</option>
          </select>
        </div>
        <div class="field-group"><label>Satuan</label><input type="text" id="newSensorUnit" class="form-input" placeholder="°C, %, ppm, lux…"></div>
      </div>
      <div class="field-group"><label>MQTT Topic</label><input type="text" id="newSensorTopic" class="form-input" placeholder="iotzy/sensor/suhu"></div>
      <p class="form-hint">Payload: <code>{"value": 28.5}</code> atau nilai langsung <code>28.5</code></p>
    </div>
    <div class="modal-footer"><button onclick="closeAddSensorModal()" class="btn-ghost">Batal</button><button onclick="saveNewSensor()" class="btn-primary"><i class="fas fa-plus"></i> Tambah Sensor</button></div>
  </div>
</div>

<!-- Sensor Setting Modal -->
<div id="sensorSettingModal" class="modal-backdrop">
  <div class="modal">
    <div class="modal-header">
      <h3>Setting — <span id="ssSensorName"></span></h3>
      <button onclick="closeSensorSettings()" class="modal-close"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-fields">
      <div class="field-group"><label>Nama Sensor</label><input type="text" id="ssEditName" class="form-input"></div>
      <div class="field-row-2">
        <div class="field-group">
          <label>Tipe</label>
          <select id="ssEditType" class="form-input form-select">
            <option value="temperature">🌡️ Suhu</option>
            <option value="humidity">💧 Kelembaban</option>
            <option value="air_quality">💨 Kualitas Udara</option>
            <option value="presence">👤 Kehadiran</option>
            <option value="brightness">☀️ Kecerahan</option>
            <option value="motion">🏃 Gerakan</option>
            <option value="smoke">🔥 Asap</option>
            <option value="gas">⚠️ Gas</option>
          </select>
        </div>
        <div class="field-group"><label>Satuan <span class="field-hint">(opsional)</span></label><input type="text" id="ssEditUnit" class="form-input" placeholder="°C, %, ppm…"></div>
      </div>
      <div class="field-group"><label>MQTT Topic</label><input type="text" id="ssEditTopic" class="form-input"></div>
    </div>
    <div class="modal-footer"><button onclick="closeSensorSettings()" class="btn-ghost">Batal</button><button onclick="saveSensorSettings()" class="btn-primary">Simpan</button></div>
  </div>
</div>

<!-- MQTT Config Modal -->
<div id="mqttConfigModal" class="modal-backdrop">
  <div class="modal">
    <div class="modal-header"><h3>Konfigurasi MQTT</h3><button onclick="closeMQTTConfigModal()" class="modal-close"><i class="fas fa-times"></i></button></div>
    <div class="modal-fields">
      <div class="field-group">
        <label>⚡ Quick Setup (Template)</label>
        <select id="mqttTemplate" class="form-input form-select" onchange="applyMQTTTemplate(this.value)">
          <option value="">— Pilih Template Broker —</option>
          <option value="local">🏠 IoTzy Local Docker (Nginx Port 80)</option>
          <option value="hivemq">☁️ HiveMQ Cloud (WSS)</option>
          <option value="emqx">🏢 EMQX Public (Port 8083)</option>
          <option value="mosquitto">🐢 Mosquitto.org (Port 8080)</option>
        </select>
      </div>
      <div class="field-group"><label>Broker URL</label>
        <input type="text" id="mqttBroker" class="form-input"
          value="<?= htmlspecialchars($settings['mqtt_broker'] ?? 'broker.hivemq.com') ?>">
      </div>
      <div class="field-row-2">
        <div class="field-group"><label>Port</label>
          <input type="number" id="mqttPort" class="form-input"
            value="<?= (int)($settings['mqtt_port'] ?? 8884) ?>">
        </div>
        <div class="field-group"><label>Client ID</label>
          <input type="text" id="mqttClientId" class="form-input"
            value="<?= htmlspecialchars($settings['mqtt_client_id'] ?? 'iotzy_web') ?>">
        </div>
      </div>
      <div class="field-row-2">
        <div class="field-group"><label>Path</label>
          <input type="text" id="mqttPath" class="form-input"
            value="<?= htmlspecialchars($settings['mqtt_path'] ?? '/mqtt') ?>">
        </div>
        <div class="field-group" style="justify-content:flex-end;padding-top:22px">
          <label class="toggle-label-row">
            <span>Gunakan SSL</span>
            <label class="toggle-wrapper">
              <input type="checkbox" id="mqttUseSSL" <?= !empty($settings['mqtt_use_ssl']) ? 'checked' : '' ?> class="toggle-input">
              <span class="toggle-track"></span>
            </label>
          </label>
        </div>
      </div>
      <div class="field-row-2">
        <div class="field-group"><label>Username <span class="field-hint">(opsional)</span></label>
          <input type="text" id="mqttUsername" class="form-input"
            value="<?= htmlspecialchars($settings['mqtt_username'] ?? '') ?>">
        </div>
        <div class="field-group"><label>Password <span class="field-hint">(opsional)</span></label>
          <input type="password" id="mqttPassword" class="form-input"
            placeholder="Kosongkan jika tidak berubah">
        </div>
      </div>
    </div>
    <div class="modal-footer"><button onclick="closeMQTTConfigModal()" class="btn-ghost">Batal</button><button onclick="saveMQTTConfig()" class="btn-primary">Simpan &amp; Hubungkan</button></div>
  </div>
</div>

<!-- Add Automation Rule Modal -->
<div id="addRuleModal" class="modal-backdrop">
  <div class="modal">
    <div class="modal-header">
      <h3>Tambah Aturan Otomasi</h3>
      <button onclick="closeAddRuleModal()" class="modal-close"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-fields">
      <div class="field-group" style="flex-direction:row;align-items:center;gap:10px;background:var(--surface-2);padding:10px 12px;border-radius:var(--r);border:1px solid var(--border)">
        <div id="addRuleSensorIcon"></div>
        <div>
          <div style="font-size:10px;font-weight:700;color:var(--ink-4);text-transform:uppercase;letter-spacing:.5px">Sensor</div>
          <div id="addRuleSensorLabel" style="font-size:13px;font-weight:600;color:var(--ink)">—</div>
        </div>
      </div>
      <div class="field-group">
        <label>Kondisi Trigger</label>
        <select id="addRuleCondition" class="form-input form-select"></select>
      </div>
      <div id="addRuleThresholdRow" class="field-group">
        <label>Nilai Ambang</label>
        <div class="field-input-group">
          <input type="number" id="addRuleThreshold" class="field-input" step="0.1">
          <span class="field-unit" id="addRuleUnit">°C</span>
        </div>
      </div>
      <div id="addRuleRangeRow" class="field-row-2" style="display:none">
        <div class="field-group"><label>Batas Bawah</label><input type="number" id="addRuleThresholdMin" class="form-input" step="0.1"></div>
        <div class="field-group"><label>Batas Atas</label><input type="number" id="addRuleThresholdMax" class="form-input" step="0.1"></div>
      </div>
      <div class="field-group">
        <label>Perangkat yang Dikontrol</label>
        <select id="addRuleDevice" class="form-input form-select"></select>
      </div>
      <div class="field-row-2">
        <div class="field-group">
          <label>Aksi</label>
          <select id="addRuleAction" class="form-input form-select">
            <option value="on">⚡ Nyalakan (ON)</option>
            <option value="off">✕ Matikan (OFF)</option>
            <option value="speed_high">💨 Kipas Cepat (75%)</option>
            <option value="speed_low">🌬️ Kipas Lambat (25%)</option>
            <option value="speed_mid">💨 Kipas Sedang (50%)</option>
          </select>
        </div>
        <div class="field-group">
          <label>Delay <span class="field-hint">(ms)</span></label>
          <input type="number" id="addRuleDelay" class="form-input" value="0" min="0" step="500">
        </div>
      </div>
      <div class="field-row-2">
        <div class="field-group">
          <label>Mulai Jam <span class="field-hint">(opsional)</span></label>
          <input type="time" id="addRuleStartTime" class="form-input">
        </div>
        <div class="field-group">
          <label>Sampai Jam <span class="field-hint">(opsional)</span></label>
          <input type="time" id="addRuleEndTime" class="form-input">
        </div>
      </div>
      <p class="form-hint">Isi jam operasional jika ingin membatasi aturan ini hanya aktif di jam tertentu.</p>
    </div>
    <div class="modal-footer">
      <button onclick="closeAddRuleModal()" class="btn-ghost">Batal</button>
      <button onclick="saveNewAutomationRule()" class="btn-primary"><i class="fas fa-plus"></i> Tambah Aturan</button>
    </div>
  </div>
</div>
