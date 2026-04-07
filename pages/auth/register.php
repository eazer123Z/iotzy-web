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
<meta name="theme-color" content="#edf8ff">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<link rel="stylesheet" href="<?= iotzyAssetUrl('css/auth.css') ?>">
</head>
<body class="auth-page" data-auth-mode="register">

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

<form method="POST" class="auth-form" data-auth-mode="register" data-loading-text="Memproses..." data-success-url="<?= htmlspecialchars(APP_URL . '/?route=login&registered=1', ENT_QUOTES, 'UTF-8') ?>">
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

<script defer src="<?= iotzyAssetUrl('js/auth.js') ?>"></script>
</body>
</html>
