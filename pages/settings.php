<div id="settings" class="view app-section">
  <div class="view-header">
    <div class="v-title">
      <h3><i class="fas fa-gear"></i> Pengaturan Sistem</h3>
      <p>Kelola profil, koneksi MQTT, notifikasi, dan keamanan akun Anda.</p>
    </div>
  </div>
  <div class="settings-layout">
    <div class="settings-sidebar">
      <div class="sn-list">
        <button class="sn-item active" data-target="set-profile"><i class="fas fa-user-circle"></i> Profil Pengguna</button>
        <button class="sn-item" data-target="set-mqtt"><i class="fas fa-network-wired"></i> Koneksi MQTT</button>
        <button class="sn-item" data-target="set-telegram"><i class="fas fa-paper-plane"></i> Notifikasi Telegram</button>
        <button class="sn-item" data-target="set-security"><i class="fas fa-shield-halved"></i> Keamanan & Akun</button>
        <button class="sn-item" data-target="set-system"><i class="fas fa-server"></i> Informasi Sistem</button>
        <button class="sn-item" data-target="set-backup"><i class="fas fa-database"></i> Backup & Restore</button>
      </div>
    </div>
    <div class="settings-main">
      <div id="set-profile" class="settings-panel active">
        <div class="panel-header">Profil Pengguna</div>
        <div class="panel-body">
          <div class="field-item">
            <label>Username</label>
            <input type="text" value="<?= $userData['username'] ?? '' ?>" class="form-input" disabled>
          </div>
          <div class="field-item">
            <label>Nama Lengkap</label>
            <input type="text" id="settingFullName" value="<?= $userData['full_name'] ?? '' ?>" class="form-input">
          </div>
          <div class="field-item">
            <label>Email</label>
            <input type="email" id="settingEmail" value="<?= $userData['email'] ?? '' ?>" class="form-input">
          </div>
          <button class="btn-primary" onclick="saveProfile()">Simpan Profil</button>
        </div>
      </div>
      <div id="set-mqtt" class="settings-panel">
        <div class="panel-header">Konfigurasi MQTT</div>
        <div class="panel-body">
          <div class="status-box">
            <span>Status Koneksi:</span>
            <span id="mqttStatusSettings" class="setting-val muted">Disconnected</span>
          </div>
          <div class="field-item">
            <label>Broker URL</label>
            <input type="text" id="mqttBroker" class="form-input" value="<?= $settings['mqtt_broker'] ?? '' ?>">
          </div>
          <div class="field-item">
            <label>Port</label>
            <input type="number" id="mqttPort" class="form-input" value="<?= $settings['mqtt_port'] ?? '' ?>">
          </div>
          <button class="btn-primary" onclick="openMQTTConfigModal()">Edit Konfigurasi Detail</button>
        </div>
      </div>
      <div id="set-telegram" class="settings-panel">
        <div class="panel-header">Integrasi Telegram</div>
        <div class="panel-body">
          <p class="panel-desc">Gunakan Bot Telegram IoTzy untuk menerima notifikasi otomasi dan kontrol perangkat via chat.</p>
          <div class="field-item">
            <label>Telegram Chat ID</label>
            <input type="text" id="settingTelegramId" value="<?= $settings['telegram_chat_id'] ?? '' ?>" class="form-input" placeholder="Contoh: 12345678">
          </div>
          <div class="btn-group">
            <button class="btn-primary" onclick="saveTelegramId()">Simpan Chat ID</button>
            <button class="btn-secondary" onclick="testTelegram()"><i class="fas fa-vial"></i> Kirim Test</button>
          </div>
        </div>
      </div>
      <div id="set-security" class="settings-panel">
        <div class="panel-header">Keamanan & Password</div>
        <div class="panel-body">
          <div class="field-item">
            <label>Password Lama</label>
            <input type="password" id="oldPassword" class="form-input">
          </div>
          <div class="field-item">
            <label>Password Baru</label>
            <input type="password" id="newPassword" class="form-input">
          </div>
          <div class="field-item">
            <label>Konfirmasi Password Baru</label>
            <input type="password" id="confirmPassword" class="form-input">
          </div>
          <button class="btn-primary" onclick="changePassword()">Ganti Password</button>
        </div>
      </div>
      <div id="set-system" class="settings-panel">
        <div class="panel-header">Informasi Sistem</div>
        <div class="panel-body">
          <div class="info-list">
            <div class="info-item"><span>Versi App</span><span>v2.4.0 (Stabil)</span></div>
            <div class="info-item"><span>Engine</span><span>PHP 8.2 + Node.js (Edge)</span></div>
            <div class="info-item"><span>Database</span><span>Supabase (PostgreSQL)</span></div>
            <div class="info-item"><span>Uptime Server</span><span><?= date("d M Y H:i") ?></span></div>
          </div>
        </div>
      </div>
      <div id="set-backup" class="settings-panel">
        <div class="panel-header">Backup & Restore Konfigurasi</div>
        <div class="panel-body">
          <p class="panel-desc">Ekspor seluruh pengaturan dan data peranti Anda ke dalam file cadangan.</p>
          <div class="btn-group">
            <button class="btn-primary"><i class="fas fa-download"></i> Ekspor Konfigurasi (JSON)</button>
            <button class="btn-secondary"><i class="fas fa-upload"></i> Impor Konfigurasi</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
