<?php ?>
<!DOCTYPE html>
<html lang="id" data-theme="<?= htmlspecialchars($settings['theme'] ?? 'dark') ?>">
<head>
<meta charset="UTF-8">
<title>IoTzy — Smart Home Dashboard</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="IoTzy Smart Home Dashboard — Monitor & kontrol perangkat IoT Anda secara real-time">
<meta name="theme-color" content="#080912">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta http-equiv="X-Frame-Options" content="SAMEORIGIN">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/paho-mqtt/1.0.1/mqttws31.min.js"></script>
<script>const CSRF_TOKEN = "<?= $_SESSION['csrf_token'] ?? '' ?>";</script>
<link rel="stylesheet" href="<?= ASSET_URL ?>/css/dashboard.css?v=<?= APP_VERSION ?>">
</head>
<body>

<!-- Loading Screen -->
<div id="appLoadingScreen" class="loading-screen">
  <div class="loading-inner">
    <div class="loading-logo"><i class="fas fa-bolt"></i></div>
    <h1 class="loading-title">IoTzy</h1>
    <div class="loading-bar"><div class="loading-fill"></div></div>
    <p class="loading-sub">Memuat sistem…</p>
  </div>
</div>

<div id="mainApp" class="app-shell opacity-0">
