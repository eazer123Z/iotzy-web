async function saveProfile() {
  const fullName = document.getElementById("settingFullName")?.value.trim();
  const email    = document.getElementById("settingEmail")?.value.trim();
  if (!email) { showToast("Email tidak boleh kosong!", "warning"); return; }
  const result = await apiPost("update_profile", { full_name: fullName, email });
  if (result?.success) showToast("Profil disimpan!", "success");
  else showToast(result?.error || "Gagal menyimpan profil", "error");
}

async function saveTelegramId() {
  const telegramId = document.getElementById("settingTelegramId")?.value.trim();
  const result = await apiPost("save_settings", { telegram_chat_id: telegramId });
  if (result?.success) {
    showToast("Telegram Chat ID berhasil disimpan!", "success");
    if (typeof PHP_SETTINGS !== 'undefined') PHP_SETTINGS.telegram_chat_id = telegramId;
  } else {
    showToast(result?.error || "Gagal menyimpan Chat ID Telegram", "error");
  }
}

async function testTelegram() {
  const btn = event?.currentTarget || document.getElementById('btnTestTelegram');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengetes...';
  }
  showToast("Sedang mencoba mengirim pesan test...", "info");
  const result = await apiPost("test_telegram", {});
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fab fa-telegram-plane"></i> Test Koneksi';
  }
  if (result?.success) showToast(result.message, "success");
  else showToast(result?.error || "Gagal mengetes koneksi Telegram", "error");
}

async function changePassword() {
  const oldP = document.getElementById("oldPassword")?.value;
  const newP = document.getElementById("newPassword")?.value;
  const conP = document.getElementById("confirmPassword")?.value;
  if (!oldP || !newP || !conP) { showToast("Semua field harus diisi!", "warning"); return; }
  if (newP !== conP)           { showToast("Password baru tidak cocok!", "warning"); return; }
  if (newP.length < 8)         { showToast("Password minimal 8 karakter!", "warning"); return; }
  const result = await apiPost("change_password", { current_password: oldP, new_password: newP });
  if (result?.success) {
    showToast("Password berhasil diubah!", "success");
    ["oldPassword", "newPassword", "confirmPassword"].forEach((id) => {
      const el = document.getElementById(id); if (el) el.value = "";
    });
  } else showToast(result?.error || "Gagal mengubah password", "error");
}
