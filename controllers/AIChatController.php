<?php

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/AIParser.php';
require_once __DIR__ . '/../core/TelegramService.php';
require_once __DIR__ . '/../core/UserDataService.php';

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

function iotzyHandleAiControllerFailure(string $action, \Throwable $e, string $message): never
{
    error_log(sprintf(
        '[IoTzy AI Controller] %s failed: %s in %s:%d',
        $action,
        $e->getMessage(),
        $e->getFile(),
        $e->getLine()
    ));
    jsonOut(['success' => false, 'error' => $message]);
}

function iotzyDefaultAiTokenMetrics(): array
{
    return [
        'prompt_tokens' => 0,
        'history_tokens' => 0,
        'context_tokens' => 0,
        'response_tokens' => 0,
        'total_requests' => 0,
    ];
}

function handleAIChatAction(string $action, int $userId, array $body, PDO $db): void
{
    try {
        if ($action === 'ai_chat_process') {
            $msg = iotzyValidateMessage((string)($body['message'] ?? ''));
            if (!$msg) jsonOut(['success' => false, 'error' => 'Pesan kosong']);
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
            }
            jsonOut(['success' => false, 'error' => 'Gagal menghapus riwayat dari database']);
        }

        if ($action === 'get_ai_chat_history') {
            $stmt = $db->prepare("SELECT sender,message,platform,created_at FROM ai_chat_history WHERE user_id=? ORDER BY created_at ASC LIMIT 50");
            $stmt->execute([$userId]);
            jsonOut(['success' => true, 'history' => $stmt->fetchAll()]);
        }

        if ($action === 'get_ai_token_metrics') {
            try {
                $stmt = $db->prepare("SELECT prompt_tokens,history_tokens,context_tokens,response_tokens,created_at FROM ai_token_metrics WHERE user_id=? ORDER BY created_at DESC LIMIT 100");
                $stmt->execute([$userId]);
                $rows = array_reverse($stmt->fetchAll(PDO::FETCH_ASSOC));
            } catch (\PDOException $e) {
                error_log('[IoTzy AI Controller] get_ai_token_metrics fallback: ' . $e->getMessage());
                jsonOut([
                    'success' => true,
                    'summary' => iotzyDefaultAiTokenMetrics(),
                    'rows' => [],
                    'available' => false,
                ]);
            }

            $summary = iotzyDefaultAiTokenMetrics();
            $summary['total_requests'] = count($rows);
            foreach ($rows as $r) {
                $summary['prompt_tokens'] += (int)($r['prompt_tokens'] ?? 0);
                $summary['history_tokens'] += (int)($r['history_tokens'] ?? 0);
                $summary['context_tokens'] += (int)($r['context_tokens'] ?? 0);
                $summary['response_tokens'] += (int)($r['response_tokens'] ?? 0);
            }
            jsonOut(['success' => true, 'summary' => $summary, 'rows' => $rows]);
        }

        if ($action === 'test_telegram') {
            $stmt = $db->prepare("SELECT telegram_chat_id,telegram_bot_token FROM user_settings WHERE user_id=?");
            $stmt->execute([$userId]);
            $set = $stmt->fetch();
            if (!$set || empty($set['telegram_chat_id'])) jsonOut(['success' => false, 'error' => 'Telegram Chat ID belum diatur.']);
            $token = !empty($set['telegram_bot_token']) ? readStoredSecret($set['telegram_bot_token']) : null;
            $appName = defined('APP_NAME') ? APP_NAME : 'IoTzy';
            $msg = "âœ… <b>Testing Koneksi Berhasil!</b>\n\nSistem <b>$appName</b> kini terhubung dengan bot Telegram Anda.\nAnda bisa mengontrol perangkat pintar dari sini.";
            $res = sendTelegramNotification($set['telegram_chat_id'], $msg, $token);
            if ($res['success']) {
                addActivityLog($userId, 'System', 'Test koneksi Telegram berhasil', 'User', 'success');
                jsonOut(['success' => true, 'message' => 'Pesan test telah dikirim ke Telegram Anda.']);
            }
            addActivityLog($userId, 'System', 'Test koneksi Telegram gagal: ' . $res['error'], 'System', 'error');
            jsonOut(['success' => false, 'error' => 'Gagal API Telegram: ' . $res['error']]);
        }

        if ($action === 'db_status') {
            jsonOut(dbStatus());
        }
    } catch (\Throwable $e) {
        $message = match ($action) {
            'get_ai_chat_history' => 'Riwayat AI belum tersedia saat ini.',
            'get_ai_token_metrics' => 'Statistik AI belum tersedia saat ini.',
            'delete_chat_history' => 'Gagal membersihkan riwayat AI.',
            'test_telegram' => 'Tes Telegram gagal diproses.',
            default => 'AI sedang bermasalah. Coba lagi beberapa saat.',
        };
        iotzyHandleAiControllerFailure($action, $e, $message);
    }
}
