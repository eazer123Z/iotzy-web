/**
 * Manage settings panel interactions.
 */

let isSettingsBusy = false;
let mqttTemplatesPromise = null;
let mqttTemplatesLoaded = false;
let cvSettingsLoadPromise = null;

async function saveProfile() {
  if (isSettingsBusy) return;
  const fullName = document.getElementById("settFullName")?.value.trim();
  const email = document.getElementById("settEmail")?.value.trim();
  const btn = document.getElementById("btnSaveProfile");

  if (!email) {
    showToast("Email tidak boleh kosong!", "warning");
    return;
  }

  try {
    isSettingsBusy = true;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    }

    const result = await apiPost("update_profile", { full_name: fullName, email });
    if (result?.success) showToast("Profil berhasil diperbarui!", "success");
    else showToast(result?.error || "Gagal menyimpan profil", "error");
  } catch (_) {
    showToast("Terjadi kesalahan sistem", "error");
  } finally {
    isSettingsBusy = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Simpan Profil';
    }
  }
}

async function saveTelegramSettings() {
  if (isSettingsBusy) return;
  const chatId = document.getElementById("settTelegramChatId")?.value.trim();
  const btn = document.getElementById("btnSaveTelegram");

  try {
    isSettingsBusy = true;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    }

    const result = await apiPost("save_settings", { telegram_chat_id: chatId });
    if (result?.success) {
      showToast("Telegram Chat ID berhasil disimpan!", "success");
      if (typeof PHP_SETTINGS !== "undefined") PHP_SETTINGS.telegram_chat_id = chatId;
    } else {
      showToast(result?.error || "Gagal menyimpan Chat ID Telegram", "error");
    }
  } catch (_) {
    showToast("Terjadi kesalahan sistem", "error");
  } finally {
    isSettingsBusy = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Simpan';
    }
  }
}

async function saveMQTTSettings() {
  if (isSettingsBusy) return;
  const btn = document.getElementById("btnSaveMQTT");
  const data = {
    mqtt_broker: document.getElementById("mqttBroker")?.value.trim(),
    mqtt_port: parseInt(document.getElementById("mqttPort")?.value, 10) || 8884,
    mqtt_path: document.getElementById("mqttPath")?.value.trim() || "/mqtt",
    mqtt_client_id: document.getElementById("mqttClientId")?.value.trim(),
    mqtt_username: document.getElementById("mqttUsername")?.value.trim(),
    mqtt_password: document.getElementById("mqttPassword")?.value,
    mqtt_use_ssl: document.getElementById("mqttUseSSL")?.checked ? 1 : 0,
  };

  try {
    isSettingsBusy = true;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    }

    const result = await apiPost("save_settings", data);
    if (result?.success) {
      showToast("Konfigurasi MQTT berhasil disimpan!", "success");
      if (typeof PHP_SETTINGS !== "undefined") Object.assign(PHP_SETTINGS, data);
    } else {
      showToast(result?.error || "Gagal menyimpan MQTT", "error");
    }
  } catch (_) {
    showToast("Terjadi kesalahan sistem", "error");
  } finally {
    isSettingsBusy = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Simpan MQTT';
    }
  }
}

async function saveAutomationSettings() {
  if (isSettingsBusy) return;
  const btn = document.getElementById("btnSaveAuto");
  const data = {
    automation_lamp: document.getElementById("settAutoLamp")?.checked ? 1 : 0,
    automation_fan: document.getElementById("settAutoFan")?.checked ? 1 : 0,
    automation_lock: document.getElementById("settAutoLock")?.checked ? 1 : 0,
    lamp_on_threshold: parseFloat(document.getElementById("settLampOnThr")?.value) || 0.3,
    lamp_off_threshold: parseFloat(document.getElementById("settLampOffThr")?.value) || 0.7,
    fan_temp_high: parseFloat(document.getElementById("settFanHigh")?.value) || 30,
    fan_temp_normal: parseFloat(document.getElementById("settFanNormal")?.value) || 25,
    lock_delay: parseInt(document.getElementById("settLockDelay")?.value, 10) || 5000,
  };

  try {
    isSettingsBusy = true;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    }

    const result = await apiPost("save_settings", data);
    if (result?.success) {
      showToast("Pengaturan otomasi disimpan!", "success");
      if (typeof PHP_SETTINGS !== "undefined") Object.assign(PHP_SETTINGS, data);
    } else {
      showToast(result?.error || "Gagal menyimpan otomasi", "error");
    }
  } catch (_) {
    showToast("Terjadi kesalahan sistem", "error");
  } finally {
    isSettingsBusy = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Simpan Otomasi';
    }
  }
}

async function saveCVSettings() {
  if (isSettingsBusy) return;
  const btn = document.getElementById("btnSaveCV");
  const config = {
    minConfidence: parseFloat(document.getElementById("settCvConfidence")?.value) || 0.5,
    darkThreshold: parseFloat(document.getElementById("settCvDark")?.value) || 0.3,
    brightThreshold: parseFloat(document.getElementById("settCvBright")?.value) || 0.7,
    humanEnabled: window.CV?.cvRules?.human?.enabled ?? true,
    lightEnabled: window.CV?.cvRules?.light?.enabled ?? true,
  };

  try {
    isSettingsBusy = true;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    }

    const result = typeof persistCVConfig === "function"
      ? await persistCVConfig(config, { key: "save_cv_config" })
      : await apiPost("save_cv_config", { config }, { key: "save_cv_config" });

    if (result?.success) {
      if (typeof applyCVConfigState === "function") {
        applyCVConfigState(result?.config || config);
      }
      showToast("Pengaturan AI berhasil disimpan!", "success");
    } else {
      showToast(result?.error || "Gagal menyimpan AI setting", "error");
    }
  } catch (_) {
    showToast("Terjadi kesalahan sistem", "error");
  } finally {
    isSettingsBusy = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Simpan AI Setting';
    }
  }
}

