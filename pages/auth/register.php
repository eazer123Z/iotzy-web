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
  --a: #00e5ff; --a-h: #00b8d4; --a-dim: rgba(0, 229, 255, 0.4);
  --ink: #ffffff; --ink-5: rgba(255, 255, 255, 0.5);
  --border: rgba(0, 229, 255, 0.15); --surface: rgba(10, 15, 30, 0.6);
  --r: 16px; --r-2xl: 24px;
}
body {
  font-family: 'Plus Jakarta Sans', sans-serif;
  background: #03050a;
  color: #fff;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-image: 
    radial-gradient(circle at 20% 20%, rgba(0, 229, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(191, 0, 255, 0.08) 0%, transparent 50%);
}
.wrap { width: 100%; max-width: 400px; z-index: 2; animation: fadeIn 0.8s ease; }
.logo {
  width: 72px; height: 72px; border-radius: 20px;
  background: linear-gradient(135deg, var(--a), var(--a-h));
  display: flex; align-items: center; justify-content: center;
  font-size: 32px; color: #fff; margin: 0 auto 20px;
  box-shadow: 0 0 30px var(--a-dim);
  animation: pulse 2s infinite ease-in-out;
}
.title { font-size: 32px; font-weight: 800; text-align: center; margin-bottom: 8px; }
.card {
  background: var(--surface);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border: 1px solid var(--border);
  border-radius: var(--r-2xl);
  padding: 35px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
}
.form-input {
  width: 100%; padding: 12px 15px 12px 42px;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border);
  border-radius: var(--r);
  color: #fff; outline: none; transition: all 0.3s;
}
.form-input:focus { border-color: var(--a); background: rgba(255,255,255,0.06); box-shadow: 0 0 15px var(--a-dim); }
.btn {
  width: 100%; padding: 14px; border-radius: var(--r);
  background: linear-gradient(135deg, var(--a), var(--a-h));
  color: #fff; font-weight: 800; border: none; cursor: pointer;
  box-shadow: 0 10px 20px -5px var(--a-dim);
  transition: all 0.3s;
}
.btn:hover { transform: translateY(-2px); box-shadow: 0 15px 25px -5px var(--a); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
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
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

    const formData = new FormData(e.target);
    try {
        const res = await fetch(window.location.href, {
            method: 'POST',
            body: formData
        });

        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Response text:', text);
            alert('Kesalahan Server (Bukan JSON). Cek konsol browser.');
            btn.disabled = false;
            btn.innerHTML = oldHtml;
            return;
        }

        if (data.success) {
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
