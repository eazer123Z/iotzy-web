<?php

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/UserDataService.php';

function iotzyMobileTableExists(PDO $db, string $table): bool
{
    static $cache = [];
    $key = spl_object_id($db) . ':' . $table;
    if (array_key_exists($key, $cache)) {
        return $cache[$key];
    }

    try {
        $stmt = $db->prepare(
            "SELECT 1
             FROM information_schema.tables
             WHERE table_schema = DATABASE() AND table_name = ?
             LIMIT 1"
        );
        $stmt->execute([$table]);
        return $cache[$key] = (bool)$stmt->fetchColumn();
    } catch (Throwable $e) {
        return $cache[$key] = false;
    }
}

function iotzyMobileTokenHash(string $token): string
{
    return hash('sha256', $token);
}

function iotzyMobileGetBearerToken(): ?string
{
    $rawHeader = trim((string)(
        $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['Authorization']
        ?? ''
    ));

    if ($rawHeader === '' && function_exists('getallheaders')) {
        $headers = getallheaders();
        foreach ($headers as $name => $value) {
            if (strcasecmp((string)$name, 'Authorization') === 0) {
                $rawHeader = trim((string)$value);
                break;
            }
        }
    }

    if ($rawHeader === '') {
        return null;
    }

    if (preg_match('/^\s*Bearer\s+(.+)$/i', $rawHeader, $matches)) {
        $token = trim((string)$matches[1]);
        return $token !== '' ? $token : null;
    }

    return null;
}

function iotzyMobileNormalizePlatform(mixed $platform): string
{
    $normalized = strtolower(trim((string)$platform));
    return in_array($normalized, ['android', 'ios', 'web'], true) ? $normalized : 'unknown';
}

function iotzyMobileBuildDeviceContext(array $body): array
{
    $deviceUid = trim((string)($body['device_uid'] ?? $body['deviceId'] ?? ''));
    $deviceUid = preg_replace('/[^a-zA-Z0-9._:-]/', '-', $deviceUid);
    $deviceUid = trim((string)$deviceUid, '-');
    if ($deviceUid === '') {
        $seed = (string)(
            ($body['device_name'] ?? '')
            . '|'
            . ($_SERVER['HTTP_USER_AGENT'] ?? '')
            . '|'
            . ($_SERVER['REMOTE_ADDR'] ?? '')
        );
        $deviceUid = 'mobile-' . substr(hash('sha256', $seed), 0, 20);
    }

    $deviceName = trim((string)($body['device_name'] ?? $body['deviceName'] ?? ''));
    if ($deviceName === '') {
        $deviceName = 'Mobile Device';
    }

    $appVersion = trim((string)($body['app_version'] ?? $body['appVersion'] ?? ''));

    return [
        'device_uid' => substr($deviceUid, 0, 120),
        'device_name' => substr($deviceName, 0, 100),
        'platform' => iotzyMobileNormalizePlatform($body['platform'] ?? 'android'),
        'app_version' => substr($appVersion, 0, 40),
        'ip_address' => substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45),
        'user_agent' => substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255),
    ];
}

function iotzyMobileEnsureDeviceRow(PDO $db, int $userId, array $context): ?int
{
    if (!iotzyMobileTableExists($db, 'mobile_devices')) {
        return null;
    }

    $stmt = $db->prepare(
        "INSERT INTO mobile_devices (
            user_id, device_uid, platform, device_name, app_version,
            last_login_at, last_seen, is_active
         ) VALUES (?, ?, ?, ?, ?, NOW(), NOW(), 1)
         ON DUPLICATE KEY UPDATE
            platform = VALUES(platform),
            device_name = VALUES(device_name),
            app_version = VALUES(app_version),
            last_login_at = NOW(),
            last_seen = NOW(),
            is_active = 1,
            id = LAST_INSERT_ID(id)"
    );
    $stmt->execute([
        $userId,
        $context['device_uid'],
        $context['platform'],
        $context['device_name'],
        $context['app_version'] !== '' ? $context['app_version'] : null,
    ]);

    return (int)$db->lastInsertId();
}

