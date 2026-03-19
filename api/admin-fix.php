<?php
/**
 * api/admin-fix.php — One-time fix for Admin account
 */

require_once __DIR__ . '/../core/bootstrap.php';

$db = getLocalDB();
if (!$db) {
    die("Gagal konek DB: " . ($GLOBALS['DB_LAST_ERROR'] ?? 'Unknown error'));
}

$results = [];

try {
    // 1. Cek apakah user 'admin' sudah ada
    $stmt = $db->prepare("SELECT id, role FROM users WHERE username = 'admin' LIMIT 1");
    $stmt->execute();
    $admin = $stmt->fetch();

    if ($admin) {
        // Jika sudah ada, paksa set role jadi 'admin' dan RESET PASSWORD agar user tahu
        $hash = password_hash('admin123', PASSWORD_BCRYPT, ['cost' => 12]);
        $db->prepare("UPDATE users SET role = 'admin', password_hash = ?, is_active = 1 WHERE id = ?")
           ->execute([$hash, $admin['id']]);
        $results[] = "✅ User 'admin' ditemukan. Role diperbarui & Password di-reset ke: <b>admin123</b>";
    } else {
        // Jika belum ada, buat baru
        $hash = password_hash('admin123', PASSWORD_BCRYPT, ['cost' => 12]);
        $db->prepare("INSERT INTO users (username, email, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)")
           ->execute(['admin', 'admin@iotzy.local', $hash, 'Administrator', 'admin', 1]);
        $results[] = "✅ User 'admin' baru berhasil dibuat (Password: admin123).";
    }
} catch (Throwable $e) {
    $results[] = "❌ Error: " . $e->getMessage();
}

echo "<h3>IoTzy Admin Fix Tool</h3><ul>";
foreach ($results as $r) echo "<li>$r</li>";
echo "</ul><p>Silakan hapus file ini setelah digunakan!</p>";
