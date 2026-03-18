<?php
/**
 * services/UserDataService.php — User Data Queries
 *
 * Dipisahkan dari auth.php karena ini data queries, bukan auth logic.
 */

require_once __DIR__ . '/../core/bootstrap.php';


function getCurrentUser(): ?array {
    static $cachedUser = null;
    if ($cachedUser !== null) return $cachedUser;

    if (session_status() !== PHP_SESSION_ACTIVE) {
        if (function_exists('startSecureSession')) startSecureSession();
    }
    if (empty($_SESSION['user_id'])) return null;

    $db = getLocalDB();
    if (!$db) return null;

    try {
        $stmt = $db->prepare(
            "SELECT u.id, u.username, u.email, u.full_name, u.role, u.is_active,
                    COALESCE(s.theme, 'light') AS theme
             FROM users u
             LEFT JOIN user_settings s ON s.user_id = u.id
             WHERE u.id = ? AND u.is_active = 1
             LIMIT 1"
        );
        $stmt->execute([$_SESSION['user_id']]);
        $cachedUser = $stmt->fetch() ?: null;
        return $cachedUser;
    } catch (PDOException $e) {
        error_log('[IoTzy] getCurrentUser error: ' . $e->getMessage());
        return null;
    }
}

function getCurrentUserFresh(): ?array {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        if (function_exists('startSecureSession')) startSecureSession();
    }
    if (empty($_SESSION['user_id'])) return null;

    $db = getLocalDB();
    if (!$db) return null;

    try {
        $stmt = $db->prepare(
            "SELECT u.id, u.username, u.email, u.full_name, u.role, u.is_active,
                    COALESCE(s.theme, 'light') AS theme
             FROM users u
             LEFT JOIN user_settings s ON s.user_id = u.id
             WHERE u.id = ? AND u.is_active = 1
             LIMIT 1"
        );
        $stmt->execute([$_SESSION['user_id']]);
        return $stmt->fetch() ?: null;
    } catch (PDOException $e) {
        error_log('[IoTzy] getCurrentUserFresh error: ' . $e->getMessage());
        return null;
    }
}

function getUserDevices(int $userId): array {
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

function getUserSensors(int $userId): array {
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

function getUserSettings(int $userId): ?array {
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

function addActivityLog(
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
