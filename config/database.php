<?php
/**
 * config/database.php — FINAL (MYSQL_URL Aiven + Vercel Ready)
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
        // 🔥 GANTI: pakai MYSQL_URL (bukan env satu-satu)
        $uri = getenv('MYSQL_URL');

        if (!$uri) {
            throw new Exception("MYSQL_URL belum diset!");
        }

        // Parse URL dari Aiven
        $parts = parse_url($uri);

        $host = $parts['host'] ?? null;
        $port = $parts['port'] ?? 3306;
        $user = $parts['user'] ?? null;
        $pass = $parts['pass'] ?? null;
        $db   = isset($parts['path']) ? ltrim($parts['path'], '/') : null;

        // Validasi
        if (!$host || !$user || !$pass || !$db) {
            throw new Exception("MYSQL_URL tidak valid!");
        }

        // 🔥 DSN + SSL REQUIRED (Aiven)
        $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=" . DB_CHARSET . ";sslmode=required";

        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ];

        // SSL fix (PHP 8.5 safe)
        if (defined('\Pdo\Mysql::ATTR_SSL_VERIFY_SERVER_CERT')) {
            $options[\Pdo\Mysql::ATTR_SSL_VERIFY_SERVER_CERT] = false;
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
