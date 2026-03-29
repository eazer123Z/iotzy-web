<?php

require_once __DIR__ . '/bootstrap.php';

function iotzyJsonDecode(mixed $value, mixed $default = null): mixed
{
    if ($value === null || $value === '') {
        return $default;
    }
    if (is_array($value) || is_object($value)) {
        return $value;
    }
    $decoded = json_decode((string)$value, true);
    return json_last_error() === JSON_ERROR_NONE ? $decoded : $default;
}

function iotzyHumanDuration(int $seconds): string
{
    $seconds = max(0, $seconds);
    $hours = intdiv($seconds, 3600);
    $minutes = intdiv($seconds % 3600, 60);
    $secs = $seconds % 60;

    if ($hours > 0) {
        return $hours . 'j ' . $minutes . 'm';
    }
    if ($minutes > 0) {
        return $minutes . 'm ' . $secs . 'd';
    }
    return $secs . 'd';
}

function iotzyNormalizeAnalyticsDate(?string $date): string
{
    $date = trim((string)$date);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        return date('Y-m-d');
    }
    $ts = strtotime($date . ' 00:00:00');
    return $ts ? date('Y-m-d', $ts) : date('Y-m-d');
}

function iotzyInferDeviceTemplateSlug(?string $type = null, ?string $icon = null): ?string
{
    $type = strtolower(trim((string)$type));
    $icon = strtolower(trim((string)$icon));

    $typeMap = [
        'light' => 'led_lamp',
        'lamp' => 'led_lamp',
        'switch' => 'led_lamp',
        'fan' => 'fan_5v',
        'servo' => 'servo',
        'lock' => 'door_lock',
        'door' => 'door_lock',
    ];
    if (isset($typeMap[$type])) {
        return $typeMap[$type];
    }

    if (str_contains($icon, 'light') || str_contains($icon, 'bulb')) {
        return 'led_lamp';
    }
    if (str_contains($icon, 'wind') || str_contains($icon, 'fan')) {
        return 'fan_5v';
    }
    if (str_contains($icon, 'lock') || str_contains($icon, 'door')) {
        return 'door_lock';
    }
    return null;
}

function iotzyInferSensorTemplateSlug(?string $type = null): ?string
{
    $type = strtolower(trim((string)$type));
    return match ($type) {
        'temperature' => 'dht22_temperature',
        'humidity' => 'dht22_humidity',
        'voltage' => 'ina219_voltage',
        'current' => 'ina219_current',
        'power' => 'ina219_power',
        'motion' => 'pir_motion',
        'gas' => 'mq2_gas',
        'distance' => 'ultrasonic_distance',
        default => null,
    };
}

function getCurrentUser(): ?array
{
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }

    if (session_status() !== PHP_SESSION_ACTIVE && function_exists('startSecureSession')) {
        startSecureSession();
    }
    if (empty($_SESSION['user_id'])) {
        return null;
    }

    $db = getLocalDB();
    if (!$db) {
        return null;
    }

    try {
        $st = $db->prepare(
            "SELECT u.id, u.username, u.email, u.full_name, u.role, u.is_active,
                    COALESCE(s.theme, 'light') AS theme
             FROM users u
             LEFT JOIN user_settings s ON s.user_id = u.id
             WHERE u.id = ? AND u.is_active = 1
             LIMIT 1"
        );
        $st->execute([$_SESSION['user_id']]);
        $cached = $st->fetch() ?: null;
        return $cached;
    } catch (PDOException $e) {
        return null;
    }
}

