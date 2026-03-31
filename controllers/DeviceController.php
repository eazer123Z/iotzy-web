<?php

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/UserDataService.php';

function handleDeviceAction(string $action, int $userId, array $body, PDO $db): void
{
    if ($action === 'get_devices') {
        jsonOut(getUserDevicesClientPayload($userId, $db));
    }

    if ($action === 'get_device_templates') {
        jsonOut([
            'success' => true,
            'templates' => getUserDeviceTemplates($db),
        ]);
    }

    if ($action === 'get_device_sessions') {
        $devId = (int)($_GET['device_id'] ?? $body['device_id'] ?? 0);
        $limit = max(1, min((int)($_GET['limit'] ?? $body['limit'] ?? 20), 200));
        if ($devId > 0) {
            $stmt = $db->prepare(
                "SELECT ds.*, d.name AS device_name
                 FROM device_sessions ds
                 JOIN devices d ON d.id = ds.device_id
                 WHERE ds.device_id = ? AND d.user_id = ?
                 ORDER BY ds.turned_on_at DESC
                 LIMIT ?"
            );
            $stmt->execute([$devId, $userId, $limit]);
        } else {
            $stmt = $db->prepare(
                "SELECT ds.*, d.name AS device_name
                 FROM device_sessions ds
                 JOIN devices d ON d.id = ds.device_id
                 WHERE d.user_id = ?
                 ORDER BY ds.turned_on_at DESC
                 LIMIT ?"
            );
            $stmt->execute([$userId, $limit]);
        }
        jsonOut($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    requireCsrf();

    if ($action === 'add_device') {
        $name = trim((string)($body['name'] ?? ''));
        if ($name === '') {
            jsonOut(['success' => false, 'error' => 'Nama perangkat tidak boleh kosong']);
        }

        $template = resolveDeviceTemplate(
            $db,
            $body['device_template_id'] ?? null,
            $body['template_slug'] ?? null,
            $body['type'] ?? null,
            $body['icon'] ?? null
        );

        $type = trim((string)($body['type'] ?? ''));
        if ($type === '') {
            $type = $template['device_type'] ?? 'switch';
        }
        $icon = trim((string)($body['icon'] ?? ''));
        if ($icon === '') {
            $icon = $template['default_icon'] ?? 'fa-plug';
        }

        $stateOnLabel = trim((string)($body['state_on_label'] ?? ($template['state_on_label'] ?? '')));
        $stateOffLabel = trim((string)($body['state_off_label'] ?? ($template['state_off_label'] ?? '')));
        $topicSub = trim((string)($body['topic_sub'] ?? ''));
        $topicPub = trim((string)($body['topic_pub'] ?? ''));
        $controlValue = array_key_exists('control_value', $body) && $body['control_value'] !== ''
            ? (float)$body['control_value']
            : null;
        $controlText = trim((string)($body['control_text'] ?? ''));

        $deviceKeyBase = preg_replace('/[^a-z0-9_]+/i', '_', strtolower($name)) ?: 'device';
        $deviceKey = $deviceKeyBase . '_' . substr(bin2hex(random_bytes(4)), 0, 8);

        $newId = dbInsert(
            "INSERT INTO devices (
                user_id, device_template_id, device_key, name, icon, type, topic_sub, topic_pub,
                control_value, control_text, state_on_label, state_off_label
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                $userId,
                $template['id'] ?? null,
                $deviceKey,
                $name,
                $icon,
                $type,
                $topicSub !== '' ? $topicSub : null,
                $topicPub !== '' ? $topicPub : null,
                $controlValue,
                $controlText !== '' ? $controlText : null,
                $stateOnLabel !== '' ? $stateOnLabel : null,
                $stateOffLabel !== '' ? $stateOffLabel : null,
            ]
        );

        addActivityLog(
            $userId,
            $name,
            'Perangkat baru ditambahkan',
            'User',
            'success',
            $newId,
            null,
            ['template_slug' => $template['slug'] ?? null, 'type' => $type]
        );

        jsonOut([
            'success' => true,
            'id' => $newId,
            'device_key' => $deviceKey,
            'message' => 'Perangkat berhasil ditambahkan',
        ]);
    }

    if ($action === 'update_device') {
        $devId = (int)($body['id'] ?? 0);
        $name = trim((string)($body['name'] ?? ''));
        if ($devId <= 0 || $name === '') {
            jsonOut(['success' => false, 'error' => 'ID atau nama perangkat tidak valid']);
        }

        $stmt = $db->prepare("SELECT * FROM devices WHERE id = ? AND user_id = ? LIMIT 1");
        $stmt->execute([$devId, $userId]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$existing) {
            jsonOut(['success' => false, 'error' => 'Akses ditolak atau perangkat tidak ditemukan']);
        }

        $template = resolveDeviceTemplate(
            $db,
            $body['device_template_id'] ?? $existing['device_template_id'] ?? null,
            $body['template_slug'] ?? null,
            $body['type'] ?? $existing['type'] ?? null,
            $body['icon'] ?? $existing['icon'] ?? null
        );

        $type = trim((string)($body['type'] ?? $existing['type'] ?? ''));
        if ($type === '') {
            $type = $template['device_type'] ?? 'switch';
        }
        $icon = trim((string)($body['icon'] ?? $existing['icon'] ?? ''));
        if ($icon === '') {
            $icon = $template['default_icon'] ?? 'fa-plug';
        }

        $topicSub = trim((string)($body['topic_sub'] ?? $existing['topic_sub'] ?? ''));
        $topicPub = trim((string)($body['topic_pub'] ?? $existing['topic_pub'] ?? ''));
        $controlValue = array_key_exists('control_value', $body) && $body['control_value'] !== ''
            ? (float)$body['control_value']
            : ($existing['control_value'] !== null ? (float)$existing['control_value'] : null);
        $controlText = trim((string)($body['control_text'] ?? $existing['control_text'] ?? ''));
        $stateOnLabel = trim((string)($body['state_on_label'] ?? $existing['state_on_label'] ?? ($template['state_on_label'] ?? '')));
        $stateOffLabel = trim((string)($body['state_off_label'] ?? $existing['state_off_label'] ?? ($template['state_off_label'] ?? '')));

        dbWrite(
            "UPDATE devices
             SET device_template_id = ?, name = ?, icon = ?, type = ?, topic_sub = ?, topic_pub = ?,
                 control_value = ?, control_text = ?, state_on_label = ?, state_off_label = ?
             WHERE id = ? AND user_id = ?",
            [
                $template['id'] ?? null,
                $name,
                $icon,
                $type,
                $topicSub !== '' ? $topicSub : null,
                $topicPub !== '' ? $topicPub : null,
                $controlValue,
                $controlText !== '' ? $controlText : null,
                $stateOnLabel !== '' ? $stateOnLabel : null,
                $stateOffLabel !== '' ? $stateOffLabel : null,
                $devId,
                $userId,
            ]
        );

        addActivityLog(
            $userId,
            $name,
            'Konfigurasi perangkat diperbarui',
            'User',
            'info',
            $devId,
            null,
            ['template_slug' => $template['slug'] ?? null, 'type' => $type]
        );

        jsonOut(['success' => true, 'message' => 'Data perangkat berhasil diperbarui']);
    }

    if ($action === 'delete_device') {
        $devId = (int)($body['id'] ?? 0);
        $stmt = $db->prepare("SELECT name FROM devices WHERE id = ? AND user_id = ?");
        $stmt->execute([$devId, $userId]);
        $dev = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($dev) {
            dbWrite("DELETE FROM devices WHERE id = ? AND user_id = ?", [$devId, $userId]);
            addActivityLog($userId, $dev['name'], 'Perangkat telah dihapus dari sistem', 'User', 'warning', $devId);
        }
        jsonOut(['success' => true, 'message' => 'Perangkat berhasil dihapus']);
    }

    if ($action === 'update_device_state') {
        $devId = (int)($body['id'] ?? 0);
        $newState = isset($body['state']) ? (int)(bool)$body['state'] : 0;
        $trigger = trim((string)($body['trigger'] ?? 'Manual'));
        $allowedTriggers = ['Manual', 'Automation', 'Schedule', 'CV', 'System', 'MQTT', 'AI', 'AI Assistant (Sync)'];
        if (!in_array($trigger, $allowedTriggers, true)) {
            $trigger = 'Manual';
        }

        try {
            $db->beginTransaction();
            $stmt = $db->prepare("SELECT id, name, last_state FROM devices WHERE id = ? AND user_id = ? FOR UPDATE");
            $stmt->execute([$devId, $userId]);
            $dev = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$dev) {
                $db->rollBack();
                jsonOut(['success' => false, 'error' => 'Perangkat tidak ditemukan']);
            }

            $prevState = (int)$dev['last_state'];
            dbWrite(
                "UPDATE devices
                 SET last_state = ?, latest_state = ?, last_seen = NOW(), last_state_changed = NOW()
                 WHERE id = ?",
                [$newState, $newState, $devId]
            );

            if ($newState === 1 && $prevState === 0) {
                dbInsert(
                    "INSERT INTO device_sessions (user_id, device_id, turned_on_at, trigger_type)
                     VALUES (?, ?, NOW(), ?)",
                    [$userId, $devId, $trigger]
                );
            } elseif ($newState === 0 && $prevState === 1) {
                $s2 = $db->prepare(
                    "SELECT id, turned_on_at
                     FROM device_sessions
                     WHERE device_id = ? AND turned_off_at IS NULL
                     ORDER BY turned_on_at DESC
                     LIMIT 1"
                );
                $s2->execute([$devId]);
                $sess = $s2->fetch(PDO::FETCH_ASSOC);
                if ($sess) {
                    dbWrite(
                        "UPDATE device_sessions
                         SET turned_off_at = NOW(), duration_seconds = ?
                         WHERE id = ?",
                        [max(0, (int)(time() - strtotime($sess['turned_on_at']))), $sess['id']]
                    );
                }
            }

            $db->commit();
        } catch (PDOException $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log('[IoTzy] update_device_state: ' . $e->getMessage());
            jsonOut(['success' => false, 'error' => 'Gagal memperbarui status']);
        }

        addActivityLog(
            $userId,
            $dev['name'],
            $newState ? 'Dinyalakan (ON)' : 'Dimatikan (OFF)',
            $trigger,
            'info',
            $devId,
            null,
            ['new_state' => $newState]
        );

        jsonOut(['success' => true, 'newState' => $newState]);
    }
}
