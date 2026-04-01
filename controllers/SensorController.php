<?php

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/UserDataService.php';

function handleSensorAction(string $action, int $userId, array $body, PDO $db): void
{
    if ($action === 'get_sensors') {
        jsonOut(getUserSensorsClientPayload($userId, $db));
    }

    if ($action === 'get_sensor_templates') {
        jsonOut([
            'success' => true,
            'templates' => getUserSensorTemplates($db),
        ]);
    }

    if ($action === 'get_sensor_readings' || $action === 'get_sensor_history') {
        $senId = (int)($_GET['sensor_id'] ?? $body['sensor_id'] ?? 0);
        $limit = max(1, min((int)($_GET['limit'] ?? $body['limit'] ?? 30), 500));
        $offset = max(0, (int)($_GET['offset'] ?? $body['offset'] ?? 0));
        if ($senId <= 0) {
            jsonOut([]);
        }

        $stmt = $db->prepare(
            "SELECT t.value, t.recorded_at
             FROM (
                SELECT sr.value, sr.recorded_at
                FROM sensor_readings sr
                JOIN sensors s ON s.id = sr.sensor_id
                WHERE sr.sensor_id = ? AND s.user_id = ?
                ORDER BY sr.recorded_at DESC
                LIMIT ? OFFSET ?
             ) t
             ORDER BY t.recorded_at ASC"
        );
        $stmt->execute([$senId, $userId, $limit, $offset]);
        jsonOut($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    requireCsrf();

    if ($action === 'add_sensor') {
        $name = trim((string)($body['name'] ?? ''));
        $topic = trim((string)($body['topic'] ?? ''));
        if ($name === '' || $topic === '') {
            jsonOut(['success' => false, 'error' => 'Nama sensor dan topic MQTT harus diisi']);
        }

        $template = resolveSensorTemplate(
            $db,
            $body['sensor_template_id'] ?? null,
            $body['template_slug'] ?? null,
            $body['type'] ?? $body['sensor_type'] ?? null
        );

        $type = trim((string)($body['type'] ?? $body['sensor_type'] ?? ''));
        if ($type === '') {
            $type = $template['sensor_type'] ?? 'temperature';
        }

        $unit = trim((string)($body['unit'] ?? ''));
        if ($unit === '') {
            $unit = (string)($template['default_unit'] ?? '');
        }

        $icon = trim((string)($body['icon'] ?? ''));
        if ($icon === '') {
            $icon = (string)($template['default_icon'] ?? 'fa-microchip');
        }

        $deviceId = isset($body['device_id']) && $body['device_id'] !== '' ? (int)$body['device_id'] : null;
        if ($deviceId) {
            $stmt = $db->prepare("SELECT id FROM devices WHERE id = ? AND user_id = ? LIMIT 1");
            $stmt->execute([$deviceId, $userId]);
            if (!$stmt->fetch()) {
                $deviceId = null;
            }
        }

        $sensorKeyBase = preg_replace('/[^a-z0-9_]+/i', '_', strtolower($name)) ?: 'sensor';
        $sensorKey = $sensorKeyBase . '_' . substr(bin2hex(random_bytes(4)), 0, 8);

        $newId = dbInsert(
            "INSERT INTO sensors (
                user_id, device_id, sensor_template_id, sensor_key, name, type, icon, unit, topic
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                $userId,
                $deviceId,
                $template['id'] ?? null,
                $sensorKey,
                $name,
                $type,
                $icon,
                $unit !== '' ? $unit : null,
                $topic,
            ]
        );

        addActivityLog(
            $userId,
            $name,
            'Sensor baru ditambahkan',
            'User',
            'success',
            $deviceId,
            $newId,
            ['template_slug' => $template['slug'] ?? null, 'type' => $type]
        );

        jsonOut([
            'success' => true,
            'id' => $newId,
            'sensor_key' => $sensorKey,
            'message' => 'Sensor berhasil disimpan',
        ]);
    }

    if ($action === 'update_sensor') {
        $senId = (int)($body['id'] ?? 0);
        $name = trim((string)($body['name'] ?? ''));
        $topic = trim((string)($body['topic'] ?? ''));
        if ($senId <= 0 || $name === '' || $topic === '') {
            jsonOut(['success' => false, 'error' => 'Data input tidak lengkap']);
        }

        $stmt = $db->prepare("SELECT * FROM sensors WHERE id = ? AND user_id = ? LIMIT 1");
        $stmt->execute([$senId, $userId]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$existing) {
            jsonOut(['success' => false, 'error' => 'Sensor tidak ditemukan']);
        }

        $template = resolveSensorTemplate(
            $db,
            $body['sensor_template_id'] ?? $existing['sensor_template_id'] ?? null,
            $body['template_slug'] ?? null,
            $body['type'] ?? $body['sensor_type'] ?? $existing['type'] ?? null
        );

        $type = trim((string)($body['type'] ?? $body['sensor_type'] ?? $existing['type'] ?? ''));
        if ($type === '') {
            $type = $template['sensor_type'] ?? 'temperature';
        }

        $unit = trim((string)($body['unit'] ?? $existing['unit'] ?? ''));
        if ($unit === '') {
            $unit = (string)($template['default_unit'] ?? '');
        }

        $icon = trim((string)($body['icon'] ?? $existing['icon'] ?? ''));
        if ($icon === '') {
            $icon = (string)($template['default_icon'] ?? 'fa-microchip');
        }

        $deviceId = array_key_exists('device_id', $body)
            ? (($body['device_id'] !== '' && $body['device_id'] !== null) ? (int)$body['device_id'] : null)
            : ($existing['device_id'] !== null ? (int)$existing['device_id'] : null);
        if ($deviceId) {
            $devStmt = $db->prepare("SELECT id FROM devices WHERE id = ? AND user_id = ? LIMIT 1");
            $devStmt->execute([$deviceId, $userId]);
            if (!$devStmt->fetch()) {
                $deviceId = null;
            }
        }

        dbWrite(
            "UPDATE sensors
             SET device_id = ?, sensor_template_id = ?, name = ?, type = ?, icon = ?, unit = ?, topic = ?
             WHERE id = ? AND user_id = ?",
            [
                $deviceId,
                $template['id'] ?? null,
                $name,
                $type,
                $icon,
                $unit !== '' ? $unit : null,
                $topic,
                $senId,
                $userId,
            ]
        );

        addActivityLog(
            $userId,
            $name,
            'Konfigurasi sensor diperbarui',
            'User',
            'info',
            $deviceId,
            $senId,
            ['template_slug' => $template['slug'] ?? null, 'type' => $type]
        );

        jsonOut(['success' => true, 'message' => 'Sensor berhasil diperbarui']);
    }

    if ($action === 'delete_sensor') {
        $senId = (int)($body['id'] ?? 0);
        $stmt = $db->prepare("SELECT name, device_id FROM sensors WHERE id = ? AND user_id = ?");
        $stmt->execute([$senId, $userId]);
        $sensor = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($sensor) {
            dbWrite("DELETE FROM sensors WHERE id = ? AND user_id = ?", [$senId, $userId]);
            addActivityLog($userId, $sensor['name'], 'Sensor telah dihapus', 'User', 'warning', $sensor['device_id'] ? (int)$sensor['device_id'] : null, $senId);
        }
        jsonOut(['success' => true, 'message' => 'Sensor berhasil dihapus']);
    }

    if ($action === 'update_sensor_value') {
        $senId = (int)($body['id'] ?? $body['sensor_id'] ?? 0);
        $val = $body['value'] ?? null;
        if ($senId <= 0 || $val === null || $val === '') {
            jsonOut(['success' => false, 'error' => 'Parameter data tidak valid']);
        }

        $stmt = $db->prepare("SELECT id, name, device_id FROM sensors WHERE id = ? AND user_id = ? LIMIT 1");
        $stmt->execute([$senId, $userId]);
        $sensor = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$sensor) {
            jsonOut(['success' => false, 'error' => 'Sensor tidak ditemukan']);
        }

        dbWrite("UPDATE sensors SET latest_value = ?, last_seen = NOW() WHERE id = ?", [(string)$val, $senId]);

        $db->prepare(
            "INSERT INTO sensor_readings (sensor_id, value, recorded_at)
             SELECT ?, ?, NOW()
             FROM DUAL
             WHERE NOT EXISTS (
                SELECT 1
                FROM sensor_readings
                WHERE sensor_id = ?
                  AND recorded_at >= DATE_SUB(NOW(), INTERVAL 10 SECOND)
                LIMIT 1
             )"
        )->execute([$senId, (float)$val, $senId]);

        jsonOut(['success' => true]);
    }
}