function getUserSettings(int $userId): ?array
{
    $db = getLocalDB();
    if (!$db) {
        return null;
    }

    try {
        $st = $db->prepare("SELECT * FROM user_settings WHERE user_id = ? LIMIT 1");
        $st->execute([$userId]);
        $row = $st->fetch();

        if (!$row) {
            return [
                'user_id' => $userId,
                'mqtt_broker' => getenv('MQTT_HOST') ?: 'broker.hivemq.com',
                'mqtt_port' => (int)(getenv('MQTT_PORT') ?: 8884),
                'mqtt_use_ssl' => (getenv('MQTT_USE_SSL') === 'true' || getenv('MQTT_USE_SSL') === '1') ? 1 : 0,
                'mqtt_path' => getenv('MQTT_PATH') ?: '/mqtt',
                'theme' => 'light',
                'quick_control_devices' => [],
                'cv_config' => [],
                'cv_rules' => [],
            ];
        }

        $row['quick_control_devices'] = iotzyJsonDecode($row['quick_control_devices'], []);
        $row['cv_config'] = iotzyJsonDecode($row['cv_config'], []);
        $row['cv_rules'] = iotzyJsonDecode($row['cv_rules'], []);
        unset($row['mqtt_password_enc']);

        return $row;
    } catch (PDOException $e) {
        return null;
    }
}

function getUserDeviceTemplates(?PDO $db = null): array
{
    $db = $db ?: getLocalDB();
    if (!$db) {
        return [];
    }

    $stmt = $db->query(
        "SELECT id, slug, name, device_type, control_mode, default_icon, state_on_label, state_off_label,
                default_min_value, default_max_value, default_step_value,
                default_topic_sub_pattern, default_topic_pub_pattern, meta, is_active, sort_order
         FROM device_templates
         WHERE is_active = 1
         ORDER BY sort_order ASC, id ASC"
    );
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$row) {
        $row['id'] = (int)$row['id'];
        $row['is_active'] = (int)$row['is_active'];
        $row['meta'] = iotzyJsonDecode($row['meta'], []);
    }
    unset($row);
    return $rows;
}

function getUserSensorTemplates(?PDO $db = null): array
{
    $db = $db ?: getLocalDB();
    if (!$db) {
        return [];
    }

    $stmt = $db->query(
        "SELECT id, slug, family, metric, name, sensor_type, default_icon, default_unit, output_kind,
                default_topic_pattern, supports_device_link, is_power_metric, sort_order, is_active
         FROM sensor_templates
         WHERE is_active = 1
         ORDER BY sort_order ASC, id ASC"
    );
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$row) {
        $row['id'] = (int)$row['id'];
        $row['supports_device_link'] = (int)$row['supports_device_link'];
        $row['is_power_metric'] = (int)$row['is_power_metric'];
        $row['is_active'] = (int)$row['is_active'];
    }
    unset($row);
    return $rows;
}

