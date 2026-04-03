<?php
// api/set_webhook.php
require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/auth.php'; // Updated include path
require_once __DIR__ . '/../config/telegram.php';
require_once __DIR__ . '/../core/UserDataService.php'; // Updated include path

$secret = defined('APP_SECRET') ? APP_SECRET : '';
if (!$secret) {
    http_response_code(500);
    die('Server configuration error: APP_SECRET missing');
}
if (($_GET['token'] ?? '') !== $secret) {
    http_response_code(403);
    die("Akses Ditolak. Gunakan token yang benar.");
}

if (!isLoggedIn()) {
    die("❌ Silakan login ke dashboard IoTzy terlebih dahulu.");
}

$user = getCurrentUser();
$userId = $user['id'];

$db = getLocalDB();
if (!$db) die("Database connection failed.");

$stmt = $db->prepare("SELECT telegram_bot_token FROM user_settings WHERE user_id = ?");
$stmt->execute([$userId]);
$userToken = $stmt->fetchColumn();

$botToken = !empty($userToken) ? readStoredSecret($userToken) : (defined('TELEGRAM_BOT_TOKEN') ? TELEGRAM_BOT_TOKEN : null);

if (!$botToken) {
    die("❌ Error: Bot Token belum diatur di Pengaturan maupun Config.");
}

$currentAppUrl = defined('APP_URL') ? APP_URL : '';
if (empty($currentAppUrl) || strpos($currentAppUrl, 'http') !== 0) {
    die("❌ Error: APP_URL di .env masih kosong atau tidak valid.");
}

// Updated from telegram_webhook.php to telegram.php based on new flat naming convention
$webhookUrl = rtrim($currentAppUrl, '/') . '/api/telegram.php?token=' . $secret;
$url = "https://api.telegram.org/bot{$botToken}/setWebhook?url=" . urlencode($webhookUrl);

echo "<h3>Telegram Webhook Registration</h3>";
echo "URL Webhook: <b>" . $webhookUrl . "</b><br><br>";

$response = false;
if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_CONNECTTIMEOUT => 8,
    ]);
    $raw = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($raw !== false && $status >= 200 && $status < 300) {
        $response = $raw;
    }
}
if ($response === false) {
    $raw = @file_get_contents($url);
    if ($raw !== false) {
        $response = $raw;
    }
}
if ($response === false) {
    echo "❌ Gagal menghubungi API Telegram. Pastikan Token Bot Anda benar.";
} else {
    echo "Respon dari Telegram: <pre>" . $response . "</pre>";
    $resObj = json_decode($response, true);
    if ($resObj && $resObj['ok']) {
        echo "<br><h4 style='color:green'>✅ Webhook Berhasil Terpasang!</h4>";
    } else {
        echo "<br><h4 style='color:red'>❌ Gagal: " . ($resObj['description'] ?? 'Error') . "</h4>";
    }
}
