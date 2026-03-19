<?php
/**
 * config/database.php — Konfigurasi dan Koneksi Database
 * 
 * Docker Optimized: MySQL (primary) + PostgreSQL (backup)
 */

// Konfigurasi Default (Akan ditimpa oleh .env jika ada)
define('DB_PG_HOST', 'iotzy-database');
define('DB_PG_NAME', 'iotzydb');
define('DB_PG_USER', 'iotzy');
define('DB_PG_PASS', 'iotzy123');

define('DB_MY_HOST', 'iotzy-mysql');
define('DB_MY_NAME', 'iotzydb');
define('DB_MY_USER', 'iotzy');
define('DB_MY_PASS', 'iotzy123');
define('DB_CHARSET', 'utf8mb4');

/**
 * Get atau buat koneksi PDO ke MySQL (primary).
 */
function getLocalDB(): ?PDO {
    static $pdo = null;
    if ($pdo !== null) return ($pdo instanceof PDO) ? $pdo : null;

    try {
        // Ambil dari environment Docker
        $h = getenv('MYSQL_HOST') ?: getenv('DB_HOST') ?: DB_MY_HOST;
        $port = getenv('MYSQL_PORT') ?: getenv('DB_PORT') ?: '3306';
        $d = getenv('MYSQL_DATABASE') ?: getenv('MYSQL_DB') ?: getenv('DB_NAME') ?: DB_MY_NAME;
        $u = getenv('MYSQL_USER')     ?: getenv('DB_USER') ?: DB_MY_USER;
        $p = getenv('MYSQL_PASSWORD') ?: getenv('MYSQL_PASS') ?: getenv('DB_PASS') ?: DB_MY_PASS;
        
        // Safety: Jika di Docker dan host masih localhost, arahkan ke container
        if (($h === '127.0.0.1' || $h === 'localhost') && file_exists('/.dockerenv')) {
            $h = 'iotzy-mysql';
        }

        $dsn = "mysql:host=$h;port=$port;dbname=$d;charset=" . DB_CHARSET;
        $pdo = new PDO($dsn, $u, $p, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::MYSQL_ATTR_SSL_CA       => '',
            PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false,
        ]);
        $pdo->exec("SET NAMES " . DB_CHARSET);
    } catch (PDOException $e) {
        $msg = "[IoTzy] DB Error: " . $e->getMessage();
        error_log($msg);
        $GLOBALS['DB_LAST_ERROR'] = $msg;
        $pdo = false;
    }

    return ($pdo instanceof PDO) ? $pdo : null;
}

/**
 * Get atau buat koneksi PDO ke PostgreSQL (backup).
 */
function getPostgresDB(): ?PDO {
    static $pdo = null;
    if ($pdo !== null) return ($pdo instanceof PDO) ? $pdo : null;

    try {
        $h = getenv('POSTGRES_HOST') ?: DB_PG_HOST;
        $d = getenv('POSTGRES_DB')   ?: DB_PG_NAME;
        $u = getenv('POSTGRES_USER') ?: DB_PG_USER;
        $p = getenv('POSTGRES_PASSWORD') ?: DB_PG_PASS;
        
        $dsn = "pgsql:host=$h;dbname=$d";
        $pdo = new PDO($dsn, $u, $p, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    } catch (PDOException $e) {
        error_log('[IoTzy] PostgresDB error: ' . $e->getMessage());
        $pdo = false;
    }

    return ($pdo instanceof PDO) ? $pdo : null;
}

/**
 * Execute an INSERT/UPDATE/DELETE query.
 */
function dbWrite(string $sql, array $params = []): bool {
    $db = getLocalDB();
    if (!$db) return false;
    try {
        $db->prepare($sql)->execute($params);
        return true;
    } catch (PDOException $e) {
        error_log('[IoTzy] dbWrite error: ' . $e->getMessage() . ' | SQL: ' . $sql);
        return false;
    }
}

/**
 * Execute an INSERT and return the new row ID.
 */
function dbInsert(string $sql, array $params = []): ?int {
    $db = getLocalDB();
    if (!$db) return null;
    try {
        $db->prepare($sql)->execute($params);
        $id = $db->lastInsertId();
        return $id ? (int)$id : null;
    } catch (PDOException $e) {
        error_log('[IoTzy] dbInsert error: ' . $e->getMessage() . ' | SQL: ' . $sql);
        return null;
    }
}

/**
 * Check database connectivity.
 */
function dbStatus(): array {
    return [
        'primary_mysql' => getLocalDB() !== null,
        'postgres'      => getPostgresDB() !== null,
    ];
}
