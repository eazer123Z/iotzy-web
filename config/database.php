<?php
/**
 * config/database.php — FINAL (Aiven SSL + Vercel Ready)
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
        // ENV dari Vercel
        $host = getenv('MYSQL_HOST');
        $port = getenv('MYSQL_PORT') ?: '3306';
        $db = getenv('MYSQL_DATABASE');
        $user = getenv('MYSQL_USER');
        $pass = getenv('MYSQL_PASSWORD');

        // Validasi ENV
        if (!$host || !$db || !$user || !$pass) {
            throw new Exception("ENV MySQL belum lengkap!");
        }

        // 🔥 DSN dengan SSL (Aiven wajib)
        $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=" . DB_CHARSET;

        // OPTIONS (PHP 8.5 SAFE)
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ];

        // 🔥 SSL CERT (WAJIB UNTUK AIVEN)
        if (defined('\Pdo\Mysql::ATTR_SSL_CA')) {
            $options[\Pdo\Mysql::ATTR_SSL_CA] = __DIR__ . '/ca.pem';
        }

        if (defined('\Pdo\Mysql::ATTR_SSL_VERIFY_SERVER_CERT')) {
            $options[\Pdo\Mysql::ATTR_SSL_VERIFY_SERVER_CERT] = true;
        }

        // CONNECT
        $pdo = new PDO($dsn, $user, $pass, $options);

    }
    catch (Throwable $e) {
        $msg = "[IoTzy] DB ERROR: " . $e->getMessage();
        error_log($msg);

        // DEBUG OUTPUT
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
 * PostgreSQL (Optional Backup)
 */
function getPostgresDB(): ?PDO
{
    static $pdo = null;
    if ($pdo !== null)
        return ($pdo instanceof PDO) ? $pdo : null;

    try {
        $host = getenv('POSTGRES_HOST');
        $db = getenv('POSTGRES_DB');
        $user = getenv('POSTGRES_USER');
        $pass = getenv('POSTGRES_PASSWORD');

        if (!$host || !$db || !$user)
            return null;

        $dsn = "pgsql:host=$host;dbname=$db";

        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

    }
    catch (Throwable $e) {
        error_log('[IoTzy] Postgres error: ' . $e->getMessage());
        $pdo = false;
    }

    return ($pdo instanceof PDO) ? $pdo : null;
}

/**
 * Query Write (INSERT / UPDATE / DELETE)
 */
function dbWrite(string $sql, array $params = []): bool
{
    $db = getLocalDB();
    if (!$db)
        return false;

    try {
        return $db->prepare($sql)->execute($params);
    }
    catch (PDOException $e) {
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
    }
    catch (PDOException $e) {
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
        'postgres' => getPostgresDB() !== null,
    ];
}
