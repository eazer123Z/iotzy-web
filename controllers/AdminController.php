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
            $stmt = $db->query("SELECT id, username, email, full_name, role, is_active, last_login, created_at FROM users ORDER BY id DESC");
            $users = $stmt->fetchAll();
            jsonOut(['success' => true, 'data' => $users]);
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
}
