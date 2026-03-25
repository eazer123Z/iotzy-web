<?php ?>
<!DOCTYPE html>
<html lang="id" data-theme="dark">
<head>
<meta charset="UTF-8">
<title>IoTzy — Smart Home Dashboard</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="IoTzy Smart Home Dashboard">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta http-equiv="X-Frame-Options" content="SAMEORIGIN">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<link href="https://cdn.jsdelivr.net/npm/gridstack@10.0.1/dist/gridstack.min.css" rel="stylesheet"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
<script src="https://cdnjs.cloudflare.com/api/paho-mqtt/1.0.1/mqttws31.min.js"></script>
<link rel="stylesheet" href="<?= ASSET_URL ?>/css/dashboard.css?v=<?= APP_VERSION ?>">
<script>
  window.CSRF_TOKEN = "<?= $_SESSION['csrf_token'] ?? '' ?>";
  window.APP_BASE   = "<?= rtrim(APP_URL, '/') ?>";
</script>
</head>
<body>
<div id="mainApp" class="app-shell">
