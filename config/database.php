<?php
/**
 * config/database.php — PHP 8.5 SAFE (FINAL)
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

        if (!$h || !$d || !$u) throw new Exception("ENV MySQL belum lengkap!");

        $dsn = "mysql:host=$h;port=$port;dbname=$d;charset=" . DB_CHARSET;
        
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ];

        // 🔥 Trik khusus PHP 8.5 agar tidak muncul teks Warning di layar
        if (defined('\Pdo\Mysql::ATTR_SSL_CA')) {
            $options[\Pdo\Mysql::ATTR_SSL_CA] = '';
            $options[\Pdo\Mysql::ATTR_SSL_VERIFY_SERVER_CERT] = false;
        } else {
            // Pakai angka ID konstantanya langsung (agar PHP diam/tidak protes)
            $options[1007] = '';    // MYSQL_ATTR_SSL_CA
            $options[1014] = false; // MYSQL_ATTR_SSL_VERIFY_SERVER_CERT
        }

        $pdo = new PDO($dsn, $u, $p, $options);
        $pdo->exec("SET NAMES " . DB_CHARSET);

    } catch (Throwable $e) {
        $GLOBALS['DB_LAST_ERROR'] = $e->getMessage();
        error_log("[IoTzy DB] " . $e->getMessage());
        $pdo = false;
    }

    return ($pdo instanceof PDO) ? $pdo : null;
}

function dbWrite($sql, $params = []) {
    $db = getLocalDB();
    return $db ? $db->prepare($sql)->execute($params) : false;
}

function dbInsert($sql, $params = []) {
    $db = getLocalDB();
    if (!$db) return null;
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    return (int)$db->lastInsertId();
}

function dbStatus(): array {
    return [ 'mysql' => getLocalDB() !== null ];
}
