<?php
/**
 * views/auth/register.php — Register Page + Auto Setup
 */
require_once __DIR__ . '/../../config/database.php';

// Trik Jitu: Jalankan setup otomatis di sini
try {
    $db = getLocalDB();
    if ($db) {
        $check = $db->query("SHOW TABLES LIKE 'users'")->fetch();
        if (!$check) {
            $sql = file_get_contents(__DIR__ . '/../../database/schema.sql');
            $db->exec($sql);
        }
    }
} catch (Exception $e) {
    // abaikan saja jika gagal di sini
}

// ... sisanya biarkan kode aslinya ...
?>
<!DOCTYPE html>
<!-- Lanjutkan kode HTML register Anda seperti biasa -->
