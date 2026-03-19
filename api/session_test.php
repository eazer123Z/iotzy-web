<?php
require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../middleware/auth.php';

header('Content-Type: application/json');

startSecureSession();

echo json_encode([
    'session_id' => session_id(),
    'session_data' => $_SESSION,
    'cookies' => $_COOKIE,
    'server' => [
        'REMOTE_ADDR' => $_SERVER['REMOTE_ADDR'],
        'HTTP_USER_AGENT' => $_SERVER['HTTP_USER_AGENT'],
        'REQUEST_URI' => $_SERVER['REQUEST_URI']
    ],
    'is_logged_in' => isLoggedIn()
]);