function iotzyMobileIssueTokenPair(PDO $db, int $userId, array $context = [], ?int $forcedDeviceId = null): array
{
    $usesTokenTables = iotzyMobileTableExists($db, 'auth_access_tokens')
        && iotzyMobileTableExists($db, 'auth_refresh_tokens');

    if (!$usesTokenTables) {
        $legacyToken = bin2hex(random_bytes(32));
        $legacyTtl = 30 * 24 * 60 * 60;
        $expiresAt = date('Y-m-d H:i:s', time() + $legacyTtl);

        $db->prepare("DELETE FROM sessions WHERE user_id = ? AND expires_at < NOW()")->execute([$userId]);
        $db->prepare(
            "INSERT INTO sessions (user_id, session_token, ip_address, user_agent, expires_at)
             VALUES (?, ?, ?, ?, ?)"
        )->execute([
            $userId,
            $legacyToken,
            $context['ip_address'] ?? null,
            $context['user_agent'] ?? null,
            $expiresAt,
        ]);

        return [
            'mode' => 'legacy_session',
            'access_token' => $legacyToken,
            'refresh_token' => null,
            'token_type' => 'Bearer',
            'expires_in' => $legacyTtl,
            'refresh_expires_in' => null,
        ];
    }

    $deviceId = $forcedDeviceId;
    if ($deviceId === null) {
        $deviceId = iotzyMobileEnsureDeviceRow($db, $userId, $context);
    }

    $accessToken = bin2hex(random_bytes(48));
    $refreshToken = bin2hex(random_bytes(48));
    $accessTtl = 60 * 60;
    $refreshTtl = 30 * 24 * 60 * 60;
    $accessExpiresAt = date('Y-m-d H:i:s', time() + $accessTtl);
    $refreshExpiresAt = date('Y-m-d H:i:s', time() + $refreshTtl);

    $db->prepare(
        "INSERT INTO auth_access_tokens (
            user_id, mobile_device_id, token_hash, token_prefix, scopes,
            issued_at, expires_at, ip_address, user_agent
         ) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?)"
    )->execute([
        $userId,
        $deviceId,
        iotzyMobileTokenHash($accessToken),
        substr($accessToken, 0, 12),
        json_encode(['iotzy:mobile'], JSON_UNESCAPED_UNICODE),
        $accessExpiresAt,
        $context['ip_address'] ?? null,
        $context['user_agent'] ?? null,
    ]);

    $db->prepare(
        "INSERT INTO auth_refresh_tokens (
            user_id, mobile_device_id, token_hash, token_prefix,
            issued_at, expires_at, ip_address, user_agent
         ) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?)"
    )->execute([
        $userId,
        $deviceId,
        iotzyMobileTokenHash($refreshToken),
        substr($refreshToken, 0, 12),
        $refreshExpiresAt,
        $context['ip_address'] ?? null,
        $context['user_agent'] ?? null,
    ]);

    return [
        'mode' => 'native_token',
        'access_token' => $accessToken,
        'refresh_token' => $refreshToken,
        'token_type' => 'Bearer',
        'expires_in' => $accessTtl,
        'refresh_expires_in' => $refreshTtl,
    ];
}

