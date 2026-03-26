/**
 * assets/js/modules/settings-manager.js
 * ───
 * Manages settings panel interactions — ID sesuai dengan settings.php V2.
 */

async function saveProfile() {
  const fullName = document.getElementById("settFullName")?.value.trim();
  const email    = document.getElementById("settEmail")?.value.trim();
  if (!email) { showToast("Email tidak boleh kosong!", "warning"); return; }
  const result = await apiPost("update_profile", { full_name: fullName, email });
  if (result?.success) showToast("Profil disimpan!", "success");
  else showToast(result?.error || "Gagal menyimpan profil", "error");
}

async function saveTelegramSettings() {
  const chatId = document.getElementById("settTelegramChatId")?.value.trim();
  const result = await apiPost("save_settings", { telegram_chat_id: chatId });
  if (result?.success) {
    showToast("Telegram Chat ID berhasil disimpan!", "success");
    if (typeof PHP_SETTINGS !== 'undefined') PHP_SETTINGS.telegram_chat_id = chatId;
  } else {
    showToast(result?.error || "Gagal menyimpan Chat ID Telegram", "error");
  }
}

async function saveMQTTSettings() {
  const data = {
    mqtt_broker:    document.getElementById("mqttBroker")?.value.trim(),
    mqtt_port:      parseInt(document.getElementById("mqttPort")?.value) || 8884,
    mqtt_path:      document.getElementById("mqttPath")?.value.trim() || "/mqtt",
    mqtt_client_id: document.getElementById("mqttClientId")?.value.trim(),
    mqtt_username:  document.getElementById("mqttUsername")?.value.trim(),
    mqtt_password:  document.getElementById("mqttPassword")?.value,
    mqtt_use_ssl:   document.getElementById("mqttUseSSL")?.checked ? 1 : 0,
  };
  const result = await apiPost("save_settings", data);
  if (result?.success) showToast("Konfigurasi MQTT disimpan!", "success");
  else showToast(result?.error || "Gagal menyimpan MQTT", "error");
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
  const oldP = document.getElementById("settOldPassword")?.value;
  const newP = document.getElementById("settNewPassword")?.value;
  const conP = document.getElementById("settConfirmPassword")?.value;
  if (!oldP || !newP || !conP) { showToast("Semua field harus diisi!", "warning"); return; }
  if (newP !== conP)           { showToast("Password baru tidak cocok!", "warning"); return; }
  if (newP.length < 8)        { showToast("Password minimal 8 karakter!", "warning"); return; }
  const result = await apiPost("change_password", { current_password: oldP, new_password: newP });
  if (result?.success) {
    showToast("Password berhasil diubah!", "success");
    ["settOldPassword", "settNewPassword", "settConfirmPassword"].forEach((id) => {
      const el = document.getElementById(id); if (el) el.value = "";
    });
  } else showToast(result?.error || "Gagal mengubah password", "error");
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
