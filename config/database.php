<?php
/**
 * config/database.php — FINAL (Aiven + Vercel ENV)
 */

define('DB_CHARSET', 'utf8mb4');

/**
 * Koneksi MySQL (Primary)
 */
function getLocalDB(): ?PDO
{
    static $pdo = null;
    if ($pdo !== null)
        return ($pdo instanceof PDO) ? $pdo : null;

    try {
        // 🔥 Ambil dari ENV Vercel
        $host = getenv('MYSQL_HOST');
        $port = getenv('MYSQL_PORT') ?: '3306';
        $db   = getenv('MYSQL_DATABASE');
        $user = getenv('MYSQL_USER');
        $pass = getenv('MYSQL_PASSWORD');

        // Validasi
        if (!$host || !$db || !$user || !$pass) {
            throw new Exception("ENV MySQL belum lengkap!");
        }

        // 🔥 DSN + SSL REQUIRED (WAJIB untuk Aiven)
        $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=" . DB_CHARSET . ";sslmode=required";

        // Options
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ];

        // SSL fix PHP 8.5
        if (defined('\Pdo\Mysql::ATTR_SSL_VERIFY_SERVER_CERT')) {
            $options[\Pdo\Mysql::ATTR_SSL_VERIFY_SERVER_CERT] = false;
        }

        // CONNECT
        $pdo = new PDO($dsn, $user, $pass, $options);

    } catch (Throwable $e) {
        $msg = "[IoTzy] DB ERROR: " . $e->getMessage();
        error_log($msg);

        // DEBUG
        echo "<h3>❌ GAGAL KONEK DATABASE</h3>";
        echo "Error: " . htmlspecialchars($e->getMessage()) . "<br>";
        echo "HOST: " . htmlspecialchars($host ?? 'NULL') . "<br>";
        echo "DB: " . htmlspecialchars($db ?? 'NULL') . "<br>";
        echo "USER: " . htmlspecialchars($user ?? 'NULL') . "<br>";
        echo "PASS LENGTH: " . (isset($pass) ? strlen($pass) : 0) . "<br>";

        $pdo = false;
    }

    return ($pdo instanceof PDO) ? $pdo : null;
}

/**
 * PostgreSQL (Optional, tidak dipakai juga gapapa)
 */
function getPostgresDB(): ?PDO
{
    static $pdo = null;
    if ($pdo !== null)
        return ($pdo instanceof PDO) ? $pdo : null;

    return null; // disable aja biar clean
}

/**
 * Query Write
 */
function dbWrite(string $sql, array $params = []): bool
{
    $db = getLocalDB();
    if (!$db)
        return false;

    try {
        return $db->prepare($sql)->execute($params);
    } catch (PDOException $e) {
        error_log('[IoTzy] dbWrite error: ' . $e->getMessage());
        return false;
    }
}

/**
 * Insert + return ID
 */
function dbInsert(string $sql, array $params = []): ?int
{
    $db = getLocalDB();
    if (!$db)
        return null;

    try {
        $db->prepare($sql)->execute($params);
        return (int)$db->lastInsertId();
    } catch (PDOException $e) {
        error_log('[IoTzy] dbInsert error: ' . $e->getMessage());
        return null;
    }
}

/**
 * Status DB
 */
function dbStatus(): array
{
    return [
        'mysql' => getLocalDB() !== null,
    ];
}
