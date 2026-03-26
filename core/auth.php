<?php

require_once __DIR__ . '/bootstrap.php';

function startSecureSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE)
        return;

    $lifetime = defined('SESSION_LIFETIME') ? SESSION_LIFETIME : 86400;

    $isVercel = getenv('VERCEL') === "1" || isset($_SERVER['VERCEL']) || isset($_ENV['VERCEL']);
    $isSecure = $isVercel || (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || $_SERVER['SERVER_PORT'] == 443;

    session_set_cookie_params([
        'lifetime' => $lifetime,
        'path'     => '/',
        'domain'   => null,
        'secure'   => $isSecure,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);

    session_start();
}

function isLoggedIn(): bool
{
    static $result = null;
    if ($result !== null)
        return $result;

    startSecureSession();

    if (empty($_SESSION['user_id']) || empty($_SESSION['session_token'])) {
        if (!empty($_COOKIE['iotzy_remember'])) {
            $db = getLocalDB();
            if ($db) {
                try {
                    $stmt = $db->prepare(
                        "SELECT user_id, session_token FROM sessions 
                         WHERE session_token = ? AND expires_at > NOW() 
                         LIMIT 1"
                    );
                    $stmt->execute([$_COOKIE['iotzy_remember']]);
                    $sess = $stmt->fetch();
                    if ($sess) {
                        $_SESSION['user_id'] = (int)$sess['user_id'];
                        $_SESSION['session_token'] = $sess['session_token'];
                        return $result = true;
                    }
                } catch (\Exception $e) {}
            }
        }
        return $result = false;
    }

    $db = getLocalDB();
    if (!$db) return $result = false;

    try {
        $stmt = $db->prepare(
            "SELECT id FROM sessions
             WHERE user_id = ? AND session_token = ? AND expires_at > NOW()
             LIMIT 1"
        );
        $stmt->execute([
            $_SESSION['user_id'],
            $_SESSION['session_token']
        ]);

        $exists = (bool)$stmt->fetch();
        if (!$exists) {
            error_log("[IoTzy Auth] isLoggedIn FAILED: Token mismatch or expired in DB. " .
                      "User:".$_SESSION['user_id'].", Token:".substr($_SESSION['session_token'],0,10)."...");
        }
        return $result = $exists;

    }
    catch (PDOException $e) {
        error_log('[IoTzy Auth] isLoggedIn error: ' . $e->getMessage());
        return $result = false;
    }
}

function requireLogin(): void
{
    if (!isLoggedIn()) {
        $base = rtrim(APP_URL, '/') . '/';
        $redirect = $_SERVER['REQUEST_URI'] ?? $base;

        if (stripos($redirect, APP_URL) === false && stripos($redirect, '/iotzy') !== false) {
            $redirect = str_ireplace('/iotzy', APP_URL, $redirect);
        }

        header('Location: ' . $base . '?route=login&redirect=' . urlencode($redirect));
        exit;
    }
}


function generateCsrfToken(): string
{
    startSecureSession();

    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['csrf_token'];
}

function validateCsrfToken(?string $token): bool
{
    startSecureSession();

    if (empty($_SESSION['csrf_token']) || empty($token)) {
        return false;
    }

    return hash_equals($_SESSION['csrf_token'], $token);
}

function requireCsrf(): void
{
    $token = $_POST['csrf_token']
        ?? $_SERVER['HTTP_X_CSRF_TOKEN']
        ?? null;

    if (!validateCsrfToken($token)) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid CSRF token']);
        exit;
    }
}