function iotzyFetchTemplateById(PDO $db, string $table, int $id): ?array
{
    $stmt = $db->prepare("SELECT * FROM {$table} WHERE id = ? LIMIT 1");
    $stmt->execute([$id]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

function iotzyFetchTemplateBySlug(PDO $db, string $table, string $slug): ?array
{
    $stmt = $db->prepare("SELECT * FROM {$table} WHERE slug = ? LIMIT 1");
    $stmt->execute([$slug]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

function resolveDeviceTemplate(PDO $db, mixed $templateId = null, ?string $templateSlug = null, ?string $type = null, ?string $icon = null): ?array
{
    if (is_numeric($templateId) && (int)$templateId > 0) {
        $tpl = iotzyFetchTemplateById($db, 'device_templates', (int)$templateId);
        if ($tpl) {
            return $tpl;
        }
    }

    $templateSlug = trim((string)$templateSlug);
    if ($templateSlug !== '') {
        $tpl = iotzyFetchTemplateBySlug($db, 'device_templates', $templateSlug);
        if ($tpl) {
            return $tpl;
        }
    }

    $inferred = iotzyInferDeviceTemplateSlug($type, $icon);
    return $inferred ? iotzyFetchTemplateBySlug($db, 'device_templates', $inferred) : null;
}

function resolveSensorTemplate(PDO $db, mixed $templateId = null, ?string $templateSlug = null, ?string $type = null): ?array
{
    if (is_numeric($templateId) && (int)$templateId > 0) {
        $tpl = iotzyFetchTemplateById($db, 'sensor_templates', (int)$templateId);
        if ($tpl) {
            return $tpl;
        }
    }

    $templateSlug = trim((string)$templateSlug);
    if ($templateSlug !== '') {
        $tpl = iotzyFetchTemplateBySlug($db, 'sensor_templates', $templateSlug);
        if ($tpl) {
            return $tpl;
        }
    }

    $inferred = iotzyInferSensorTemplateSlug($type);
    return $inferred ? iotzyFetchTemplateBySlug($db, 'sensor_templates', $inferred) : null;
}

function getUserDevices(int $userId): array
{
    $db = getLocalDB();
    if (!$db) {
        return [];
    }

    $sql = "SELECT
                d.id, d.user_id, d.device_template_id, d.device_key, d.name,
                COALESCE(NULLIF(d.icon, ''), dt.default_icon, 'fa-plug') AS icon,
                COALESCE(NULLIF(d.type, ''), dt.device_type, 'switch') AS type,
                d.topic_sub, d.topic_pub, d.control_value, d.control_text,
                d.state_on_label, d.state_off_label,
                COALESCE(NULLIF(d.state_on_label, ''), dt.state_on_label, 'ON') AS resolved_state_on_label,
                COALESCE(NULLIF(d.state_off_label, ''), dt.state_off_label, 'OFF') AS resolved_state_off_label,
                d.is_active, d.last_state, d.latest_state, d.last_seen, d.last_state_changed, d.created_at,
                dt.slug AS template_slug, dt.name AS template_name, dt.device_type AS template_device_type,
                dt.control_mode, dt.default_icon AS template_default_icon, dt.meta AS template_meta
            FROM devices d
            LEFT JOIN device_templates dt ON dt.id = d.device_template_id
            WHERE d.user_id = ?
            ORDER BY d.created_at ASC";

    try {
        $st = $db->prepare($sql);
        $st->execute([$userId]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$row) {
            $row['id'] = (int)$row['id'];
            $row['user_id'] = (int)$row['user_id'];
            $row['device_template_id'] = $row['device_template_id'] !== null ? (int)$row['device_template_id'] : null;
            $row['is_active'] = (int)$row['is_active'];
            $row['last_state'] = (int)$row['last_state'];
            $row['latest_state'] = (int)$row['latest_state'];
            $row['template_meta'] = iotzyJsonDecode($row['template_meta'], []);
            $row['model_label'] = $row['template_name'] ?: ucwords(str_replace('_', ' ', (string)$row['type']));
        }
        unset($row);

        return $rows;
    } catch (PDOException $e) {
        return [];
    }
}

function getUserSensors(int $userId): array
{
    $db = getLocalDB();
    if (!$db) {
        return [];
    }

    $sql = "SELECT
                s.id, s.user_id, s.device_id, s.sensor_template_id, s.sensor_key, s.name,
                COALESCE(NULLIF(s.type, ''), st.sensor_type, 'sensor') AS type,
                COALESCE(NULLIF(s.icon, ''), st.default_icon, 'fa-microchip') AS icon,
                COALESCE(NULLIF(s.unit, ''), st.default_unit, '') AS unit,
                s.topic, s.latest_value, s.last_seen, s.created_at,
                d.name AS device_name, d.device_key, d.type AS device_type,
                st.slug AS template_slug, st.family AS template_family, st.metric AS template_metric,
                st.name AS template_name, st.sensor_type AS template_sensor_type,
                st.output_kind, st.supports_device_link, st.is_power_metric
            FROM sensors s
            LEFT JOIN devices d ON d.id = s.device_id
            LEFT JOIN sensor_templates st ON st.id = s.sensor_template_id
            WHERE s.user_id = ?
            ORDER BY s.created_at ASC";

    try {
        $st = $db->prepare($sql);
        $st->execute([$userId]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$row) {
            $row['id'] = (int)$row['id'];
            $row['user_id'] = (int)$row['user_id'];
            $row['device_id'] = $row['device_id'] !== null ? (int)$row['device_id'] : null;
            $row['sensor_template_id'] = $row['sensor_template_id'] !== null ? (int)$row['sensor_template_id'] : null;
            $row['supports_device_link'] = (int)($row['supports_device_link'] ?? 0);
            $row['is_power_metric'] = (int)($row['is_power_metric'] ?? 0);
            $row['latest_value'] = $row['latest_value'] !== null ? (float)$row['latest_value'] : null;
            $row['model_label'] = $row['template_name'] ?: ucwords(str_replace('_', ' ', (string)$row['type']));
        }
        unset($row);

        return $rows;
    } catch (PDOException $e) {
        return [];
    }
}

function iotzyDefaultCvState(): array
{
    return [
        'is_active' => 0,
        'model_loaded' => 0,
        'person_count' => 0,
        'brightness' => 0,
        'light_condition' => 'unknown',
        'last_updated' => null,
    ];
}

function getUserCameraBundle(int $userId, ?PDO $db = null): array
{
    $db = $db ?: getLocalDB();
    if (!$db) {
        return [
            'camera' => null,
            'camera_settings' => [],
            'cv_state' => iotzyDefaultCvState(),
        ];
    }

    $camera = null;
    $stmt = $db->prepare(
        "SELECT *
         FROM cameras
         WHERE user_id = ?
         ORDER BY CASE WHEN source_type = 'webrtc' THEN 0 ELSE 1 END, id ASC
         LIMIT 1"
    );
    $stmt->execute([$userId]);
    $camera = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;

    if (!$camera) {
        $cameraKey = 'default-browser-' . $userId;
        $db->prepare(
            "INSERT INTO cameras (user_id, camera_key, name, source_type, is_active)
             VALUES (?, ?, ?, 'webrtc', 1)"
        )->execute([$userId, $cameraKey, 'Browser Camera']);

        $stmt->execute([$userId]);
        $camera = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    if (!$camera) {
        return [
            'camera' => null,
            'camera_settings' => [],
            'cv_state' => iotzyDefaultCvState(),
        ];
    }

    $cameraId = (int)$camera['id'];
    $db->prepare("INSERT IGNORE INTO camera_settings (camera_id) VALUES (?)")->execute([$cameraId]);
    $db->prepare("INSERT IGNORE INTO cv_state (camera_id) VALUES (?)")->execute([$cameraId]);

    $settingsStmt = $db->prepare("SELECT * FROM camera_settings WHERE camera_id = ? LIMIT 1");
    $settingsStmt->execute([$cameraId]);
    $cameraSettings = $settingsStmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $cameraSettings['camera_id'] = $cameraId;
    $cameraSettings['cv_rules'] = iotzyJsonDecode($cameraSettings['cv_rules'] ?? null, []);
    $cameraSettings['cv_config'] = iotzyJsonDecode($cameraSettings['cv_config'] ?? null, []);

    $cvStmt = $db->prepare("SELECT * FROM cv_state WHERE camera_id = ? LIMIT 1");
    $cvStmt->execute([$cameraId]);
    $cvState = array_merge(iotzyDefaultCvState(), $cvStmt->fetch(PDO::FETCH_ASSOC) ?: []);
    $cvState['camera_id'] = $cameraId;

    return [
        'camera' => $camera,
        'camera_settings' => $cameraSettings,
        'cv_state' => $cvState,
    ];
}

function getUserCVState(int $userId, ?PDO $db = null): array
{
    $bundle = getUserCameraBundle($userId, $db);
    return $bundle['cv_state'] ?? iotzyDefaultCvState();
}

function updateUserCVState(int $userId, array $data, ?PDO $db = null): array
{
    $db = $db ?: getLocalDB();
    if (!$db) {
        return iotzyDefaultCvState();
    }

    $bundle = getUserCameraBundle($userId, $db);
    if (empty($bundle['camera']['id'])) {
        return iotzyDefaultCvState();
    }

    $cameraId = (int)$bundle['camera']['id'];
    $casts = [
        'is_active' => fn($v) => (int)(bool)$v,
        'model_loaded' => fn($v) => (int)(bool)$v,
        'person_count' => fn($v) => max(0, (int)$v),
        'brightness' => fn($v) => max(0, min(100, (int)$v)),
        'light_condition' => fn($v) => substr(trim((string)$v), 0, 20),
    ];

    $sets = [];
    $vals = [];
    foreach ($casts as $field => $cast) {
        if (array_key_exists($field, $data)) {
            $sets[] = $field . ' = ?';
            $vals[] = $cast($data[$field]);
        }
    }

    if ($sets) {
        $vals[] = $cameraId;
        $db->prepare(
            "UPDATE cv_state SET " . implode(', ', $sets) . ", last_updated = NOW() WHERE camera_id = ?"
        )->execute($vals);
        $db->prepare("UPDATE cameras SET last_seen = NOW() WHERE id = ?")->execute([$cameraId]);
    }

    return getUserCVState($userId, $db);
}

function addActivityLog(
    int $userId,
    string $deviceName,
    string $activity,
    string $triggerType = 'System',
    string $logType = 'info',
    ?int $deviceId = null,
    ?int $sensorId = null,
    mixed $metadata = null
): void {
    $db = getLocalDB();
    if (!$db) {
        return;
    }

    $allowed = ['info', 'success', 'warning', 'error'];
    if (!in_array($logType, $allowed, true)) {
        $logType = 'info';
    }

    $metadataJson = null;
    if ($metadata !== null) {
        $metadataJson = is_string($metadata) ? $metadata : json_encode($metadata, JSON_UNESCAPED_UNICODE);
    }

    try {
        $db->prepare(
            "INSERT INTO activity_logs (user_id, device_id, sensor_id, device_name, activity, trigger_type, log_type, metadata)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )->execute([
            $userId,
            $deviceId,
            $sensorId,
            substr($deviceName, 0, 100),
            substr($activity, 0, 200),
            substr($triggerType, 0, 50),
            $logType,
            $metadataJson,
        ]);
    } catch (PDOException $e) {
    }
}

function iotzyIsUserFacingLog(array $log): bool
{
    $deviceId = isset($log['device_id']) && $log['device_id'] !== null ? (int)$log['device_id'] : 0;
    $sensorId = isset($log['sensor_id']) && $log['sensor_id'] !== null ? (int)$log['sensor_id'] : 0;
    if ($deviceId > 0 || $sensorId > 0) {
        return true;
    }

    $deviceName = strtolower(trim((string)($log['linked_device_name'] ?? $log['device_name'] ?? $log['device'] ?? '')));
    $trigger = strtolower(trim((string)($log['trigger_type'] ?? $log['trigger'] ?? '')));

    if ($deviceName === 'system' || $deviceName === 'mqtt') {
        return false;
    }

    if ($trigger === 'system') {
        return false;
    }

    return trim((string)($log['activity'] ?? '')) !== '';
}

function getDailyAnalyticsSummary(int $userId, ?string $date = null, ?PDO $db = null): array
{
    $db = $db ?: getLocalDB();
    $date = iotzyNormalizeAnalyticsDate($date);
    $defaults = [
        'date' => $date,
        'summary' => [
            'total_logs' => 0,
            'devices_total' => 0,
            'devices_active_today' => 0,
            'devices_idle_today' => 0,
            'device_on_events' => 0,
            'device_off_events' => 0,
            'total_duration_seconds' => 0,
            'total_duration_human' => '0d',
            'current_power_watts' => 0,
            'total_energy_wh' => 0,
            'total_energy_kwh' => 0,
            'power_devices' => 0,
        ],
        'timeline' => array_fill(0, 24, 0),
        'devices' => [],
        'recent_logs' => [],
    ];

    if (!$db) {
        return $defaults;
    }

    $start = $date . ' 00:00:00';
    $end = date('Y-m-d H:i:s', strtotime($start . ' +1 day'));
    $dayStartTs = strtotime($start);
    $dayEndTs = strtotime($end);

    $devices = getUserDevices($userId);
    $sensors = getUserSensors($userId);
    $deviceMap = [];

    foreach ($devices as $device) {
        $deviceMap[(int)$device['id']] = [
            'id' => (int)$device['id'],
            'name' => $device['name'],
            'type' => $device['type'],
            'icon' => $device['icon'],
            'is_active' => (int)$device['is_active'],
            'last_state' => (int)$device['last_state'],
            'latest_state' => (int)$device['latest_state'],
            'last_seen' => $device['last_seen'],
            'template_name' => $device['template_name'] ?? null,
            'template_slug' => $device['template_slug'] ?? null,
            'model_label' => $device['model_label'] ?? $device['name'],
            'control_mode' => $device['control_mode'] ?? 'binary',
            'state_on_label' => $device['resolved_state_on_label'] ?? 'ON',
            'state_off_label' => $device['resolved_state_off_label'] ?? 'OFF',
            'active_duration_seconds' => 0,
            'active_duration_human' => '0d',
            'session_count' => 0,
            'on_events' => 0,
            'off_events' => 0,
            'logs_count' => 0,
            'linked_sensors' => [],
            'latest_power_watts' => null,
            'avg_power_watts' => null,
            'peak_power_watts' => null,
            'energy_wh' => 0.0,
            'energy_kwh' => 0.0,
        ];
    }

    foreach ($sensors as $sensor) {
        if (empty($sensor['device_id']) || !isset($deviceMap[(int)$sensor['device_id']])) {
            continue;
        }
        $deviceMap[(int)$sensor['device_id']]['linked_sensors'][] = [
            'id' => (int)$sensor['id'],
            'name' => $sensor['name'],
            'type' => $sensor['type'],
            'icon' => $sensor['icon'],
            'unit' => $sensor['unit'],
            'latest_value' => $sensor['latest_value'],
            'last_seen' => $sensor['last_seen'],
            'template_name' => $sensor['template_name'] ?? null,
            'template_metric' => $sensor['template_metric'] ?? null,
            'is_power_metric' => (int)($sensor['is_power_metric'] ?? 0),
        ];
    }

    $logsStmt = $db->prepare(
        "SELECT l.*, d.name AS linked_device_name, s.name AS linked_sensor_name
         FROM activity_logs l
         LEFT JOIN devices d ON d.id = l.device_id
         LEFT JOIN sensors s ON s.id = l.sensor_id
         WHERE l.user_id = ? AND l.created_at >= ? AND l.created_at < ?
         ORDER BY l.created_at DESC"
    );
    $logsStmt->execute([$userId, $start, $end]);
    $logs = $logsStmt->fetchAll(PDO::FETCH_ASSOC);

    $timeline = array_fill(0, 24, 0);
    $recentLogs = [];
    foreach ($logs as $log) {
        if (!iotzyIsUserFacingLog($log)) {
            continue;
        }

        $ts = strtotime($log['created_at']);
        $timeline[(int)date('G', $ts)]++;
        $deviceId = $log['device_id'] !== null ? (int)$log['device_id'] : null;
        if ($deviceId && isset($deviceMap[$deviceId])) {
            $deviceMap[$deviceId]['logs_count']++;
            if (preg_match('/\b(on|dinyalakan|nyala|aktif|open)\b/i', (string)$log['activity'])) {
                $deviceMap[$deviceId]['on_events']++;
            }
            if (preg_match('/\b(off|dimatikan|mati|lock|terkunci)\b/i', (string)$log['activity'])) {
                $deviceMap[$deviceId]['off_events']++;
            }
        }
        $recentLogs[] = [
            'id' => (int)$log['id'],
            'created_at' => $log['created_at'],
            'tanggal' => date('d M Y', $ts),
            'waktu' => date('H:i', $ts),
            'device' => $log['linked_device_name'] ?: $log['device_name'],
            'activity' => $log['activity'],
            'trigger' => $log['trigger_type'],
            'type' => $log['log_type'],
            'device_id' => $deviceId,
            'sensor_id' => $log['sensor_id'] !== null ? (int)$log['sensor_id'] : null,
            'sensor_name' => $log['linked_sensor_name'],
            'metadata' => iotzyJsonDecode($log['metadata'], null),
        ];
    }

    $sessionsStmt = $db->prepare(
        "SELECT ds.*, d.name AS device_name
         FROM device_sessions ds
         INNER JOIN devices d ON d.id = ds.device_id
         WHERE ds.user_id = ?
           AND ds.turned_on_at < ?
           AND COALESCE(ds.turned_off_at, ?) >= ?
         ORDER BY ds.turned_on_at ASC"
    );
    $sessionsStmt->execute([$userId, $end, $end, $start]);
    $sessions = $sessionsStmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($sessions as $session) {
        $deviceId = (int)$session['device_id'];
        if (!isset($deviceMap[$deviceId])) {
            continue;
        }
        $onTs = strtotime($session['turned_on_at']);
        $offTs = $session['turned_off_at'] ? strtotime($session['turned_off_at']) : $dayEndTs;
        $overlapStart = max($onTs, $dayStartTs);
        $overlapEnd = min($offTs, $dayEndTs);
        $duration = max(0, $overlapEnd - $overlapStart);

        $deviceMap[$deviceId]['active_duration_seconds'] += $duration;
        $deviceMap[$deviceId]['session_count']++;

        if ($deviceMap[$deviceId]['energy_wh'] <= 0 && $session['energy_wh'] !== null) {
            $deviceMap[$deviceId]['energy_wh'] += (float)$session['energy_wh'];
        }
        if ($session['latest_power_watts'] !== null) {
            $deviceMap[$deviceId]['latest_power_watts'] = max(
                (float)($deviceMap[$deviceId]['latest_power_watts'] ?? 0),
                (float)$session['latest_power_watts']
            );
        }
        if ($session['peak_power_watts'] !== null) {
            $deviceMap[$deviceId]['peak_power_watts'] = max(
                (float)($deviceMap[$deviceId]['peak_power_watts'] ?? 0),
                (float)$session['peak_power_watts']
            );
        }
        if ($session['avg_power_watts'] !== null) {
            $deviceMap[$deviceId]['avg_power_watts'] = max(
                (float)($deviceMap[$deviceId]['avg_power_watts'] ?? 0),
                (float)$session['avg_power_watts']
            );
        }
    }

    $powerSensors = array_values(array_filter($sensors, static function (array $sensor): bool {
        return !empty($sensor['device_id'])
            && (((string)($sensor['template_metric'] ?? '')) === 'power'
            || ((string)($sensor['template_slug'] ?? '')) === 'ina219_power'
            || ((string)$sensor['type']) === 'power');
    }));

    if ($powerSensors) {
        $sensorIds = array_map(static fn(array $sensor): int => (int)$sensor['id'], $powerSensors);
        $placeholders = implode(',', array_fill(0, count($sensorIds), '?'));
        $readingsStmt = $db->prepare(
            "SELECT sensor_id, value, recorded_at
             FROM sensor_readings
             WHERE sensor_id IN ($placeholders) AND recorded_at >= ? AND recorded_at < ?
             ORDER BY sensor_id ASC, recorded_at ASC"
        );
        $readingsStmt->execute(array_merge($sensorIds, [$start, $end]));
        $rows = $readingsStmt->fetchAll(PDO::FETCH_ASSOC);
        $grouped = [];
        foreach ($rows as $row) {
            $grouped[(int)$row['sensor_id']][] = [
                'value' => (float)$row['value'],
                'ts' => strtotime($row['recorded_at']),
            ];
        }

        foreach ($powerSensors as $sensor) {
            $sensorId = (int)$sensor['id'];
            $deviceId = (int)$sensor['device_id'];
            if (!isset($deviceMap[$deviceId])) {
                continue;
            }

            $series = $grouped[$sensorId] ?? [];
            $values = array_map(static fn(array $point): float => $point['value'], $series);
            if (!$values && $sensor['latest_value'] !== null) {
                $values = [(float)$sensor['latest_value']];
            }

            $energyWh = 0.0;
            if (count($series) > 1) {
                for ($i = 1, $len = count($series); $i < $len; $i++) {
                    $prev = $series[$i - 1];
                    $curr = $series[$i];
                    $hours = max(0, $curr['ts'] - $prev['ts']) / 3600;
                    $energyWh += (($prev['value'] + $curr['value']) / 2) * $hours;
                }
            }

            if ($values) {
                $deviceMap[$deviceId]['latest_power_watts'] = end($values);
                $deviceMap[$deviceId]['avg_power_watts'] = array_sum($values) / count($values);
                $deviceMap[$deviceId]['peak_power_watts'] = max($values);
            }
            if ($energyWh > 0) {
                $deviceMap[$deviceId]['energy_wh'] = $energyWh;
            }
        }
    }

    $devicesOut = [];
    $summary = $defaults['summary'];
    $summary['total_logs'] = count($recentLogs);
    $summary['devices_total'] = count($deviceMap);

    foreach ($deviceMap as $device) {
        $device['active_duration_human'] = iotzyHumanDuration((int)$device['active_duration_seconds']);
        $device['energy_kwh'] = round(((float)$device['energy_wh']) / 1000, 4);
        if ($device['avg_power_watts'] !== null) {
            $device['avg_power_watts'] = round((float)$device['avg_power_watts'], 3);
        }
        if ($device['peak_power_watts'] !== null) {
            $device['peak_power_watts'] = round((float)$device['peak_power_watts'], 3);
        }
        if ($device['latest_power_watts'] !== null) {
            $device['latest_power_watts'] = round((float)$device['latest_power_watts'], 3);
        }

        $summary['device_on_events'] += (int)$device['on_events'];
        $summary['device_off_events'] += (int)$device['off_events'];
        $summary['total_duration_seconds'] += (int)$device['active_duration_seconds'];
        $summary['total_energy_wh'] += (float)$device['energy_wh'];

        if ((int)$device['active_duration_seconds'] > 0) {
            $summary['devices_active_today']++;
        }
        if ((float)$device['energy_wh'] > 0 || $device['latest_power_watts'] !== null) {
            $summary['power_devices']++;
            $summary['current_power_watts'] += (float)($device['latest_power_watts'] ?? 0);
        }

        $devicesOut[] = $device;
    }

    $summary['devices_idle_today'] = max(0, $summary['devices_total'] - $summary['devices_active_today']);
    $summary['total_duration_human'] = iotzyHumanDuration((int)$summary['total_duration_seconds']);
    $summary['total_energy_wh'] = round((float)$summary['total_energy_wh'], 3);
    $summary['total_energy_kwh'] = round(((float)$summary['total_energy_wh']) / 1000, 4);
    $summary['current_power_watts'] = round((float)$summary['current_power_watts'], 3);

    usort($devicesOut, static function (array $a, array $b): int {
        $durationCompare = ($b['active_duration_seconds'] <=> $a['active_duration_seconds']);
        return $durationCompare !== 0 ? $durationCompare : strcmp($a['name'], $b['name']);
    });

    return [
        'date' => $date,
        'summary' => $summary,
        'timeline' => $timeline,
        'devices' => $devicesOut,
        'recent_logs' => $recentLogs,
    ];
}
