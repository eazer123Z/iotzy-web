<?php
/**
 * api/telegram_webhook.php
 * Robust Webhook Handler for Telegram Integration
 */

// 1. Setup Error Logging
ob_start();
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/webhook_errors.log');
error_reporting(E_ALL);

register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && ($error['type'] === E_ERROR || $error['type'] === E_PARSE || $error['type'] === E_COMPILE_ERROR)) {
        file_put_contents(__DIR__ . '/webhook_errors.log', "[" . date('Y-m-d H:i:s') . "] FATAL ERROR: " . $error['message'] . " in " . $error['file'] . " on line " . $error['line'] . "\n", FILE_APPEND);
    }
});

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../services/AIParser.php';
require_once __DIR__ . '/../services/TelegramService.php';
require_once __DIR__ . '/../services/UserService.php';
require_once __DIR__ . '/../services/UserDataService.php';

$content = file_get_contents('php://input');

// DIAGNOSTIC LOGGING
$logFile = __DIR__ . '/webhook_incoming.log';
$logData = "\n--- " . date('Y-m-d H:i:s') . " ---\n";
$logData .= "METHOD: " . $_SERVER['REQUEST_METHOD'] . "\n";
$logData .= "CONTENT_TYPE: " . ($_SERVER['CONTENT_TYPE'] ?? 'N/A') . "\n";
$logData .= "RAW_INPUT: " . $content . "\n";
file_put_contents($logFile, $logData, FILE_APPEND);

$update  = json_decode($content, true);

if (!$update) {
    echo "NO_JSON";
    exit;
}

try {
    if (isset($update['message']['text'])) {
        $chatId = $update['message']['chat']['id'];
        $text   = trim($update['message']['text']);

        $db = getLocalDB();
        if (!$db) {
            sendTelegramNotification($chatId, "❌ Database lokal tidak tersedia saat ini.");
            exit;
        }

        $stmt = $db->prepare("SELECT user_id, telegram_bot_token FROM user_settings WHERE telegram_chat_id = ? LIMIT 1");
        $stmt->execute([$chatId]);
        $userSetting = $stmt->fetch();

        error_log("[Telegram] Chat ID: $chatId | User found: " . ($userSetting ? "YES" : "NO"));

        if (!$userSetting) {
            if (stripos($text, '/start') === 0) {
                $msg = "🤖 <b>Selamat Datang di IoTzy AI Bot!</b>\n\n"
                     . "Saya belum mengenali Anda. Untuk menghubungkan akun ini ke dashboard web Anda:\n\n"
                     . "1. Salin <b>Chat ID</b> ini: <code>{$chatId}</code>\n"
                     . "2. Buka Dashboard Web -> <b>Menu Pengaturan</b>.\n"
                     . "3. Tempel di bagian <b>Integrasi Telegram</b> dan simpan.\n\n"
                     . "Setelah terhubung, Anda bisa langsung memberi perintah lewat chat!";
                sendTelegramNotification($chatId, $msg);
            }
            echo "USER_NOT_FOUND";
            exit;
        }

        $userId = (int)$userSetting['user_id'];
        $userBotToken = $userSetting['telegram_bot_token'] ?: (defined('TELEGRAM_BOT_TOKEN') ? TELEGRAM_BOT_TOKEN : null);

        if (stripos($text, '/start') === 0) {
            sendTelegramNotification($chatId, "✅ Halo! Akun Anda sudah terhubung. Ada yang bisa saya bantu?", $userBotToken);
            echo "GREETED";
            exit;
        }

        if (strtolower($text) === '/ping') {
            sendTelegramNotification($chatId, "🏓 Pong! Webhook Anda aktif. (Time: " . date('H:i:s') . ")", $userBotToken);
            echo "PONG";
            exit;
        }

        // Response "OK" to Telegram immediately if possible, but PHP sync is usually fine
        // sendTelegramNotification($chatId, "⏳ <i>Sedang memproses...</i>", $userBotToken);

        error_log("[Telegram] User ID: $userId | Processing AI for text: $text");
        $aiResult = parse_nl_to_action($userId, $text, getUserDevices($userId), getUserSensors($userId), 'telegram');
        error_log("[Telegram] AI Result: " . ($aiResult['success'] ? "SUCCESS" : "FAIL"));

        if (!$aiResult['success']) {
            $err = $aiResult['error'] ?? 'AI Error';
            sendTelegramNotification($chatId, "❌ <b>Gagal memproses:</b> " . htmlspecialchars($err), $userBotToken);
        } else {
            $data = $aiResult['data'];
            $responseText = $data['response_text'] ?? 'Perintah diproses.';

            if (!empty($data['actions'])) {
                $execRes = execute_ai_actions($userId, $data);
                if (!$execRes['success']) {
                    $errors = implode(', ', $execRes['errors']) ?: 'Action Fail';
                    sendTelegramNotification($chatId, "❌ Gagal eksekusi: " . htmlspecialchars($errors), $userBotToken);
                } else {
                    sendTelegramNotification($chatId, "✅ " . $responseText, $userBotToken);
                    addActivityLog($userId, 'Telegram Bot', "Cmd: $text", 'AI', 'info');
                }
            } else {
                sendTelegramNotification($chatId, "💬 " . $responseText, $userBotToken);
            }
        }
    }
} catch (Exception $e) {
    error_log("Webhook Exception: " . $e->getMessage());
}

while (ob_get_level() > 0) ob_end_clean();
echo "OK";
exit;

