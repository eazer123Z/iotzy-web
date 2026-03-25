function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const icons = {
    success: "fa-check-circle", error: "fa-times-circle",
    warning: "fa-exclamation-triangle", info: "fa-circle-info",
  };
  const toast   = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas ${icons[type] || icons.info} toast-icon"></i>
    <span class="toast-msg">${escHtml(message)}</span>
    <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity    = "0";
    toast.style.transform  = "translateX(12px)";
    toast.style.transition = "all .3s";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function initTheme() {
  const saved = localStorage.getItem('iotzy-theme') || (typeof PHP_SETTINGS !== 'undefined' ? PHP_SETTINGS.theme : null) || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('iotzy-theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;
  const icon = btn.querySelector('i');
  if (!icon) return;
  icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove("show");
    document.body.style.overflow = "";
  }
}
