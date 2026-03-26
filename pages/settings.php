<div id="settings" class="view app-section hidden">
  <div class="view-header">
    <div class="v-title">
      <h3><i class="fas fa-gear"></i> Pengaturan Sistem</h3>
      <p>Konfigurasi profil, koneksi MQTT, Telegram, dan keamanan akun.</p>
    </div>
  </div>

  <div class="settings-layout">
    <div class="settings-sidebar">
      <button class="settings-tab active" data-panel="profilePanel" onclick="switchSettingsTab(this)">
        <i class="fas fa-user"></i> Profil
      </button>
      <button class="settings-tab" data-panel="mqttPanel" onclick="switchSettingsTab(this)">
        <i class="fas fa-plug"></i> MQTT Broker
      </button>
      <button class="settings-tab" data-panel="telegramPanel" onclick="switchSettingsTab(this)">
        <i class="fab fa-telegram"></i> Telegram
      </button>
      <button class="settings-tab" data-panel="securityPanel" onclick="switchSettingsTab(this)">
        <i class="fas fa-lock"></i> Keamanan
      </button>
      <button class="settings-tab" data-panel="aboutPanel" onclick="switchSettingsTab(this)">
        <i class="fas fa-info-circle"></i> Tentang
      </button>
    </div>

    <div class="settings-content">
      <!-- Profile Panel -->
      <div id="profilePanel" class="settings-panel active">
        <h4><i class="fas fa-user"></i> Profil Pengguna</h4>
        <div class="form-group">
          <label>Nama Lengkap</label>
          <input type="text" id="settFullName" value="<?= htmlspecialchars($user['full_name'] ?? '') ?>" placeholder="Nama lengkap Anda">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="settEmail" value="<?= htmlspecialchars($user['email'] ?? '') ?>" placeholder="email@contoh.com">
        </div>
        <div class="form-group">
          <label>Tema Tampilan</label>
          <select id="settTheme" onchange="applyThemeFromSettings(this.value)">
            <option value="dark" <?= ($settings['theme'] ?? 'dark') === 'dark' ? 'selected' : '' ?>>🌙 Dark Mode</option>
            <option value="light" <?= ($settings['theme'] ?? 'dark') === 'light' ? 'selected' : '' ?>>☀️ Light Mode</option>
          </select>
        </div>
        <button class="btn-primary" onclick="saveProfile()"><i class="fas fa-save"></i> Simpan Profil</button>
      </div>

      <!-- MQTT Panel -->
      <div id="mqttPanel" class="settings-panel">
        <h4><i class="fas fa-plug"></i> Konfigurasi MQTT</h4>
        <div class="form-group">
          <label>Template Broker</label>
          <select id="mqttTemplate" onchange="applyMQTTTemplate(this.value)">
            <option value="">— Pilih Template Broker —</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Broker Host</label>
            <input type="text" id="mqttBroker" value="<?= htmlspecialchars($settings['mqtt_broker'] ?? 'broker.hivemq.com') ?>">
          </div>
          <div class="form-group">
            <label>Port</label>
            <input type="number" id="mqttPort" value="<?= htmlspecialchars($settings['mqtt_port'] ?? 8884) ?>">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Path</label>
            <input type="text" id="mqttPath" value="<?= htmlspecialchars($settings['mqtt_path'] ?? '/mqtt') ?>">
          </div>
          <div class="form-group">
            <label>Client ID</label>
            <input type="text" id="mqttClientId" value="<?= htmlspecialchars($settings['mqtt_client_id'] ?? '') ?>" placeholder="Otomatis jika kosong">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Username</label>
            <input type="text" id="mqttUsername" value="<?= htmlspecialchars($settings['mqtt_username'] ?? '') ?>" placeholder="Opsional">
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="mqttPassword" placeholder="Opsional">
          </div>
        </div>
        <div class="form-group">
          <label class="form-check">
            <input type="checkbox" id="mqttUseSSL" <?= !empty($settings['mqtt_use_ssl']) ? 'checked' : '' ?>>
            Gunakan SSL/TLS (WSS)
          </label>
        </div>
        <div style="display:flex;gap:10px">
          <button class="btn-primary" onclick="saveMQTTSettings()"><i class="fas fa-save"></i> Simpan MQTT</button>
          <button class="btn-secondary" onclick="connectMQTT()"><i class="fas fa-wifi"></i> Test Koneksi</button>
        </div>
      </div>

      <!-- Telegram Panel -->
      <div id="telegramPanel" class="settings-panel">
        <h4><i class="fab fa-telegram"></i> Notifikasi Telegram</h4>
        <div class="form-group">
          <label>Chat ID Telegram</label>
          <input type="text" id="settTelegramChatId" value="<?= htmlspecialchars($settings['telegram_chat_id'] ?? '') ?>" placeholder="Masukkan Chat ID Anda">
        </div>
        <div style="display:flex;gap:10px">
          <button class="btn-primary" onclick="saveTelegramSettings()"><i class="fas fa-save"></i> Simpan</button>
          <button class="btn-secondary" onclick="testTelegram()"><i class="fas fa-paper-plane"></i> Tes Kirim</button>
        </div>
      </div>

      <!-- Security Panel -->
      <div id="securityPanel" class="settings-panel">
        <h4><i class="fas fa-lock"></i> Keamanan Akun</h4>
        <div class="form-group">
          <label>Password Lama</label>
          <input type="password" id="settOldPassword" placeholder="Masukkan password lama">
        </div>
        <div class="form-group">
          <label>Password Baru</label>
          <input type="password" id="settNewPassword" placeholder="Masukkan password baru">
        </div>
        <div class="form-group">
          <label>Konfirmasi Password Baru</label>
          <input type="password" id="settConfirmPassword" placeholder="Ulangi password baru">
        </div>
        <button class="btn-primary" onclick="changePasswordFromSettings()"><i class="fas fa-key"></i> Ganti Password</button>
      </div>

      <!-- About Panel -->
      <div id="aboutPanel" class="settings-panel">
        <h4><i class="fas fa-info-circle"></i> Tentang IoTzy</h4>
        <div style="display:flex;flex-direction:column;gap:12px;font-size:.88rem;color:var(--text-secondary)">
          <div><strong>Versi:</strong> <?= APP_VERSION ?></div>
          <div><strong>Platform:</strong> Vercel Serverless + Supabase MySQL</div>
          <div><strong>AI Engine:</strong> Gemini Pro via Telegram & Web</div>
          <div><strong>MQTT:</strong> Paho WebSocket Client</div>
          <div><strong>Computer Vision:</strong> TensorFlow.js + COCO-SSD</div>
          <div style="margin-top:8px">
            <p style="color:var(--text-muted);font-size:.8rem">Dibangun dengan ❤️ untuk Smart Home Indonesia.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