function iotzyMobileLookupAccessToken(PDO $db, string $rawToken): ?array
{
    if ($rawToken === '') {
        return null;
    }

    $usesTokenTables = iotzyMobileTableExists($db, 'auth_access_tokens');
    if ($usesTokenTables) {
        $stmt = $db->prepare(
            "SELECT id, user_id, mobile_device_id, expires_at, revoked_at
             FROM auth_access_tokens
             WHERE token_hash = ?
             LIMIT 1"
        );
        $stmt->execute([iotzyMobileTokenHash($rawToken)]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        if (!empty($row['revoked_at']) || strtotime((string)$row['expires_at']) <= time()) {
            return null;
        }

        $db->prepare("UPDATE auth_access_tokens SET last_used_at = NOW() WHERE id = ?")->execute([(int)$row['id']]);

        return [
            'mode' => 'native_token',
            'token' => $rawToken,
            'access_token_id' => (int)$row['id'],
            'user_id' => (int)$row['user_id'],
            'mobile_device_id' => $row['mobile_device_id'] !== null ? (int)$row['mobile_device_id'] : null,
        ];
    }

    $stmt = $db->prepare(
        "SELECT id, user_id, expires_at
         FROM sessions
         WHERE session_token = ?
         LIMIT 1"
    );
    $stmt->execute([$rawToken]);
    $legacyRow = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$legacyRow) {
        return null;
    }
    if (strtotime((string)$legacyRow['expires_at']) <= time()) {
        return null;
    }

    return [
        'mode' => 'legacy_session',
        'token' => $rawToken,
        'session_id' => (int)$legacyRow['id'],
        'user_id' => (int)$legacyRow['user_id'],
        'mobile_device_id' => null,
    ];
}

function iotzyMobileLookupRefreshToken(PDO $db, string $refreshToken): ?array
{
    if (!iotzyMobileTableExists($db, 'auth_refresh_tokens') || $refreshToken === '') {
        return null;
    }

    $stmt = $db->prepare(
        "SELECT id, user_id, mobile_device_id, expires_at, revoked_at
         FROM auth_refresh_tokens
         WHERE token_hash = ?
         LIMIT 1"
    );
    $stmt->execute([iotzyMobileTokenHash($refreshToken)]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        return null;
    }
    if (!empty($row['revoked_at']) || strtotime((string)$row['expires_at']) <= time()) {
        return null;
    }

    return [
        'id' => (int)$row['id'],
        'user_id' => (int)$row['user_id'],
        'mobile_device_id' => $row['mobile_device_id'] !== null ? (int)$row['mobile_device_id'] : null,
    ];
}

