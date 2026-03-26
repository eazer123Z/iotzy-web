/**
 * assets/js/modules/settings-manager.js
 * ───
 * Manages settings panel interactions — ID sesuai dengan settings.php V2.
 */

let isSettingsBusy = false;

async function saveProfile() {
  if (isSettingsBusy) return;
  const fullName = document.getElementById("settFullName")?.value.trim();
  const email    = document.getElementById("settEmail")?.value.trim();
  const btn      = document.getElementById("btnSaveProfile");
  
  if (!email) { showToast("Email tidak boleh kosong!", "warning"); return; }
  
  try {
    isSettingsBusy = true;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...'; }

    const result = await apiPost("update_profile", { full_name: fullName, email });
    if (result?.success) showToast("Profil berhasil diperbarui!", "success");
    else showToast(result?.error || "Gagal menyimpan profil", "error");
  } catch (err) {
    showToast("Terjadi kesalahan sistem", "error");
  } finally {
    isSettingsBusy = false;
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Simpan Profil'; }
  }
}

async function saveTelegramSettings() {
  if (isSettingsBusy) return;
  const chatId = document.getElementById("settTelegramChatId")?.value.trim();
  const btn    = document.getElementById("btnSaveTelegram");
  
  try {
    isSettingsBusy = true;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> menyimpan...'; }

    const result = await apiPost("save_settings", { telegram_chat_id: chatId });
    if (result?.success) {
      showToast("Telegram Chat ID berhasil disimpan!", "success");
      if (typeof PHP_SETTINGS !== 'undefined') PHP_SETTINGS.telegram_chat_id = chatId;
    } else {
      showToast(result?.error || "Gagal menyimpan Chat ID Telegram", "error");
    }
  } catch (err) {
    showToast("Terjadi kesalahan sistem", "error");
  } finally {
    isSettingsBusy = false;
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Simpan'; }
  }
}

async function saveMQTTSettings() {
  if (isSettingsBusy) return;
  const btn = document.getElementById("btnSaveMQTT");
  const data = {
    mqtt_broker:    document.getElementById("mqttBroker")?.value.trim(),
    mqtt_port:      parseInt(document.getElementById("mqttPort")?.value) || 8884,
    mqtt_path:      document.getElementById("mqttPath")?.value.trim() || "/mqtt",
    mqtt_client_id: document.getElementById("mqttClientId")?.value.trim(),
    mqtt_username:  document.getElementById("mqttUsername")?.value.trim(),
    mqtt_password:  document.getElementById("mqttPassword")?.value,
    mqtt_use_ssl:   document.getElementById("mqttUseSSL")?.checked ? 1 : 0,
  };

  try {
    isSettingsBusy = true;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...'; }

    const result = await apiPost("save_settings", data);
    if (result?.success) {
      showToast("Konfigurasi MQTT berhasil disimpan!", "success");
      if (typeof PHP_SETTINGS !== 'undefined') Object.assign(PHP_SETTINGS, data);
    } else {
      showToast(result?.error || "Gagal menyimpan MQTT", "error");
    }
  } catch (err) {
    showToast("Terjadi kesalahan sistem", "error");
  } finally {
    isSettingsBusy = false;
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Simpan MQTT'; }
  }
}

async function saveAutomationSettings() {
  if (isSettingsBusy) return;
  const btn = document.getElementById("btnSaveAuto");
  const data = {
    automation_lamp:    document.getElementById("settAutoLamp")?.checked ? 1 : 0,
    automation_fan:     document.getElementById("settAutoFan")?.checked ? 1 : 0,
    automation_lock:    document.getElementById("settAutoLock")?.checked ? 1 : 0,
    lamp_on_threshold:  parseFloat(document.getElementById("settLampOnThr")?.value) || 0.3,
    lamp_off_threshold: parseFloat(document.getElementById("settLampOffThr")?.value) || 0.7,
    fan_temp_high:      parseFloat(document.getElementById("settFanHigh")?.value) || 30,
    fan_temp_normal:    parseFloat(document.getElementById("settFanNormal")?.value) || 25,
    lock_delay:         parseInt(document.getElementById("settLockDelay")?.value) || 5000,
  };

  try {
    isSettingsBusy = true;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...'; }

    const result = await apiPost("save_settings", data);
    if (result?.success) {
      showToast("Pengaturan Otomasi disimpan!", "success");
      if (typeof PHP_SETTINGS !== 'undefined') Object.assign(PHP_SETTINGS, data);
    } else {
      showToast(result?.error || "Gagal menyimpan otomasi", "error");
    }
  } catch (err) {
    showToast("Terjadi kesalahan sistem", "error");
  } finally {
    isSettingsBusy = false;
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Simpan Otomasi'; }
  }
}