async function testTelegram(event) {
  const btn = event?.currentTarget || document.querySelector('[onclick*="testTelegram"]');
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
  const btn = document.getElementById("btnSaveSecurity");

  if (!oldP || !newP || !conP) {
    showToast("Semua field harus diisi!", "warning");
    return;
  }
  if (newP !== conP) {
    showToast("Password baru tidak cocok!", "warning");
    return;
  }
  if (newP.length < 8) {
    showToast("Password minimal 8 karakter!", "warning");
    return;
  }

  try {
    isSettingsBusy = true;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
    }

    const result = await apiPost("change_password", { current_password: oldP, new_password: newP });
    if (result?.success) {
      showToast("Password berhasil diubah!", "success");
      ["settOldPassword", "settNewPassword", "settConfirmPassword"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
    } else {
      showToast(result?.error || "Gagal mengubah password", "error");
    }
  } catch (_) {
    showToast("Terjadi kesalahan sistem", "error");
  } finally {
    isSettingsBusy = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-key"></i> Ganti Password';
    }
  }
}

function applyMQTTTemplate(slug) {
  if (!slug) return;
  const templates = STATE.mqtt.templates || [];
  const template = templates.find((item) => item.slug === slug);
  if (!template) return;

  const get = (id) => document.getElementById(id);
  if (get("mqttBroker")) get("mqttBroker").value = template.broker || "";
  if (get("mqttPort")) get("mqttPort").value = template.port || 8884;
  if (get("mqttPath")) get("mqttPath").value = template.path || "/mqtt";
  if (get("mqttUsername")) get("mqttUsername").value = template.username || "";
  if (get("mqttUseSSL")) get("mqttUseSSL").checked = !!template.use_ssl;
  showToast(`Template ${template.name} diterapkan`, "info");
}

function renderMQTTTemplateOptions(templates = []) {
  const sel = document.getElementById("mqttTemplate");
  if (!sel) return;
  sel.innerHTML = '<option value="">Pilih Template Broker</option>';
  templates.forEach((template) => {
    sel.innerHTML += `<option value="${template.slug}">${template.name}</option>`;
  });
}

async function loadMQTTTemplates(force = false) {
  if (!force && mqttTemplatesLoaded) {
    renderMQTTTemplateOptions(STATE.mqtt.templates || []);
    return STATE.mqtt.templates || [];
  }
  if (!force && mqttTemplatesPromise) {
    return mqttTemplatesPromise;
  }

  mqttTemplatesPromise = (async () => {
    const result = await apiPost("get_mqtt_templates", {}, { key: "get_mqtt_templates" });
    if (result?.success && Array.isArray(result.templates)) {
      STATE.mqtt.templates = result.templates;
      mqttTemplatesLoaded = true;
      renderMQTTTemplateOptions(result.templates);
      return result.templates;
    }
    if (force) mqttTemplatesLoaded = false;
    return [];
  })();

  try {
    return await mqttTemplatesPromise;
  } finally {
    mqttTemplatesPromise = null;
  }
}

async function loadCVSettingsPanel(force = false) {
  if (!force && cvSettingsLoadPromise) {
    return cvSettingsLoadPromise;
  }

  cvSettingsLoadPromise = (async () => {
    const result = await apiPost("get_cv_config", {}, { key: "get_cv_config" });
    if (result && result.success !== false) {
      if (typeof applyCVConfigState === "function") {
        applyCVConfigState(result);
      }
      return result;
    }
    return null;
  })();

  try {
    return await cvSettingsLoadPromise;
  } finally {
    cvSettingsLoadPromise = null;
  }
}

async function ensureSettingsPanelData(panelId) {
  if (panelId === "mqttPanel") {
    return loadMQTTTemplates();
  }
  if (panelId === "cvPanel") {
    return loadCVSettingsPanel();
  }
  return null;
}

document.addEventListener("input", (e) => {
  if (e.target.type !== "range" || !e.target.id.startsWith("sett")) return;
  const val = e.target.value;
  const span = e.target.nextElementSibling;
  if (!span || span.tagName !== "SPAN") return;

  if (e.target.id.includes("Lamp") || e.target.id.includes("Cv")) {
    span.textContent = Math.round(Number(val) * 100) + "%";
  } else if (e.target.id.includes("Fan")) {
    span.textContent = `${val} C`;
  }
});

function initSettingsManager() {
  if (initSettingsManager._initialized) return;
  initSettingsManager._initialized = true;
  if (!document.getElementById("settings")) return;
  const activePanel = document.querySelector(".settings-panel.active")?.id;
  if (activePanel) {
    ensureSettingsPanelData(activePanel).catch(() => {});
  }
}

window.initSettingsManager = initSettingsManager;
