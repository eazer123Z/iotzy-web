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
<meta name="theme-color" content="#06111f">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<link rel="stylesheet" href="<?= iotzyAssetUrl('css/auth.css') ?>">
</head>
<body class="auth-page" data-auth-mode="login">

<!-- Preloader -->
<div class="auth-preloader" id="authPreloader">
  <div class="preloader-content">
    <div class="preloader-logo"><i class="fas fa-bolt"></i></div>
    <div class="preloader-text">IoTzy</div>
    <div class="preloader-sub">Memuat<span class="loading-dots"></span></div>
  </div>
  <div class="wave-container">
    <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
      <path class="wave wave-1" d="M0,192L48,186.7C96,181,192,171,288,186.7C384,203,480,245,576,250.7C672,256,768,224,864,208C960,192,1056,192,1152,202.7C1248,213,1344,235,1392,245.3L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"/>
      <path class="wave wave-2" d="M0,256L48,240C96,224,192,192,288,181.3C384,171,480,181,576,197.3C672,213,768,235,864,229.3C960,224,1056,192,1152,181.3C1248,171,1344,181,1392,186.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"/>
      <path class="wave wave-3" d="M0,288L48,272C96,256,192,224,288,218.7C384,213,480,235,576,245.3C672,256,768,256,864,240C960,224,1056,192,1152,186.7C1248,181,1344,203,1392,213.3L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"/>
    </svg>
  </div>
</div>

<!-- Floating orbs -->
<div class="auth-orb auth-orb-1"></div>
<div class="auth-orb auth-orb-2"></div>
<div class="auth-orb auth-orb-3"></div>

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
