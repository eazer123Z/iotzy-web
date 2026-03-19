<?php
// api/index.php
require __DIR__ . '/../config/database.php';

try {
    $db = getLocalDB();
    if (!$db) throw new Exception("Gagal konek DB. Cek Environment Variables di Vercel!");

    $sql = file_get_contents(__DIR__ . '/../database/schema.sql');
    $db->exec($sql);

    echo "<h1>✅ SUKSES!</h1>";
    echo "<p>Tabel database sudah berhasil dibuat di Aiven.</p>";
    echo "<a href='/'>Klik di sini untuk ke halaman Login</a>";
    
} catch (Exception $e) {
    echo "<h1>❌ GAGAL</h1>";
    echo "<pre>" . $e->getMessage() . "</pre>";
}
