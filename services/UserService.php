<?php

require_once __DIR__ . '/../config/database.php';

class UserService {

    public static function getUserDevices(int $userId): array {
        $db = getLocalDB();
        if (!$db) return [];
        try {
            $stmt = $db->prepare(
                "SELECT id, user_id, device_key, name, icon, type,
                        topic_sub, topic_pub, is_active, last_state
                 FROM devices
                 WHERE user_id = ? AND is_active = TRUE
                 ORDER BY created_at ASC"
            );
            $stmt->execute([$userId]);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log('[IoTzy] getUserDevices error: ' . $e->getMessage());
            return [];
        }
    }

    public static function getUserSensors(int $userId): array {
        $db = getLocalDB();
        if (!$db) return [];
        try {
            $stmt = $db->prepare(
                "SELECT id, user_id, sensor_key, name, type, icon,
                        unit, topic, latest_value, last_seen
                 FROM sensors
                 WHERE user_id = ?
                 ORDER BY created_at ASC"
            );
            $stmt->execute([$userId]);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log('[IoTzy] getUserSensors error: ' . $e->getMessage());
            return [];
        }
    }

    public static function getUserSettings(int $userId): ?array {
        $db = getLocalDB();
        if (!$db) return null;
        try {
            $stmt = $db->prepare("SELECT * FROM user_settings WHERE user_id = ? LIMIT 1");
            $stmt->execute([$userId]);
            $row = $stmt->fetch();
            if (!$row) return null;

            if (!empty($row['quick_control_devices'])) {
                $row['quick_control_devices'] = json_decode($row['quick_control_devices'], true) ?? [];
            } else {
                $row['quick_control_devices'] = [];
            }

            unset($row['mqtt_password_enc']);
            return $row;
        } catch (PDOException $e) {
            error_log('[IoTzy] getUserSettings error: ' . $e->getMessage());
            return null;
        }
    }

    public static function addActivityLog(
        int    $userId,
        string $deviceName,
        string $activity,
        string $triggerType = 'System',
        string $logType     = 'info'
    ): void {
        $db = getLocalDB();
        if (!$db) return;

        $allowed = ['info', 'success', 'warning', 'error'];
        if (!in_array($logType, $allowed, true)) $logType = 'info';

        $deviceName  = substr($deviceName,  0, 100);
        $activity    = substr($activity,    0, 200);
        $triggerType = substr($triggerType, 0, 50);

        try {
            $db->prepare(
                "INSERT INTO activity_logs (user_id, device_name, activity, trigger_type, log_type)
                 VALUES (?, ?, ?, ?, ?)"
            )->execute([$userId, $deviceName, $activity, $triggerType, $logType]);
        } catch (PDOException $e) {
            error_log('[IoTzy] addActivityLog error: ' . $e->getMessage());
        }
    }
}

// Backward-compatible global function wrappers for legacy API (api/data.php)
if (!function_exists('getUserDevices')) {
    function getUserDevices(int $userId): array {
        return UserService::getUserDevices($userId);
    }
}
if (!function_exists('getUserSensors')) {
    function getUserSensors(int $userId): array {
        return UserService::getUserSensors($userId);
    }
}
if (!function_exists('getUserSettings')) {
    function getUserSettings(int $userId): ?array {
        return UserService::getUserSettings($userId);
    }
}
if (!function_exists('addActivityLog')) {
    function addActivityLog(
        int    $userId,
        string $deviceName,
        string $activity,
        string $triggerType = 'System',
        string $logType     = 'info'
    ): void {
        UserService::addActivityLog($userId, $deviceName, $activity, $triggerType, $logType);
    }
}