function iotzyMobileFetchUserProfile(PDO $db, int $userId): ?array
{
    $stmt = $db->prepare(
        "SELECT u.id, u.username, u.email, u.full_name, u.role, u.is_active,
                COALESCE(s.theme, 'light') AS theme
         FROM users u
         LEFT JOIN user_settings s ON s.user_id = u.id
         WHERE u.id = ? AND u.is_active = 1
         LIMIT 1"
    );
    $stmt->execute([$userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        return null;
    }

    return [
        'id' => (int)$row['id'],
        'username' => (string)$row['username'],
        'email' => (string)$row['email'],
        'full_name' => (string)($row['full_name'] ?? ''),
        'role' => (string)$row['role'],
        'theme' => (string)($row['theme'] ?? 'light'),
    ];
}

function iotzyMobileRequireAuthContext(PDO $db): array
{
    $token = iotzyMobileGetBearerToken();
    if (!$token) {
        jsonOut([
            'success' => false,
            'error' => 'Authorization bearer token tidak ditemukan',
        ], 401);
    }

    $auth = iotzyMobileLookupAccessToken($db, $token);
    if (!$auth) {
        jsonOut([
            'success' => false,
            'error' => 'Token tidak valid atau sudah kedaluwarsa',
        ], 401);
    }

    return $auth;
}

function iotzyMobileHandleLogin(PDO $db, array $body): array
{
    $login = trim((string)($body['username'] ?? $body['login'] ?? $body['email'] ?? ''));
    $password = (string)($body['password'] ?? '');
    if ($login === '' || $password === '') {
        return [
            'success' => false,
            'status' => 422,
            'error' => 'Username/email dan password wajib diisi',
        ];
    }

    $stmt = $db->prepare(
        "SELECT id, password_hash, is_active
         FROM users
         WHERE (username = ? OR email = ?)
         LIMIT 1"
    );
    $stmt->execute([$login, $login]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($password, (string)$user['password_hash'])) {
        return [
            'success' => false,
            'status' => 401,
            'error' => 'Username/email atau password salah',
        ];
    }
    if (!(bool)$user['is_active']) {
        return [
            'success' => false,
            'status' => 403,
            'error' => 'Akun dinonaktifkan',
        ];
    }

    $userId = (int)$user['id'];
    $context = iotzyMobileBuildDeviceContext($body);
    $tokenBundle = iotzyMobileIssueTokenPair($db, $userId, $context);

    $db->prepare("UPDATE users SET last_login = NOW() WHERE id = ?")->execute([$userId]);
    iotzyEnsureUserSettingsRow($userId, $db);
    $profile = iotzyMobileFetchUserProfile($db, $userId);

    return [
        'success' => true,
        'status' => 200,
        'mode' => $tokenBundle['mode'],
        'token_type' => $tokenBundle['token_type'],
        'access_token' => $tokenBundle['access_token'],
        'expires_in' => $tokenBundle['expires_in'],
        'refresh_token' => $tokenBundle['refresh_token'],
        'refresh_expires_in' => $tokenBundle['refresh_expires_in'],
        'user' => $profile,
    ];
}

function iotzyMobileHandleRefresh(PDO $db, array $body): array
{
    if (!iotzyMobileTableExists($db, 'auth_refresh_tokens')) {
        return [
            'success' => false,
            'status' => 400,
            'error' => 'Refresh token belum tersedia di skema database',
        ];
    }

    $refreshToken = trim((string)($body['refresh_token'] ?? ''));
    if ($refreshToken === '') {
        return [
            'success' => false,
            'status' => 422,
            'error' => 'refresh_token wajib diisi',
        ];
    }

    $refresh = iotzyMobileLookupRefreshToken($db, $refreshToken);
    if (!$refresh) {
        return [
            'success' => false,
            'status' => 401,
            'error' => 'Refresh token tidak valid atau kedaluwarsa',
        ];
    }

    $context = iotzyMobileBuildDeviceContext($body);
    $tokenBundle = iotzyMobileIssueTokenPair($db, (int)$refresh['user_id'], $context, $refresh['mobile_device_id']);

    $db->prepare(
        "UPDATE auth_refresh_tokens
         SET revoked_at = NOW(), last_used_at = NOW()
         WHERE id = ?"
    )->execute([(int)$refresh['id']]);

    return [
        'success' => true,
        'status' => 200,
        'mode' => $tokenBundle['mode'],
        'token_type' => $tokenBundle['token_type'],
        'access_token' => $tokenBundle['access_token'],
        'expires_in' => $tokenBundle['expires_in'],
        'refresh_token' => $tokenBundle['refresh_token'],
        'refresh_expires_in' => $tokenBundle['refresh_expires_in'],
    ];
}

function iotzyMobileHandleLogout(PDO $db, array $auth, array $body): array
{
    if (($auth['mode'] ?? '') === 'native_token' && !empty($auth['access_token_id'])) {
        $db->prepare(
            "UPDATE auth_access_tokens
             SET revoked_at = NOW()
             WHERE id = ?"
        )->execute([(int)$auth['access_token_id']]);

        $refreshToken = trim((string)($body['refresh_token'] ?? ''));
        if ($refreshToken !== '' && iotzyMobileTableExists($db, 'auth_refresh_tokens')) {
            $db->prepare(
                "UPDATE auth_refresh_tokens
                 SET revoked_at = NOW(), last_used_at = NOW()
                 WHERE token_hash = ?"
            )->execute([iotzyMobileTokenHash($refreshToken)]);
        }

        return [
            'success' => true,
            'status' => 200,
            'message' => 'Logout berhasil',
        ];
    }

    if (($auth['mode'] ?? '') === 'legacy_session') {
        $db->prepare("DELETE FROM sessions WHERE session_token = ?")->execute([$auth['token']]);
    }

    return [
        'success' => true,
        'status' => 200,
        'message' => 'Logout berhasil',
    ];
}
