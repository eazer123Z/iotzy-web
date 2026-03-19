<?php
/**
 * api/db-check.php — Database Inspector
 */

require_once __DIR__ . '/../core/bootstrap.php';
header('Content-Type: application/json; charset=utf-8');

$db = getLocalDB();
if (!$db) {
    echo json_encode(['success' => false, 'error' => 'Koneksi database gagal.']);
    exit;
}

try {
    $tables = [];
    $stmt = $db->query("SHOW TABLES");
    $allTables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    foreach ($allTables as $table) {
        $countStmt = $db->query("SELECT COUNT(*) FROM `$table`");
        $rowCount = (int)$countStmt->fetchColumn();

        // Ambil 3 data terakhir (opsional)
        $data = [];
        try {
            $dataStmt = $db->query("SELECT * FROM `$table` LIMIT 3");
            $data = $dataStmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {}

        $tables[$table] = [
            'rows' => $rowCount,
            'sample' => $data
        ];
    }

    echo json_encode([
        'success' => true,
        'database' => getenv('MYSQL_DATABASE'),
        'tables_count' => count($tables),
        'tables' => $tables,
        'time' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
