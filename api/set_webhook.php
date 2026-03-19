<?php
// api/set_webhook.php
require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../config/telegram.php';

// Proteksi: Hanya bisa dijalankan jika menyertakan token rahasia di URL
$secret = 'iotzy_super_secret_123';
if (($_GET['token'] ?? '') !== $secret) {
    http_response_code(403);
    die("Akses Ditolak. Gunakan token yang benar.");
}

// Webhook ini dipanggil oleh user yang sedang login di browser
if (!isLoggedIn()) {
    die("❌ Silakan login ke dashboard IoTzy terlebih dahulu.");
}

$user = getCurrentUser();
$userId = $user['id'];

// Ambil token dari database user
$db = getLocalDB();
$stmt = $db->prepare("SELECT telegram_bot_token FROM user_settings WHERE user_id = ?");
$stmt->execute([$userId]);
$userToken = $stmt->fetchColumn();

// Jika di DB kosong, gunakan default dari config
$botToken = !empty($userToken) ? $userToken : (defined('TELEGRAM_BOT_TOKEN') ? TELEGRAM_BOT_TOKEN : null);

if (!$botToken) {
    die("❌ Error: Bot Token belum diatur di Pengaturan maupun Config.");
}

$webhookUrl = APP_URL . '/api/telegram_webhook.php?token=' . $secret;

// Telegram requires HTTPS for webhooks
if (strpos($webhookUrl, 'https://') !== 0) {
    echo "⚠️ Peringatan: Telegram Webhook memerlukan URL HTTPS.<br>";
    echo "URL saat ini: <b>{$webhookUrl}</b><br>";
    echo "Pastikan APP_URL di config.php sudah menggunakan HTTPS (Ngrok).<br><br>";
}

$url = "https://api.telegram.org/bot{$botToken}/setWebhook?url={$webhookUrl}";

echo "<h3>Telegram Webhook Registration</h3>";
echo "Daftar untuk User ID: <b>$userId</b> (" . htmlspecialchars($user['username']) . ")<br>";
echo "Token yang digunakan: <code>" . substr($botToken, 0, 10) . "..." . substr($botToken, -5) . "</code><br>";
echo "URL Webhook: <b>" . $webhookUrl . "</b><br><br>";

$response = @file_get_contents($url);
if ($response === false) {
    echo "❌ Gagal menghubungi API Telegram. Pastikan Token Bot Anda benar.";
} else {
    echo "Respon dari Telegram: <pre>" . $response . "</pre>";
    $resObj = json_decode($response, true);
    if ($resObj && $resObj['ok']) {
        echo "<br><h4 style='color:green'>✅ Webhook Berhasil Terpasang!</h4>";
        echo "Silakan chat bot Anda di Telegram sekarang.";
    } else {
        echo "<br><h4 style='color:red'>❌ Gagal Memasang Webhook.</h4>";
        echo "Pesan: " . ($resObj['description'] ?? 'Unknown error');
    }
}
