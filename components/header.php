<?php ?>
<!DOCTYPE html>
<html lang="id" data-theme="<?= htmlspecialchars($settings['theme'] ?? 'light') ?>">
<head>
<meta charset="UTF-8">
<title>IoTzy — Smart Home Dashboard</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="IoTzy Smart Home Dashboard — Monitor & kontrol perangkat IoT Anda secara real-time">
<meta name="theme-color" content="#edf8ff">
<meta name="iotzy-build" content="<?= htmlspecialchars(APP_VERSION, ENT_QUOTES, 'UTF-8') ?>">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<script>const CSRF_TOKEN = "<?= $_SESSION['csrf_token'] ?? '' ?>";</script>
<link rel="stylesheet" href="<?= iotzyAssetUrl('css/dashboard.css') ?>">
</head>
<body>

<!-- Loading Screen -->
<div id="appLoadingScreen" class="loading-screen">
  <div class="loading-inner">
    <div class="loading-logo" aria-hidden="true">
      <svg class="loading-logo-mark" viewBox="0 0 24 24" role="presentation" focusable="false">
        <path d="M13 2L5 13h5l-1 9 8-11h-5l1-9z" fill="currentColor"></path>
      </svg>
    </div>
    <h1 class="loading-title">IoTzy</h1>
    <div class="loading-bar"><div class="loading-fill"></div></div>
    <p class="loading-sub">Memuat sistem…</p>
  </div>
</div>

<div id="mainApp" class="app-shell opacity-0">
