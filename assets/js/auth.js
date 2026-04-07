document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form.auth-form[data-auth-mode]");
  if (!form) return;

  const submitButton = form.querySelector('button[type="submit"]');
  const mode = String(form.dataset.authMode || form.querySelector('input[name="action"]')?.value || "login");
  const successUrl = String(form.dataset.successUrl || "");
  const loadingText = String(form.dataset.loadingText || "Memproses...");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!submitButton) {
      form.submit();
      return;
    }

    const originalHtml = submitButton.innerHTML;
    const resetButton = () => {
      submitButton.disabled = false;
      submitButton.innerHTML = originalHtml;
    };

    submitButton.disabled = true;
    submitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;

    try {
      const response = await fetch(`api/index.php?action=${encodeURIComponent(mode)}`, {
        method: "POST",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "same-origin",
        body: new FormData(form),
      });

      const text = await response.text();
      let payload = null;

      try {
        payload = JSON.parse(text);
      } catch (parseError) {
        console.error("Response text:", text);
        window.alert("Kesalahan server auth. Respons bukan JSON valid.");
        resetButton();
        return;
      }

      if (response.ok && payload?.success) {
        window.location.href = payload.redirect || successUrl || window.location.href;
        return;
      }

      window.alert(payload?.error || (mode === "login" ? "Login gagal." : "Pendaftaran gagal."));
      resetButton();
    } catch (error) {
      console.error("Fetch error:", error);
      window.alert("Kesalahan Koneksi Jaringan.");
      resetButton();
    }
  });
});
