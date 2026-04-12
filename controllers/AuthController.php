<?php

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/auth.php';


function handleAuthAction(string $action, array $body, PDO $db): void {

    if ($action === 'login') {
        requireCsrf();

        // Rate limit login attempts: max 10 per 5 minutes per IP
        // Use high pseudo-userId (2^30 + hash) to avoid collision with real user IDs
        $loginIp = iotzyClientIp();
        $ipKey = (1 << 30) + (abs(crc32('login_' . $loginIp)) % (1 << 30));
        if (!iotzyAllowApiRateLimit($ipKey, 'login_attempt', 10, 300, $db)) {
            jsonOut(['success' => false, 'error' => 'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.'], 429);
        }

        $login    = trim($body['username'] ?? $body['login'] ?? $body['email'] ?? '');
        $password = $body['password'] ?? $body['pass'] ?? '';

        $res = loginUser($login, $password);

        if ($res === true) {
            jsonOut([
                'success'  => true,
                'message'  => 'Login berhasil',
                'redirect' => ''.APP_URL.'/'
            ]);
        }

        jsonOut([
            'success' => false,
            'error'   => $res
        ]);
    }

    if ($action === 'register') {
        requireCsrf();
        $username = trim($body['reg_username'] ?? $body['username'] ?? '');
        $email    = trim($body['reg_email'] ?? $body['email'] ?? '');
        $password = $body['reg_password'] ?? $body['password'] ?? '';
        $fullname = trim($body['reg_fullname'] ?? $body['fullname'] ?? '');

        $res = registerUser($username, $email, $password, $fullname);

        if ($res === true) {
            jsonOut([
                'success'  => true,
                'redirect' => ''.APP_URL.'/?route=login'
            ]);
        }

        jsonOut([
            'success' => false,
            'error'   => $res
        ]);
    }

    if ($action === 'logout') {
        requireCsrf();

        if (isLoggedIn()) {
            logoutUser();

            jsonOut([
                'success'  => true,
                'redirect' => ''.APP_URL.'/?route=login'
            ]);
        }

        jsonOut([
            'success' => false
        ]);
    }
}
