<?php
/**
 * config/database.php — FINAL VERSION (Vercel Ready)
 * Support: MySQL (Primary) + PostgreSQL (Optional Backup)
 */

// Charset default
define('DB_CHARSET', 'utf8mb4');

/**
 * Get koneksi PDO MySQL (Primary)
 */
function getLocalDB(): ?PDO {
    static $pdo = null;
    if ($pdo !== null) return ($pdo instanceof PDO) ? $pdo : null;

    try {
        // Ambil dari ENV (WAJIB untuk Vercel)
        $h = getenv('MYSQL_HOST');
        $port = getenv('MYSQL_PORT') ?: '3306';
        $d = getenv('MYSQL_DATABASE');
        $u = getenv('MYSQL_USER');
        $p = getenv('MYSQL_PASSWORD');

        // Validasi ENV
        if (!$h || !$d || !$u) {
            throw new Exception("ENV MySQL belum lengkap (MYSQL_HOST / DB / USER)");
        }

        // DSN
        $dsn = "mysql:host=$h;port=$port;dbname=$d;charset=" . DB_CHARSET;

        // PDO Options (SUDAH FIX deprecated)
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ];

        // Optional SSL (beberapa provider butuh ini)
        if (defined('\Pdo\Mysql::ATTR_SSL_VERIFY_SERVER_CERT')) {
            $options[\Pdo\Mysql::ATTR_SSL_VERIFY_SERVER_CERT] = false;
        }

        $pdo = new PDO($dsn, $u, $p, $options);

    } catch (Throwable $e) {
        $msg = "[IoTzy] DB Error: " . $e->getMessage();
        error_log($msg);

        // DEBUG MODE (boleh dihapus kalau sudah live)
        echo "❌ GAGAL KONEK DB<br>";
        echo "Error: " . htmlspecialchars($e->getMessage()) . "<br>";
        echo "HOST: " . htmlspecialchars($h ?? 'NULL') . "<br>";
        echo "DB: " . htmlspecialchars($d ?? 'NULL') . "<br>";

        $pdo = false;
    }

    return ($pdo instanceof PDO) ? $pdo : null;
}

/**
 * PostgreSQL (Optional Backup)
 */
function getPostgresDB(): ?PDO {
    static $pdo = null;
    if ($pdo !== null) return ($pdo instanceof PDO) ? $pdo : null;

    try {
        $h = getenv('POSTGRES_HOST');
        $d = getenv('POSTGRES_DB');
        $u = getenv('POSTGRES_USER');
        $p = getenv('POSTGRES_PASSWORD');

        if (!$h || !$d || !$u) {
            return null; // optional aja
        }

        $dsn = "pgsql:host=$h;dbname=$d";

        $pdo = new PDO($dsn, $u, $p, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

    } catch (Throwable $e) {
        error_log('[IoTzy] Postgres error: ' . $e->getMessage());
        $pdo = false;
    }

    return ($pdo instanceof PDO) ? $pdo : null;
}

/**
 * Write query (INSERT/UPDATE/DELETE)
 */
function dbWrite(string $sql, array $params = []): bool {
    $db = getLocalDB();
    if (!$db) return false;

    try {
        $stmt = $db->prepare($sql);
        return $stmt->execute($params);
    } catch (PDOException $e) {
        error_log('[IoTzy] dbWrite error: ' . $e->getMessage());
        return false;
    }
}

/**
 * Insert + return ID
 */
function dbInsert(string $sql, array $params = []): ?int {
    $db = getLocalDB();
    if (!$db) return null;

    try {
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return (int)$db->lastInsertId();
    } catch (PDOException $e) {
        error_log('[IoTzy] dbInsert error: ' . $e->getMessage());
        return null;
    }
}

/**
 * Status koneksi DB
 */
function dbStatus(): array {
    return [
        'mysql'    => getLocalDB() !== null,
        'postgres' => getPostgresDB() !== null,
    ];
}
