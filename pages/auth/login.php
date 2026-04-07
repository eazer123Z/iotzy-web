<?php
$error = $error ?? null;
$csrf  = $csrf ?? (function_exists('generateCsrfToken') ? generateCsrfToken() : '');
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>IoTzy — Login</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#edf8ff">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<link rel="stylesheet" href="<?= iotzyAssetUrl('css/auth.css') ?>">
</head>
<body class="auth-page" data-auth-mode="login">

<div class="wrap">

<div class="header">
<div class="logo"><i class="fas fa-bolt"></i></div>
<h1 class="title">IoTzy</h1>
<p class="sub">Smart Room</p>
</div>

<div class="card">

<?php if (!empty($error)): ?>
<div class="alert error">
<i class="fas fa-circle-exclamation"></i>
<?= htmlspecialchars($error) ?>
</div>
<?php endif; ?>

<?php if (isset($_GET['registered'])): ?>
<div class="alert success">
<i class="fas fa-check-circle"></i>
Akun berhasil dibuat. Silakan login.
</div>
<?php endif; ?>

<?php if (isset($_GET['logout'])): ?>
<div class="alert success">
<i class="fas fa-check-circle"></i>
Anda telah berhasil logout.
</div>
<?php endif; ?>

<form method="POST" class="auth-form" data-auth-mode="login" data-loading-text="Menghubungkan..." data-success-url="<?= htmlspecialchars(APP_URL . '/', ENT_QUOTES, 'UTF-8') ?>">

<input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrf) ?>">
<input type="hidden" name="action" value="login">

<div class="form-group">
<label class="form-label">Username atau Email</label>
<div class="input-wrap">
<i class="fas fa-user input-icon"></i>
<input type="text" name="username" class="form-input"
  placeholder="Masukkan username"
  value="<?= htmlspecialchars($_POST['username'] ?? '') ?>"
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

<button type="submit" name="login_submit" class="btn">
<i class="fas fa-right-to-bracket"></i>
Masuk ke Dashboard
</button>

</form>

<div class="bottom-link">
Belum punya akun?
<a href="<?= APP_URL ?>/?route=register">Daftar sekarang</a>
</div>

</div>

<div class="footer">
IoTzy By Rendy Aulia Nur
</div>

</div>

<script defer src="<?= iotzyAssetUrl('js/auth.js') ?>"></script>
</body>
</html>
