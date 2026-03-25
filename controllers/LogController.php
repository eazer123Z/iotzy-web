<?php
/**
 * controllers/LogController.php
 * ───
 * Mengelola log aktivitas sistem IoTzy. Menyediakan fitur pengambilan riwayat log, 
 * pembersihan log, dan pencatatan aksi manual pengguna.
 */


require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/UserDataService.php'; // Updated include path

function handleLogAction(string $action, int $userId, array $body, PDO $db): void {
    if ($action === 'get_logs') {
        $stmt = $db->prepare("SELECT * FROM activity_logs WHERE user_id=? ORDER BY created_at DESC LIMIT 500");
        $stmt->execute([$userId]);
        $res = [];
        foreach ($stmt->fetchAll() as $l) {
            $ts = strtotime($l['created_at']);
            $res[] = [
                'id'       => (int)$l['id'],
                'tanggal'  => date('d M Y', $ts),
                'waktu'    => date('H:i', $ts),
                'device'   => $l['device_name'],
                'activity' => $l['activity'],
                'trigger'  => $l['trigger_type'],
                'type'     => $l['log_type']
            ];
        }
        jsonOut($res);
    }

    if ($action === 'add_log') {
        $dev  = trim($body['device'] ?? '');
        $act  = trim($body['activity'] ?? '');
        $trig = trim($body['trigger'] ?? 'System');
        $type = trim($body['type'] ?? 'info');
        if ($dev && $act) {
            addActivityLog($userId, $dev, $act, $trig, $type);
            jsonOut(['success'=>true]);
        }
        jsonOut(['success'=>false,'error'=>'Data log tidak lengkap']);
    }

    if ($action === 'clear_logs') {
        dbWrite("DELETE FROM activity_logs WHERE user_id=?", [$userId]);
        addActivityLog($userId, 'System', 'Semua log aktivitas telah dihapus', 'User', 'warning');
        jsonOut(['success'=>true,'message'=>'Log berhasil dibersihkan']);
    }
}
