function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

async function apiPost(action, data = {}) {
  try {
    const base = (typeof APP_BASE !== "undefined" ? APP_BASE.replace(/\/$/, "") : "") + "/api/router.php";
    const hdrs = { "Content-Type": "application/json" };
    if (typeof CSRF_TOKEN !== "undefined") hdrs["X-CSRF-Token"] = CSRF_TOKEN;
    
    const res  = await fetch(`${base}?action=${action}`, {
      method:  "POST",
      headers: hdrs,
      credentials: "include", 
      body:    JSON.stringify(data),
    });

    if (res.status === 401) {
      window.location.href = (typeof APP_BASE !== "undefined" ? APP_BASE : "") + "/?route=login&expired=true";
      return null;
    }
    if (res.status === 403) {
      showToast("Access Denied (403)", "error");
      return null;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    if (e.name !== 'AbortError') {
       showToast(`API error: ${action}`, "error");
    }
    return null;
  }
}
