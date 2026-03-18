<?php
/**
 * controllers/AuthController.php — User Authentication actions (FIX APP)
 */

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../middleware/auth.php';

function handleAuthAction(string $action, array $body, PDO $db): void {

    // ===================== LOGIN =====================
    if ($action === 'login') {
        $login    = trim($body['username'] ?? $body['login'] ?? $body['email'] ?? '');
        $password = $body['password'] ?? $body['pass'] ?? '';

        $res = loginUser($login, $password);

        if ($res === true) {
            jsonOut([
                'success'  => true,
                'message'  => 'Login berhasil',
                'redirect' => ''.APP_URL.'/'   // 🔥 FIX DI SINI
            ]);
        }

        jsonOut([
            'success' => false,
            'error'   => $res
        ]);
    }

    // ===================== REGISTER =====================
    if ($action === 'register') {
        $username = trim($body['reg_username'] ?? $body['username'] ?? '');
        $email    = trim($body['reg_email'] ?? $body['email'] ?? '');
        $password = $body['reg_password'] ?? $body['password'] ?? '';
        $fullname = trim($body['reg_fullname'] ?? $body['fullname'] ?? '');

        $res = registerUser($username, $email, $password, $fullname);

        if ($res === true) {
            jsonOut([
                'success'  => true,
                'redirect' => ''.APP_URL.'/?route=login'   // 🔥 FIX
            ]);
        }

        jsonOut([
            'success' => false,
            'error'   => $res
        ]);
    }

    // ===================== LOGOUT =====================
    if ($action === 'logout') {
        requireCsrf();

        if (isLoggedIn()) {
            logoutUser();

            jsonOut([
                'success'  => true,
                'redirect' => ''.APP_URL.'/?route=login'   // 🔥 FIX
            ]);
        }

        jsonOut([
            'success' => false
        ]);
    }
}