async function saveCVSettings() {
  if (isSettingsBusy) return;
  const btn = document.getElementById("btnSaveCV");
  const data = {
    cv_min_confidence:  parseFloat(document.getElementById("settCvConfidence")?.value) || 0.5,
    cv_dark_threshold:  parseFloat(document.getElementById("settCvDark")?.value) || 0.3,
    cv_bright_threshold: parseFloat(document.getElementById("settCvBright")?.value) || 0.7,
  };

  try {
    isSettingsBusy = true;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...'; }

    const result = await apiPost("save_settings", data);
    if (result?.success) {
      showToast("Pengaturan AI berhasil disimpan!", "success");
      if (typeof PHP_SETTINGS !== 'undefined') Object.assign(PHP_SETTINGS, data);
    } else {
      showToast(result?.error || "Gagal menyimpan AI setting", "error");
    }
  } catch (err) {
    showToast("Terjadi kesalahan sistem", "error");
  } finally {
    isSettingsBusy = false;
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Simpan AI Setting'; }
  }
}

async function testTelegram() {
  const btn = event?.currentTarget;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengetes...';
  }
  showToast("Sedang mencoba mengirim pesan test...", "info");
  const result = await apiPost("test_telegram", {});
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Tes Kirim';
  }
  if (result?.success) showToast(result.message, "success");
  else showToast(result?.error || "Gagal mengetes koneksi Telegram", "error");
}

async function changePasswordFromSettings() {
  if (isSettingsBusy) return;
  const oldP = document.getElementById("settOldPassword")?.value;
  const newP = document.getElementById("settNewPassword")?.value;
  const conP = document.getElementById("settConfirmPassword")?.value;
  const btn  = document.getElementById("btnSaveSecurity");

  if (!oldP || !newP || !conP) { showToast("Semua field harus diisi!", "warning"); return; }
  if (newP !== conP)           { showToast("Password baru tidak cocok!", "warning"); return; }
  if (newP.length < 8)        { showToast("Password minimal 8 karakter!", "warning"); return; }
  
  try {
    isSettingsBusy = true;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...'; }

    const result = await apiPost("change_password", { current_password: oldP, new_password: newP });
    if (result?.success) {
      showToast("Password berhasil diubah!", "success");
      ["settOldPassword", "settNewPassword", "settConfirmPassword"].forEach((id) => {
        const el = document.getElementById(id); if (el) el.value = "";
      });
    } else {
      showToast(result?.error || "Gagal mengubah password", "error");
    }
  } catch (err) {
    showToast("Terjadi kesalahan sistem", "error");
  } finally {
    isSettingsBusy = false;
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-key"></i> Ganti Password'; }
  }
}

function applyMQTTTemplate(slug) {
  if (!slug) return;
  const templates = STATE.mqtt.templates || [];
  const t = templates.find(x => x.slug === slug);
  if (!t) return;
  const g = id => document.getElementById(id);
  if (g("mqttBroker"))   g("mqttBroker").value   = t.broker || "";
  if (g("mqttPort"))     g("mqttPort").value     = t.port || 8884;
  if (g("mqttPath"))     g("mqttPath").value     = t.path || "/mqtt";
  if (g("mqttUsername"))  g("mqttUsername").value  = t.username || "";
  if (g("mqttUseSSL"))   g("mqttUseSSL").checked = !!t.use_ssl;
  showToast(`Template ${t.name} diterapkan`, "info");
}

// Load MQTT Templates
async function loadMQTTTemplates() {
  const result = await apiPost("get_mqtt_templates", {});
  if (result?.success && result.templates) {
    STATE.mqtt.templates = result.templates;
    const sel = document.getElementById("mqttTemplate");
    if (sel) {
      sel.innerHTML = '<option value="">— Pilih Template Broker —</option>';
      result.templates.forEach(t => {
        sel.innerHTML += `<option value="${t.slug}">${t.name}</option>`;
      });
    }
  }
}

// Slider Value Real-time Display
document.addEventListener('input', (e) => {
  if (e.target.type === 'range' && e.target.id.startsWith('sett')) {
    const val = e.target.value;
    const span = e.target.nextElementSibling;
    if (span && span.tagName === 'SPAN') {
      if (e.target.id.includes('Lamp') || e.target.id.includes('Cv')) {
        span.textContent = Math.round(val * 100) + '%';
      } else if (e.target.id.includes('Fan')) {
        span.textContent = val + '°C';
      }
    }
  }
});

// Auto-run templates load
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('settings')) loadMQTTTemplates();
});
