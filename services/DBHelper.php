<?php
// Database helper functions (procedural wrappers)

require_once __DIR__ . '/../config/database.php';

/**
 * Insert row and return new ID.
 */
function dbInsert(string $sql, array $params = []): int {
    $db = getLocalDB();
    if (!$db) throw new RuntimeException('DB not connected');
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    return (int)$db->lastInsertId();
}

/**
 * Execute UPDATE/DELETE/etc. Returns affected rows.
 */
function dbWrite(string $sql, array $params = []): int {
    $db = getLocalDB();
    if (!$db) throw new RuntimeException('DB not connected');
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    return $stmt->rowCount();
}

/**
 * Get basic DB status (used by api/data.php db_status action).
 */
function dbStatus(): array {
    $db = getLocalDB();
    if (!$db) return ['connected' => false, 'error' => 'DB not connected'];
    try {
        $stmt = $db->query('SELECT COUNT(*) FROM users');
        $userCount = (int)$stmt->fetchColumn();
        return [
            'connected'    => true,
            'users'        => $userCount,
            'db_name'      => DB_NAME,
            'db_host'      => DB_HOST,
            'charset'      => DB_CHARSET,
        ];
    } catch (Throwable $e) {
        return ['connected' => false, 'error' => $e->getMessage()];
    }
}

/**
 * Simple encryption for sensitive fields (MQTT password).
 * Uses openssl with APP_SECRET as key.
 */
function encryptSecret(string $plain): string {
    if (empty(trim($plain))) return '';
    $key = hash('sha256', (defined('APP_SECRET') ? APP_SECRET : 'fallback-secret'), true);
    $iv  = random_bytes(16);
    $encrypted = openssl_encrypt($plain, 'AES-256-CBC', $key, 0, $iv);
    if ($encrypted === false) return '';
    return base64_encode($iv . $encrypted);
}

/**
 * Decrypt secret.
 */
function decryptSecret(string $encrypted): string {
    if (empty(trim($encrypted))) return '';
    $data = base64_decode($encrypted, true);
    if ($data === false) return '';
    $iv = substr($data, 0, 16);
    $cipher = substr($data, 16);
    $key = hash('sha256', (defined('APP_SECRET') ? APP_SECRET : 'fallback-secret'), true);
    $decrypted = openssl_decrypt($cipher, 'AES-256-CBC', $key, 0, $iv);
    return $decrypted === false ? '' : $decrypted;
}
