<?php
// api/index.php — SELF-CONTAINED SETUP
require __DIR__ . '/../config/database.php';

try {
    $db = getLocalDB();
    if (!$db) throw new Exception("Gagal konek DB. Cek Vercel ENV!");

    // Masukkan SQL langsung di sini agar tidak ada masalah folder
    $sql = "
    CREATE TABLE IF NOT EXISTS `users` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `username` varchar(50) NOT NULL,
      `password` varchar(255) NOT NULL,
      `email` varchar(100) DEFAULT NULL,
      `full_name` varchar(100) DEFAULT NULL,
      `role` enum('admin','user') DEFAULT 'user',
      `is_active` tinyint(1) DEFAULT 1,
      `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
      PRIMARY KEY (`id`),
      UNIQUE KEY `username` (`username`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    INSERT IGNORE INTO `users` (username, password, full_name, role) 
    VALUES ('admin', '" . password_hash('admin123', PASSWORD_DEFAULT) . "', 'Administrator', 'admin');
    ";

    // Jalankan perintah
    $db->exec($sql);

    echo "<div style='text-align:center; padding:50px; font-family:sans-serif;'>";
    echo "<h1 style='color:green;'>✅ DATABASE SIAP!</h1>";
    echo "<p>Tabel 'users' sudah berhasil dibuat di Aiven.</p>";
    echo "<p>Silakan klik tombol di bawah untuk login:</p>";
    echo "<a href='/' style='padding:10px 20px; background:blue; color:white; text-decoration:none; border-radius:5px;'>KE HALAMAN LOGIN</a>";
    echo "</div>";

} catch (Exception $e) {
    echo "<h1>❌ GAGAL SETUP</h1>";
    echo "<pre>" . $e->getMessage() . "</pre>";
}
