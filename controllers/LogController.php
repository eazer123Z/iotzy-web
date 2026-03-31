<?php

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/UserDataService.php';

function handleLogAction(string $action, int $userId, array $body, PDO $db): void
{
    if ($action === 'get_logs') {
        $limit = max(1, min((int)($body['limit'] ?? $_GET['limit'] ?? 500), 1000));
        $date = iotzyNormalizeAnalyticsDate($body['date'] ?? $_GET['date'] ?? date('Y-m-d'));
        $start = $date . ' 00:00:00';
        $end = date('Y-m-d H:i:s', strtotime($start . ' +1 day'));

        $stmt = $db->prepare(
            "SELECT l.*, d.name AS linked_device_name, s.name AS linked_sensor_name
             FROM activity_logs l
             LEFT JOIN devices d ON d.id = l.device_id
             LEFT JOIN sensors s ON s.id = l.sensor_id
             WHERE l.user_id = ? AND l.created_at >= ? AND l.created_at < ?
               AND (
                 l.device_id IS NOT NULL
                 OR l.sensor_id IS NOT NULL
                 OR (
                   LOWER(l.device_name) NOT IN ('system', 'mqtt')
                   AND LOWER(l.trigger_type) <> 'system'
                   AND l.activity <> ''
                 )
               )
             ORDER BY l.created_at DESC
             LIMIT ?"
        );
        $stmt->execute([$userId, $start, $end, $limit]);
        $rows = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $log) {
            $ts = strtotime($log['created_at']);
            $rows[] = [
                'id' => (int)$log['id'],
                'created_at' => $log['created_at'],
                'tanggal' => date('d M Y', $ts),
                'waktu' => date('H:i', $ts),
                'device' => $log['linked_device_name'] ?: $log['device_name'],
                'device_name' => $log['linked_device_name'] ?: $log['device_name'],
                'activity' => $log['activity'],
                'trigger' => $log['trigger_type'],
                'trigger_type' => $log['trigger_type'],
                'device_id' => $log['device_id'] !== null ? (int)$log['device_id'] : null,
                'sensor_id' => $log['sensor_id'] !== null ? (int)$log['sensor_id'] : null,
                'sensor_name' => $log['linked_sensor_name'],
                'metadata' => iotzyJsonDecode($log['metadata'], null),
            ];
        }
        jsonOut($rows);
    }

    if ($action === 'get_logs_daily_summary') {
        $date = $body['date'] ?? $_GET['date'] ?? date('Y-m-d');
        jsonOut([
            'success' => true,
            'data' => getDailyAnalyticsSummary($userId, $date, $db),
        ]);
    }

    if ($action === 'get_device_daily_summary') {
        $date = $body['date'] ?? $_GET['date'] ?? date('Y-m-d');
        $deviceId = (int)($body['device_id'] ?? $_GET['device_id'] ?? 0);
        $summary = getDailyAnalyticsSummary($userId, $date, $db);
        $devices = $summary['devices'] ?? [];
        if ($deviceId > 0) {
            $devices = array_values(array_filter($devices, static fn(array $device): bool => (int)$device['id'] === $deviceId));
        }
        jsonOut([
            'success' => true,
            'date' => $summary['date'],
            'devices' => $devices,
        ]);
    }

    if ($action === 'add_log') {
        $dev = trim((string)($body['device'] ?? ''));
        $act = trim((string)($body['activity'] ?? ''));
        $trig = trim((string)($body['trigger'] ?? 'System'));
        $deviceId = isset($body['device_id']) && $body['device_id'] !== '' ? (int)$body['device_id'] : null;
        $sensorId = isset($body['sensor_id']) && $body['sensor_id'] !== '' ? (int)$body['sensor_id'] : null;
        $metadata = $body['metadata'] ?? null;
        if ($dev !== '' && $act !== '') {
            addActivityLog($userId, $dev, $act, $trig, 'info', $deviceId, $sensorId, $metadata);
            jsonOut(['success' => true]);
        }
        jsonOut(['success' => false, 'error' => 'Data log tidak lengkap']);
    }

    if ($action === 'clear_logs') {
        dbWrite("DELETE FROM activity_logs WHERE user_id = ?", [$userId]);
        jsonOut(['success' => true, 'message' => 'Log berhasil dibersihkan']);
    }
}
