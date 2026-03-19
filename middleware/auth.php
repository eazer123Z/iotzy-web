<?php
/**
 * middleware/auth.php — Session, Authentication & CSRF (FINAL FIX APP)
 */

require_once __DIR__ . '/../core/bootstrap.php';


// ==================== SESSION ====================

function startSecureSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE)
        return;

    // 🔥 DETEKSI UNTUK WINDOWS: Jangan set session_save_path manual di Windows/Laragon
    if (!isset($_SERVER['VERCEL']) && DIRECTORY_SEPARATOR === '/') {
        if (!is_dir('/tmp')) @mkdir('/tmp', 0777, true);
        @session_save_path('/tmp');
    }

    $lifetime = defined('SESSION_LIFETIME') ? SESSION_LIFETIME : 86400;

    session_set_cookie_params([
        'lifetime' => defined('SESSION_LIFETIME') ? SESSION_LIFETIME : 86400,
        'path'     => '/',
        'domain'   => null,
        'secure'   => false, // 🔑 Force false di local jika HTTP
        'httponly' => true,
        'samesite' => 'Lax'
    ]);

    session_start();
}

// ==================== LOGIN CHECK ====================

function isLoggedIn(): bool
{
    static $result = null;
    if ($result !== null)
        return $result;

    startSecureSession();

    if (empty($_SESSION['user_id']) || empty($_SESSION['session_token'])) {
        // Diagnostic log (internal only)
        error_log("[IoTzy Auth] isLoggedIn FAILED: Session data missing. " . 
                  "ID:".($_SESSION['user_id']??'None').", Token:".(isset($_SESSION['session_token'])?'Exists':'None'));
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

// ==================== ROLE CHECK ====================

function isAdmin(): bool
{
    startSecureSession();
    return ($_SESSION['user_role'] ?? '') === 'admin';
}

// ==================== REQUIRE LOGIN ====================

function requireLogin(): void
{
    if (!isLoggedIn()) {
        $base = rtrim(APP_URL, '/') . '/';
        $redirect = $_SERVER['REQUEST_URI'] ?? $base;

        // Normalisasi jalur untuk menghindari pengalihan berulang (loop)
        if (stripos($redirect, APP_URL) === false && stripos($redirect, '/lotzy') !== false) {
            $redirect = str_ireplace('/lotzy', APP_URL, $redirect);
        }

        header('Location: ' . $base . '?route=login&redirect=' . urlencode($redirect));
        exit;
    }
}


// ==================== CSRF ====================

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


// ==================== LOGIN ====================

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

        // bersihin session lama
        $db->prepare(
            "DELETE FROM sessions WHERE user_id = ? AND expires_at < NOW()"
        )->execute([$userId]);

        // simpan session baru
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

        // update last login
        $db->prepare(
            "UPDATE users SET last_login = NOW() WHERE id = ?"
        )->execute([$userId]);

        // 🔥 SET SESSION (INI KUNCI)
        $_SESSION['user_id'] = $userId;
        $_SESSION['session_token'] = $token;
        $_SESSION['user_role'] = $user['role'] ?? 'user';

        // default settings
        $db->prepare(
            "INSERT IGNORE INTO user_settings (user_id) VALUES (?)"
        )->execute([$userId]);

        return true;

    }
    catch (PDOException $e) {
        $msg = '[IoTzy] loginUser error: ' . $e->getMessage();
        error_log($msg);
        return 'Terjadi kesalahan server: ' . $e->getMessage();
    }
}


// ==================== LOGOUT ====================

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

    session_destroy();
}


// ==================== REGISTER ====================

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