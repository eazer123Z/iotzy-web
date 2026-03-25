<?php
/**
 * core/TelegramService.php
 * ───
 * Helper API untuk integrasi dengan Bot Telegram.
 * Menangani pengiriman pesan notifikasi, Chat Action (typing), 
 * serta validasi token Bot secara dinamis.
 */


require_once __DIR__ . '/bootstrap.php';

/**
 * Sends a message to a Telegram Chat ID using a Bot Token.
 */
function sendTelegramNotification($chatId, $text, $token = null): array {
    if (!$token) {
        $token = defined('TELEGRAM_BOT_TOKEN') ? TELEGRAM_BOT_TOKEN : null;
    }

    if (!$token || !$chatId) {
        return ['success' => false, 'error' => 'Bot Token atau Chat ID tidak valid / belum diset.'];
    }

    // Sanitize text for Telegram HTML (Telegram doesn't support <br>)
    $cleanText = str_ireplace(['<br>', '<br/>', '<br />'], "\n", $text);

    $url  = "https://api.telegram.org/bot{$token}/sendMessage";
    $data = [
        'chat_id'    => $chatId,
        'text'       => $cleanText,
        'parse_mode' => 'HTML'
    ];

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $url,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($data),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);

    $response = curl_exec($ch);
    $error    = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($error) {
        error_log("[Telegram] CURL Error: $error");
        return ['success' => false, 'error' => "CURL Error: $error"];
    }

    $resArr = json_decode($response, true);
    if ($httpCode !== 200) {
        $descr = $resArr['description'] ?? 'Unknown Error';
        error_log("[Telegram] API Error ($httpCode): $descr");
        return ['success' => false, 'error' => "Telegram API Error ($httpCode): $descr"];
    }

    return ['success' => true];
}

/**
 * Sends a chat action (e.g. 'typing') to a Telegram Chat ID.
 */
function sendTelegramAction($chatId, $action = 'typing', $token = null): array {
    if (!$token) {
        $token = defined('TELEGRAM_BOT_TOKEN') ? TELEGRAM_BOT_TOKEN : null;
    }
    if (!$token || !$chatId) {
        return ['success' => false, 'error' => 'Bot Token atau Chat ID tidak valid.'];
    }

    $url  = "https://api.telegram.org/bot{$token}/sendChatAction";
    $data = [
        'chat_id' => $chatId,
        'action'  => $action
    ];

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $url,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($data),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 5,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);

    $response = curl_exec($ch);
    curl_close($ch);
    return ['success' => true];
}
