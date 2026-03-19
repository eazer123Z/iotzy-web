<?php
require_once __DIR__ . '/core/bootstrap.php';

$db = getLocalDB();

echo "<h3>📦 DAFTAR TABEL</h3>";

$stmt = $db->query("SHOW TABLES");
$tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

foreach ($tables as $t) {
    echo "- $t <br>";
}
