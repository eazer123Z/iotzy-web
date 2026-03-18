
      <!-- ════════════ SETTINGS ════════════ -->
      <div id="view-settings" class="view hidden">
        <div class="view-header">
          <div><h2 class="view-title">Pengaturan</h2><p class="view-sub">Konfigurasi akun, MQTT, dan sistem</p></div>
        </div>
        <div class="settings-grid">
          <div class="card">
            <div class="card-header"><span class="card-title"><i class="fas fa-user" style="color:var(--a)"></i> Profil Akun</span></div>
            <div class="card-body settings-body">
              <div class="field-group">
                <label>Nama Lengkap</label>
                <input type="text" id="settingFullName" class="form-input"
                  value="<?= htmlspecialchars($user['full_name'] ?? '') ?>"
                  placeholder="Nama lengkap Anda">
              </div>
              <div class="field-group">
                <label>Email</label>
                <input type="email" id="settingEmail" class="form-input"
                  value="<?= htmlspecialchars($user['email']) ?>">
              </div>
              <div class="field-group">
                <label>Username</label>
                <input type="text" class="form-input"
                  value="<?= htmlspecialchars($user['username']) ?>" disabled>
              </div>
              <button onclick="saveProfile()" class="btn-primary" style="width:100%;justify-content:center">
                <i class="fas fa-floppy-disk"></i> Simpan Profil
              </button>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><span class="card-title"><i class="fas fa-key" style="color:var(--amber)"></i> Ganti Password</span></div>
            <div class="card-body settings-body">
              <div class="field-group">
                <label>Password Saat Ini</label>
                <input type="password" id="oldPassword" class="form-input" placeholder="Password lama" autocomplete="current-password">
              </div>
              <div class="field-group">
                <label>Password Baru</label>
                <input type="password" id="newPassword" class="form-input" placeholder="Minimal 8 karakter" autocomplete="new-password">
              </div>
              <div class="field-group">
                <label>Konfirmasi Password Baru</label>
                <input type="password" id="confirmPassword" class="form-input" placeholder="Ulangi password baru" autocomplete="new-password">
              </div>
              <button onclick="changePassword()" class="btn-primary" style="width:100%;justify-content:center">
                <i class="fas fa-lock"></i> Ganti Password
              </button>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><span class="card-title"><i class="fab fa-telegram" style="color:#0088cc"></i> Integrasi Telegram</span></div>
            <div class="card-body settings-body">
              <div class="field-group">
                <label>Telegram Bot Token</label>
                <input type="password" id="settingTelegramToken" class="form-input" 
                  value="<?= htmlspecialchars($settings['telegram_bot_token'] ?? '') ?>"
                  placeholder="Token dari @BotFather">
              </div>
              <div class="field-group">
                <label>Telegram Chat ID</label>
                <div style="display:flex;gap:8px">
                  <input type="text" id="settingTelegramId" class="form-input" 
                    value="<?= htmlspecialchars($settings['telegram_chat_id'] ?? '') ?>"
                    placeholder="Contoh: 12345678">
                  <button onclick="saveTelegramId()" class="btn-primary small">Simpan</button>
                </div>
                <div style="margin-top:12px;display:flex;gap:8px">
                  <button onclick="testTelegram()" class="btn-ghost small" style="flex:1">
                    <i class="fab fa-telegram-plane"></i> Test Koneksi
                  </button>
                </div>
                <p class="setting-hint" style="margin-top:12px">
                  Dapatkan Chat ID Anda dengan mengirim perintah <code>/start</code> ke Bot Telegram IoTzy.
                </p>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><span class="card-title"><i class="fas fa-network-wired" style="color:var(--a)"></i> Koneksi MQTT</span></div>
            <div class="card-body settings-body">
              <div class="setting-row">
                <div>
                  <div class="setting-row-label">Status Broker</div>
                  <div id="mqttStatusSettings" class="setting-val muted">Disconnected</div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                  <button onclick="connectMQTT()" class="btn-primary small">Hubungkan</button>
                  <button onclick="disconnectMQTT()" class="btn-ghost small">Putus</button>
                </div>
              </div>
              <button onclick="openMQTTConfigModal()" class="btn-ghost full"><i class="fas fa-gear"></i> Konfigurasi Broker</button>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><span class="card-title"><i class="fas fa-brain" style="color:var(--purple)"></i> Computer Vision</span></div>
            <div class="card-body settings-body">
              <div class="setting-toggle-row">
                <div><div class="setting-row-label">Bounding Box</div><div class="setting-hint">Kotak deteksi di sekitar objek</div></div>
                <label class="toggle-wrapper">
                  <input type="checkbox" id="cvShowBoundingBoxSettings" checked onchange="toggleBoundingBox(this.checked)" class="toggle-input">
                  <span class="toggle-track"></span>
                </label>
              </div>
              <div class="setting-toggle-row">
                <div><div class="setting-row-label">Debug Overlay</div><div class="setting-hint">Informasi deteksi di layar kamera</div></div>
                <label class="toggle-wrapper">
                  <input type="checkbox" id="cvShowDebugInfoSettings" checked onchange="toggleDebugInfo(this.checked)" class="toggle-input">
                  <span class="toggle-track"></span>
                </label>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><span class="card-title"><i class="fas fa-circle-info" style="color:var(--a)"></i> Info Aplikasi</span></div>
            <div class="card-body">
              <div class="info-table">
                <div class="info-row"><span>Versi</span><span class="mono"><?= APP_VERSION ?></span></div>
                <div class="info-row"><span>Perangkat</span><span class="mono" id="totalDevices"><?= count($devices) ?></span></div>
                <div class="info-row"><span>Sensor</span><span class="mono" id="totalSensors"><?= count($sensors) ?></span></div>
                <div class="info-row"><span>Login sebagai</span><span class="mono"><?= htmlspecialchars($user['username']) ?></span></div>
                <div class="info-row"><span>Role</span><span class="mono"><?= htmlspecialchars($user['role']) ?></span></div>
              </div>
            </div>
          </div>

          <div class="card" style="border-color:rgba(220,38,38,.2)">
            <div class="card-header"><span class="card-title" style="color:var(--red)"><i class="fas fa-triangle-exclamation"></i> Zona Berbahaya</span></div>
            <div class="card-body settings-body">
              <p class="setting-hint" style="margin-bottom:16px">Tindakan ini tidak dapat dibatalkan.</p>
              <div style="display:flex;gap:10px;flex-wrap:wrap">
                <button onclick="clearLogs()" class="btn-ghost red"><i class="fas fa-trash"></i> Hapus Semua Log</button>
                <a href="logout.php" class="btn-danger"><i class="fas fa-right-from-bracket"></i> Logout</a>
              </div>
            </div>
          </div>
        </div>
      </div>
