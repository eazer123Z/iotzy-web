<?php
$error = $error ?? null;
$csrf  = $csrf ?? (function_exists('generateCsrfToken') ? generateCsrfToken() : '');
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>IoTzy — Register</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<style>
:root {
  --bg: #080912;
  --bg-2: #0f1023;
  --surface: rgba(255,255,255,0.05);
  --surface-hover: rgba(255,255,255,0.08);
  --border: rgba(255,255,255,0.08);
  --border-hover: rgba(255,255,255,0.16);
  --accent: #6366f1;
  --accent-light: #818cf8;
  --accent-glow: rgba(99,102,241,0.2);
  --success: #22c55e;
  --success-bg: rgba(34,197,94,0.12);
  --danger: #ef4444;
  --danger-bg: rgba(239,68,68,0.12);
  --text: #e2e8f0;
  --text-secondary: #94a3b8;
  --text-muted: rgba(226,232,240,0.42);
  --heading: #f8fafc;
  --radius: 16px;
  --radius-lg: 24px;
  --shadow: 0 24px 80px rgba(0,0,0,0.45);
}
* { box-sizing: border-box; }
body {
  font-family: 'Plus Jakarta Sans', sans-serif;
  background:
    radial-gradient(circle at top left, rgba(99,102,241,0.22) 0%, transparent 34%),
    radial-gradient(circle at bottom right, rgba(6,182,212,0.16) 0%, transparent 32%),
    linear-gradient(180deg, var(--bg-2) 0%, var(--bg) 100%);
  color: var(--text);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.wrap { width: 100%; max-width: 440px; z-index: 2; animation: fadeIn 0.5s ease; }
.header { text-align: center; margin-bottom: 20px; }
.logo {
  width: 74px; height: 74px; border-radius: 22px;
  background: linear-gradient(135deg, var(--accent), var(--accent-light));
  display: flex; align-items: center; justify-content: center;
  font-size: 32px; color: #fff; margin: 0 auto 18px;
  box-shadow: 0 18px 40px rgba(99,102,241,0.32);
}
.title { font-size: 36px; font-weight: 800; text-align: center; margin-bottom: 6px; color: var(--heading); letter-spacing: -0.03em; }
.sub { color: var(--text-secondary); font-size: 0.98rem; }
.card {
  background: var(--surface);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 35px;
  box-shadow: var(--shadow);
}
.form-group { margin-bottom: 16px; }
.form-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.input-wrap { position: relative; }
.input-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 0.95rem;
}
.form-input {
  width: 100%; padding: 13px 15px 13px 42px;
  background: rgba(8, 9, 18, 0.55);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text); outline: none; transition: all 0.2s ease;
}
.form-input::placeholder { color: var(--text-muted); }
.form-input:focus { border-color: var(--accent); background: var(--surface-hover); box-shadow: 0 0 0 4px var(--accent-glow); }
.btn {
  width: 100%; padding: 14px; border-radius: var(--radius);
  background: linear-gradient(135deg, var(--accent), var(--accent-light));
  color: #fff; font-weight: 800; border: none; cursor: pointer;
  box-shadow: 0 14px 28px rgba(99,102,241,0.26);
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 6px;
}
.btn:hover { transform: translateY(-1px); box-shadow: 0 18px 32px rgba(99,102,241,0.32); }
.btn:disabled { opacity: 0.75; cursor: wait; transform: none; }
.alert {
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: var(--radius);
  padding: 12px 14px;
  margin-bottom: 16px;
  border: 1px solid var(--border);
}
.alert.error { background: var(--danger-bg); color: #fecaca; border-color: rgba(239,68,68,0.2); }
.alert.success { background: var(--success-bg); color: #bbf7d0; border-color: rgba(34,197,94,0.2); }
.bottom-link {
  margin-top: 18px;
  text-align: center;
  color: var(--text-secondary);
}
.bottom-link a {
  color: var(--accent-light);
  text-decoration: none;
  font-weight: 700;
}
.footer {
  margin-top: 16px;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
}
@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>
</head>
<body>

<div class="wrap">

<div class="header">
<div class="logo"><i class="fas fa-user-plus"></i></div>
<h1 class="title">IoTzy</h1>
<p class="sub">Daftar Akun Baru</p>
</div>

<div class="card">

<?php if (!empty($error)): ?>
<div class="alert error">
<i class="fas fa-circle-exclamation"></i>
<?= htmlspecialchars($error) ?>
</div>
<?php endif; ?>

<form method="POST">
<input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrf) ?>">
<input type="hidden" name="action" value="register">

<div class="form-group">
<label class="form-label">Nama Lengkap</label>
<div class="input-wrap">
<i class="fas fa-id-card input-icon"></i>
<input type="text" name="fullname" class="form-input"
  placeholder="Masukkan nama lengkap"
  value="<?= htmlspecialchars($_POST['fullname'] ?? '') ?>"
  required>
</div>
</div>

<div class="form-group">
<label class="form-label">Username</label>
<div class="input-wrap">
<i class="fas fa-user input-icon"></i>
<input type="text" name="username" class="form-input"
  placeholder="Pilih username"
  value="<?= htmlspecialchars($_POST['username'] ?? '') ?>"
  required>
</div>
</div>

<div class="form-group">
<label class="form-label">Email</label>
<div class="input-wrap">
<i class="fas fa-envelope input-icon"></i>
<input type="email" name="email" class="form-input"
  placeholder="alamat@email.com"
  value="<?= htmlspecialchars($_POST['email'] ?? '') ?>"
  required>
</div>
</div>

<div class="form-group">
<label class="form-label">Password</label>
<div class="input-wrap">
<i class="fas fa-lock input-icon"></i>
<input type="password" name="password" class="form-input"
  placeholder="••••••••"
  required>
</div>
</div>

<button type="submit" name="register_submit" class="btn">
<i class="fas fa-user-check"></i>
Buat Akun
</button>

</form>

<div class="bottom-link">
Sudah punya akun?
<a href="<?= APP_URL ?>/?route=login">Login di sini</a>
</div>

</div>

<div class="footer">
IoTzy By Rendy Aulia Nur
</div>

</div>

<script>
document.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const oldHtml = btn.innerHTML;
    const endpoint = '<?= rtrim(APP_URL, "/") ?>/api/index.php?action=register';
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

    const formData = new FormData(e.target);
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'same-origin',
            body: formData
        });

        const text = await res.text();
        let data = null;
        try {
            data = JSON.parse(text);
        } catch (parseErr) {
            console.error('Response text:', text);
            alert('Kesalahan server auth. Respons bukan JSON valid.');
            btn.disabled = false;
            btn.innerHTML = oldHtml;
            return;
        }

        if (res.ok && data.success) {
            window.location.href = data.redirect || '<?= APP_URL ?>/?route=login&registered=1';
        } else {
            alert(data.error || 'Pendaftaran gagal.');
            btn.disabled = false;
            btn.innerHTML = oldHtml;
        }
    } catch (err) {
        console.error('Fetch error:', err);
        alert('Kesalahan Koneksi Jaringan.');
        btn.disabled = false;
        btn.innerHTML = oldHtml;
    }
});
</script>
</body>
</html>
