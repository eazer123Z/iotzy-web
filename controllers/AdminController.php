<?php
/**
 * controllers/AdminController.php — Admin-only management actions
 */

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../middleware/auth.php';

function handleAdminAction(string $action, int $adminId, array $body, PDO $db): void {
    
    // Safety Check: Double verify admin role
    if (!isAdmin()) {
        http_response_code(403);
        jsonOut(['success' => false, 'error' => 'Akses ditolak. Anda bukan Administrator.']);
    }

    // ===================== GET USERS =====================
    if ($action === 'admin_get_users') {
        try {
            $stmt = $db->query("
                SELECT 
                    u.id, u.username, u.email, u.full_name, u.role, u.is_active, u.last_login, u.created_at,
                    (SELECT COUNT(*) FROM devices WHERE user_id = u.id) as device_count,
                    (SELECT COUNT(*) FROM sensors WHERE user_id = u.id) as sensor_count
                FROM users u
                ORDER BY u.id DESC
            ");
            $users = $stmt->fetchAll();
            jsonOut(['success' => true, 'data' => $users]);
        } catch (Exception $e) {
            jsonOut(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    // ===================== GET USER DETAILS =====================
    if ($action === 'admin_get_user_details') {
        $targetId = (int)($body['id'] ?? 0);
        if (!$targetId) jsonOut(['success' => false, 'error' => 'ID User tidak valid.']);

        try {
            // Get devices
            $stmt = $db->prepare("SELECT id, name, type, status, last_seen FROM devices WHERE user_id = ? ORDER BY name ASC");
            $stmt->execute([$targetId]);
            $devices = $stmt->fetchAll();

            // Get sensors
            $stmt = $db->prepare("SELECT id, name, type, value, unit, last_update FROM sensors WHERE user_id = ? ORDER BY name ASC");
            $stmt->execute([$targetId]);
            $sensors = $stmt->fetchAll();

            jsonOut([
                'success' => true,
                'data' => [
                    'devices' => $devices,
                    'sensors' => $sensors
                ]
            ]);
        } catch (Exception $e) {
            jsonOut(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    // ===================== UPDATE USER =====================
    if ($action === 'admin_update_user') {
        $targetId = (int)($body['id'] ?? 0);
        $role     = $body['role'] ?? 'user';
        $isActive = (int)($body['is_active'] ?? 1);
        $fullName = trim($body['full_name'] ?? '');

        if (!$targetId) jsonOut(['success' => false, 'error' => 'ID User tidak valid.']);
        
        // Prevent disabling yourself
        if ($targetId === $adminId && $isActive === 0) {
            jsonOut(['success' => false, 'error' => 'Anda tidak bisa menonaktifkan akun sendiri.']);
        }

        try {
            $stmt = $db->prepare("UPDATE users SET role = ?, is_active = ?, full_name = ? WHERE id = ?");
            $stmt->execute([$role, $isActive, $fullName, $targetId]);
            jsonOut(['success' => true, 'message' => 'User berhasil diperbarui.']);
        } catch (Exception $e) {
            jsonOut(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    // ===================== DELETE USER =====================
    if ($action === 'admin_delete_user') {
        $targetId = (int)($body['id'] ?? 0);
        if (!$targetId) jsonOut(['success' => false, 'error' => 'ID User tidak valid.']);

        if ($targetId === $adminId) {
            jsonOut(['success' => false, 'error' => 'Anda tidak bisa menghapus akun sendiri.']);
        }

        try {
            $stmt = $db->prepare("DELETE FROM users WHERE id = ?");
            $stmt->execute([$targetId]);
            jsonOut(['success' => true, 'message' => 'User berhasil dihapus.']);
        } catch (Exception $e) {
            jsonOut(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    // ===================== ADD USER (ADMIN VERSION) =====================
    if ($action === 'admin_add_user') {
        $user = trim($body['username'] ?? '');
        $mail = trim($body['email'] ?? '');
        $pass = $body['password'] ?? '';
        $role = $body['role'] ?? 'user';

        if (!$user || !$mail || !$pass) jsonOut(['success' => false, 'error' => 'Data tidak lengkap.']);

        $hash = password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]);
        try {
            $stmt = $db->prepare("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)");
            $stmt->execute([$user, $mail, $hash, $role]);
            jsonOut(['success' => true, 'message' => 'User baru berhasil dibuat.']);
        } catch (Exception $e) {
            jsonOut(['success' => false, 'error' => 'Username atau Email sudah ada.']);
        }
    }

    // ===================== DELETE USER DEVICE =====================
    if ($action === 'admin_delete_user_device') {
        $deviceId = (int)($body['device_id'] ?? 0);
        if (!$deviceId) jsonOut(['success' => false, 'error' => 'ID Perangkat tidak valid.']);

        try {
            $stmt = $db->prepare("DELETE FROM devices WHERE id = ?");
            $stmt->execute([$deviceId]);
            jsonOut(['success' => true, 'message' => 'Perangkat berhasil dihapus.']);
        } catch (Exception $e) {
            jsonOut(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    // ===================== DELETE USER SENSOR =====================
    if ($action === 'admin_delete_user_sensor') {
        $sensorId = (int)($body['sensor_id'] ?? 0);
        if (!$sensorId) jsonOut(['success' => false, 'error' => 'ID Sensor tidak valid.']);

        try {
            $stmt = $db->prepare("DELETE FROM sensors WHERE id = ?");
            $stmt->execute([$sensorId]);
            jsonOut(['success' => true, 'message' => 'Sensor berhasil dihapus.']);
        } catch (Exception $e) {
            jsonOut(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    // ===================== RESET USER PASSWORD =====================
    if ($action === 'admin_reset_user_password') {
        $targetId = (int)($body['id'] ?? 0);
        $newPass  = $body['password'] ?? '';

        if (!$targetId || !$newPass) jsonOut(['success' => false, 'error' => 'Data tidak lengkap.']);
        
        $hash = password_hash($newPass, PASSWORD_BCRYPT, ['cost' => 12]);
        try {
            $stmt = $db->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
            $stmt->execute([$hash, $targetId]);
            jsonOut(['success' => true, 'message' => 'Password berhasil direset.']);
        } catch (Exception $e) {
            jsonOut(['success' => false, 'error' => $e->getMessage()]);
        }
    }
}
