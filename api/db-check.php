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

        // Ambil struktur kolom (DESCRIBE)
        $columnStmt = $db->query("DESCRIBE `$table` ");
        $columns = $columnStmt->fetchAll(PDO::FETCH_ASSOC);

        // Ambil data (Khusus 'users' ambil semua, lainnya 3 saja)
        $data = [];
        try {
            $limit = ($table === 'users') ? 100 : 3;
            $dataStmt = $db->query("SELECT * FROM `$table` LIMIT $limit");
            $data = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            // Masking password_hash untuk keamanan layar
            if ($table === 'users') {
                foreach ($data as &$row) {
                    if (isset($row['password_hash']))
                        $row['password_hash'] = '***HIDDEN***';
                }
            }
        }
        catch (Exception $e) {
        }

        $tables[$table] = [
            'rows' => $rowCount,
            'columns' => $columns,
            'preview' => $data
        ];
    }

    echo json_encode([
        'success' => true,
        'database' => getenv('MYSQL_DATABASE'),
        'tables_count' => count($tables),
        'tables' => $tables,
        'time' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);

}
catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
