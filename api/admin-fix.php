<?php
/**
 * api/admin-fix.php — Reset Admin (Hapus lama + buat baru)
 */

require_once __DIR__ . '/../core/bootstrap.php';

// Proteksi token
$secret = 'iotzy_super_secret_123';
if (($_GET['token'] ?? '') !== $secret) {
    http_response_code(403);
    die("Akses Ditolak.");
}

$db = getLocalDB();
if (!$db) {
    die("Gagal konek DB: " . ($GLOBALS['DB_LAST_ERROR'] ?? 'Unknown error'));
}

$results = [];

try {
    // 🔥 1. Hapus SEMUA admin lama
    $stmt = $db->prepare("DELETE FROM users WHERE role = 'admin'");
    $stmt->execute();
    $results[] = "🗑️ Semua admin lama berhasil dihapus";

    // 🔐 2. Buat admin baru
    $username = 'rendyaulianur';
    $email    = 'rendyaulianur@iotzy.local';
    $password = 'bosrendi123';

    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

    $stmt = $db->prepare("
        INSERT INTO users (username, email, password_hash, full_name, role, is_active)
        VALUES (?, ?, ?, ?, 'admin', 1)
    ");

    $stmt->execute([
        $username,
        $email,
        $hash,
        'Administrator'
    ]);

    $results[] = "✅ Admin baru berhasil dibuat:";
    $results[] = "👤 Username: <b>$username</b>";
    $results[] = "🔑 Password: <b>$password</b>";

} catch (Throwable $e) {
    $results[] = "❌ Error: " . $e->getMessage();
}

// Output
echo "<h3>🔥 Admin Reset Berhasil</h3><ul>";
foreach ($results as $r) echo "<li>$r</li>";
echo "</ul><p>⚠️ Hapus file ini setelah digunakan!</p>";
