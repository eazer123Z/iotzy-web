<?php

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/AIParser.php';
require_once __DIR__ . '/../core/TelegramService.php';
require_once __DIR__ . '/../core/UserDataService.php';

function iotzyAiRateLimit(PDO $db, int $userId, int $limit = 20, int $windowSec = 60): array
{
    $db->prepare("CREATE TABLE IF NOT EXISTS ai_rate_limits (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        action_name VARCHAR(50) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_ai_rate_limits_user_time (user_id, action_name, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4")->execute();
    $db->prepare("DELETE FROM ai_rate_limits WHERE created_at < DATE_SUB(NOW(), INTERVAL 2 DAY)")->execute();
    $stmt = $db->prepare("SELECT COUNT(*) FROM ai_rate_limits WHERE user_id=? AND action_name='ai_chat_process' AND created_at>=DATE_SUB(NOW(), INTERVAL ? SECOND)");
    $stmt->execute([$userId, $windowSec]);
    $count = (int)$stmt->fetchColumn();
    if ($count >= $limit) {
        return ['allowed' => false, 'retry_after' => 5];
    }
    $db->prepare("INSERT INTO ai_rate_limits (user_id,action_name) VALUES (?, 'ai_chat_process')")->execute([$userId]);
    return ['allowed' => true, 'retry_after' => 0];
}

function iotzyCanonicalCvState(?array $raw): ?array
{
    if (!is_array($raw)) {
        return null;
    }
    $allowedLight = ['dark', 'normal', 'bright', 'unknown'];
    $normalized = [
        'is_active' => (int)(bool)($raw['is_active'] ?? $raw['active'] ?? 0),
        'model_loaded' => (int)(bool)($raw['model_loaded'] ?? $raw['modelLoaded'] ?? 0),
        'person_count' => max(0, min(20, (int)($raw['person_count'] ?? $raw['personCount'] ?? 0))),
        'brightness' => max(0, min(100, (int)($raw['brightness'] ?? 0))),
        'light_condition' => strtolower(trim((string)($raw['light_condition'] ?? $raw['lightCondition'] ?? 'unknown'))),
    ];
    if (!in_array($normalized['light_condition'], $allowedLight, true)) {
        $normalized['light_condition'] = 'unknown';
    }
    return $normalized;
}

function iotzyCvStateChecksum(array $state): string
{
    $token = (string)($_SESSION['csrf_token'] ?? '');
    ksort($state);
    $str = json_encode($state, JSON_UNESCAPED_UNICODE) . '|' . $token;
    $hash = 2166136261;
    $len = strlen($str);
    for ($i = 0; $i < $len; $i++) {
        $hash ^= ord($str[$i]);
        $hash += ($hash << 1) + ($hash << 4) + ($hash << 7) + ($hash << 8) + ($hash << 24);
        $hash &= 0xFFFFFFFF;
    }
    return str_pad(dechex($hash), 8, '0', STR_PAD_LEFT);
}

function iotzyValidateMessage(string $msg): ?string
{
    $trimmed = trim($msg);
    if ($trimmed === '') {
        return null;
    }
    if (mb_strlen($trimmed) > AI_CHAT_MAX_MESSAGE_LEN) {
        return mb_substr($trimmed, 0, AI_CHAT_MAX_MESSAGE_LEN);
    }
    return $trimmed;
}

