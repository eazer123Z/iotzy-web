<?php
/**
 * config/database.php
 * ───
 * Mengatur koneksi basis data (MySQL/PDO) untuk seluruh aplikasi IoTzy.
 * Menduking PHP 8.5 (Vercel Core) & Aiven Cloud MySQL secara aman.
 */

define('DB_CHARSET', 'utf8mb4');

function getLocalDB(): ?PDO {
    static $pdo = null;
    if ($pdo !== null) return ($pdo instanceof PDO) ? $pdo : null;

    try {
        $h = getenv('MYSQL_HOST');
        $port = getenv('MYSQL_PORT') ?: '3306';
        $d = getenv('MYSQL_DATABASE');
        $u = getenv('MYSQL_USER');
        $p = getenv('MYSQL_PASSWORD') ?: getenv('MYSQL_PASS') ?: '';

        if (!$h || !$d || !$u) {
            throw new Exception("Konfigurasi database (ENV) tidak lengkap!");
        }

        $dsn = "mysql:host=$h;port=$port;dbname=$d;charset=" . DB_CHARSET;
        
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        // 🛡️ PROTEKSI SSL
        if (defined('\Pdo\Mysql::ATTR_SSL_CA')) {
            $options[\Pdo\Mysql::ATTR_SSL_CA] = '';
            $options[\Pdo\Mysql::ATTR_SSL_VERIFY_SERVER_CERT] = false;
        } else {
            $options[1007] = '';    
            $options[1014] = false; 
        }

        $pdo = new PDO($dsn, $u, $p, $options);
        $pdo->exec("SET NAMES " . DB_CHARSET);

    } catch (Throwable $e) {
        $GLOBALS['DB_LAST_ERROR'] = $e->getMessage();
        error_log("[IoTzy DB Error] " . $e->getMessage());
        $pdo = false;
    }

    return ($pdo instanceof PDO) ? $pdo : null;
}

function dbWrite(string $sql, array $params = []): bool {
    $db = getLocalDB();
    return $db ? $db->prepare($sql)->execute($params) : false;
}

function dbInsert(string $sql, array $params = []): ?int {
    $db = getLocalDB();
    if (!$db) return null;
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    return (int)$db->lastInsertId();
}

function dbStatus(): array {
    return [ 'mysql' => getLocalDB() !== null ];
}
