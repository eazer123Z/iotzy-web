<?php

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/AIParser.php';
require_once __DIR__ . '/../core/TelegramService.php';
require_once __DIR__ . '/../core/UserDataService.php';


function handleAIChatAction(string $action, int $userId, array $body, PDO $db): void {
    if ($action === 'ai_chat_process') {
        $msg = trim($body['message'] ?? '');
        if (!$msg) jsonOut(['success'=>false,'error'=>'Pesan kosong']);
        $sessionStart = $body['session_start'] ?? null;
        $parsed = parse_nl_to_action($userId, $msg, [], [], 'web', $body['cv_state'] ?? null, $sessionStart);
        if (!$parsed['success']) jsonOut($parsed);
        $exec = execute_ai_actions($userId, $parsed['data']);
        $parsed['data']['execution'] = $exec;
        jsonOut($parsed);
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