function handleAIChatAction(string $action, int $userId, array $body, PDO $db): void {
    if ($action === 'ai_chat_process') {
        $rl = iotzyAiRateLimit($db, $userId, 20, 60);
        if (!$rl['allowed']) {
            jsonOut(['success' => false, 'error' => 'Terlalu banyak permintaan AI. Coba lagi beberapa detik.', 'retry_after' => $rl['retry_after']], 429);
        }
        $msg = iotzyValidateMessage((string)($body['message'] ?? ''));
        if (!$msg) jsonOut(['success'=>false,'error'=>'Pesan kosong']);
        $sessionStart = $body['session_start'] ?? null;
        $cvState = iotzyCanonicalCvState($body['cv_state'] ?? null);
        if ($cvState && !empty($body['cv_state_checksum'])) {
            $expected = iotzyCvStateChecksum($cvState);
            if (!hash_equals($expected, (string)$body['cv_state_checksum'])) {
                $cvState = null;
            }
        } else {
            $cvState = null;
        }
        $parsed = parse_nl_to_action($userId, $msg, [], [], 'web', $cvState, $sessionStart);
        if (!$parsed['success']) jsonOut($parsed);
        $exec = execute_ai_actions($userId, $parsed['data']);
        $parsed['data']['execution'] = $exec;
        jsonOut($parsed);
    }

    if ($action === 'ai_chat_fast_track') {
        $msg = iotzyValidateMessage((string)($body['message'] ?? ''));
        $reply = iotzyValidateMessage((string)($body['reply'] ?? ''));
        if (!$msg || !$reply) {
            jsonOut(['success' => false, 'error' => 'Payload fast handler tidak valid'], 400);
        }
        iotzy_save_message($userId, $db, 'user', $msg, 'web');
        iotzy_save_message($userId, $db, 'bot', $reply, 'web');
        jsonOut(['success' => true]);
    }

    if ($action === 'delete_chat_history') {
        $stmt = $db->prepare("DELETE FROM ai_chat_history WHERE user_id=?");
        if ($stmt->execute([$userId])) {
            addActivityLog($userId, 'AI System', 'Riwayat chat AI telah dibersihkan', 'User', 'warning');
            jsonOut(['success' => true, 'message' => 'History chat AI berhasil dihapus']);
        } else {
            jsonOut(['success' => false, 'error' => 'Gagal menghapus riwayat dari database']);
        }
    }

    if ($action === 'get_ai_chat_history') {
        $stmt = $db->prepare("SELECT sender,message,platform,created_at FROM ai_chat_history WHERE user_id=? ORDER BY created_at ASC LIMIT 50");
        $stmt->execute([$userId]);
        jsonOut(['success'=>true,'history'=>$stmt->fetchAll()]);
    }

    if ($action === 'get_ai_token_metrics') {
        $db->prepare("CREATE TABLE IF NOT EXISTS ai_token_metrics (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            user_id INT UNSIGNED NOT NULL,
            prompt_tokens INT UNSIGNED NOT NULL,
            history_tokens INT UNSIGNED NOT NULL,
            context_tokens INT UNSIGNED NOT NULL,
            response_tokens INT UNSIGNED NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_ai_token_metrics_user_time (user_id, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4")->execute();
        $stmt = $db->prepare("SELECT prompt_tokens,history_tokens,context_tokens,response_tokens,created_at FROM ai_token_metrics WHERE user_id=? ORDER BY created_at DESC LIMIT 100");
        $stmt->execute([$userId]);
        $rows = array_reverse($stmt->fetchAll(PDO::FETCH_ASSOC));
        $summary = [
            'prompt_tokens' => 0,
            'history_tokens' => 0,
            'context_tokens' => 0,
            'response_tokens' => 0,
            'total_requests' => count($rows),
        ];
        foreach ($rows as $r) {
            $summary['prompt_tokens'] += (int)$r['prompt_tokens'];
            $summary['history_tokens'] += (int)$r['history_tokens'];
            $summary['context_tokens'] += (int)$r['context_tokens'];
            $summary['response_tokens'] += (int)$r['response_tokens'];
        }
        jsonOut(['success' => true, 'summary' => $summary, 'rows' => $rows]);
    }

    if ($action === 'test_telegram') {
        $stmt = $db->prepare("SELECT telegram_chat_id,telegram_bot_token FROM user_settings WHERE user_id=?");
        $stmt->execute([$userId]);
        $set = $stmt->fetch();
        if (!$set || empty($set['telegram_chat_id'])) jsonOut(['success'=>false,'error'=>'Telegram Chat ID belum diatur.']);
        $token = !empty($set['telegram_bot_token']) ? readStoredSecret($set['telegram_bot_token']) : null;
        $appName = defined('APP_NAME') ? APP_NAME : 'IoTzy';
        $msg = "✅ <b>Testing Koneksi Berhasil!</b>\n\nSistem <b>$appName</b> kini terhubung dengan bot Telegram Anda.\nAnda bisa mengontrol perangkat pintar dari sini.";
        $res = sendTelegramNotification($set['telegram_chat_id'], $msg, $token);
        if ($res['success']) {
            addActivityLog($userId, 'System', 'Test koneksi Telegram berhasil', 'User', 'success');
            jsonOut(['success'=>true,'message'=>'Pesan test telah dikirim ke Telegram Anda.']);
        } else {
            addActivityLog($userId, 'System', 'Test koneksi Telegram gagal: '.$res['error'], 'System', 'error');
            jsonOut(['success'=>false,'error'=>'Gagal API Telegram: '.$res['error']]);
        }
    }

    if ($action === 'db_status') {
        jsonOut(dbStatus());
    }
}