function loginUser(string $login, string $password): mixed
{
    $db = getLocalDB();
    if (!$db)
        return 'Database tidak tersedia.';

    $login = trim($login);
    if (!$login || !$password)
        return 'Username dan password harus diisi.';

    try {
        $stmt = $db->prepare(
            "SELECT id, password_hash, is_active, role
             FROM users
             WHERE (username = ? OR email = ?)
             LIMIT 1"
        );
        $stmt->execute([$login, $login]);
        $user = $stmt->fetch();

        if (!$user)
            return 'Username atau password salah.';
        if (!(bool)$user['is_active'])
            return 'Akun ini dinonaktifkan.';
        if (!password_verify($password, $user['password_hash'])) {
            return 'Username atau password salah.';
        }

        startSecureSession();
        session_regenerate_id(true);

        $userId = (int)$user['id'];
        $token = bin2hex(random_bytes(32));
        $lifetime = defined('SESSION_LIFETIME') ? SESSION_LIFETIME : 86400;
        $expiresAt = date('Y-m-d H:i:s', time() + $lifetime);

        $db->prepare(
            "DELETE FROM sessions WHERE user_id = ? AND expires_at < NOW()"
        )->execute([$userId]);

        $db->prepare(
            "INSERT INTO sessions (user_id, session_token, ip_address, user_agent, expires_at)
             VALUES (?, ?, ?, ?, ?)"
        )->execute([
            $userId,
            $token,
            $_SERVER['REMOTE_ADDR'] ?? null,
            substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500),
            $expiresAt,
        ]);

        $db->prepare(
            "UPDATE users SET last_login = NOW() WHERE id = ?"
        )->execute([$userId]);

        $_SESSION['user_id'] = $userId;
        $_SESSION['session_token'] = $token;
        
        setcookie('iotzy_remember', $token, [
            'expires' => time() + (30 * 86400),
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Lax'
        ]);

        $mqttBroker = getenv('MQTT_HOST') ?: 'broker.hivemq.com';
        $mqttPort   = (int)(getenv('MQTT_PORT') ?: 8884);
        $mqttSsl    = (getenv('MQTT_USE_SSL') === 'true' || getenv('MQTT_USE_SSL') === '1') ? 1 : 0;
        $db->prepare(
            "INSERT IGNORE INTO user_settings (user_id, mqtt_broker, mqtt_port, mqtt_use_ssl) VALUES (?, ?, ?, ?)"
        )->execute([$userId, $mqttBroker, $mqttPort, $mqttSsl]);

        return true;

    }
    catch (PDOException $e) {
        $msg = '[IoTzy] loginUser error: ' . $e->getMessage();
        error_log($msg);
        return 'Terjadi kesalahan server: ' . $e->getMessage();
    }
}


function logoutUser(): void
{
    startSecureSession();

    if (!empty($_SESSION['user_id']) && !empty($_SESSION['session_token'])) {
        $db = getLocalDB();
        if ($db) {
            try {
                $db->prepare(
                    "DELETE FROM sessions WHERE user_id = ? AND session_token = ?"
                )->execute([
                    $_SESSION['user_id'],
                    $_SESSION['session_token']
                ]);
            }
            catch (PDOException $e) {
                error_log('[IoTzy] logoutUser DB error: ' . $e->getMessage());
            }
        }
    }

    $_SESSION = [];

    if (session_status() === PHP_SESSION_ACTIVE && (bool)ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();

        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'] ?? '',
            $params['secure'],
            $params['httponly']
        );
    }

    setcookie('iotzy_remember', '', time() - 3600, '/');
    session_destroy();
}


function registerUser(
    string $username,
    string $email,
    string $password,
    string $fullName = ''    ): mixed
{
    $db = getLocalDB();
    if (!$db)
        return 'Database tidak tersedia.';

    $username = trim($username);
    $email = trim($email);
    $fullName = trim($fullName);

    if (strlen($username) < 3 || strlen($username) > 50) {
        return 'Username harus antara 3–50 karakter.';
    }

    if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
        return 'Username hanya boleh huruf, angka, dan underscore.';
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return 'Format email tidak valid.';
    }

    if (strlen($password) < 8) {
        return 'Password minimal 8 karakter.';
    }

    try {
        $stmt = $db->prepare("SELECT id FROM users WHERE username = ? LIMIT 1");
        $stmt->execute([$username]);
        if ($stmt->fetch())
            return 'Username sudah digunakan.';

        $stmt = $db->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        if ($stmt->fetch())
            return 'Email sudah terdaftar.';

        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

        $db->prepare(
            "INSERT INTO users (username, email, password_hash, full_name)
             VALUES (?, ?, ?, ?)"
        )->execute([
            $username,
            $email,
            $hash,
            $fullName ?: $username,
        ]);

        return true;

    }
    catch (PDOException $e) {
        error_log('[IoTzy] registerUser error: ' . $e->getMessage());
        return 'Terjadi kesalahan server.';
    }
}
