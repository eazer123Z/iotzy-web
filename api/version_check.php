<?php
require_once __DIR__ . '/../config/app.php';
header('Content-Type: application/json');
echo json_encode([
    'version' => defined('APP_VERSION') ? APP_VERSION : 'undefined',
    'app_url' => defined('APP_URL') ? APP_URL : 'undefined',
    'server_script' => $_SERVER['SCRIPT_NAME'] ?? 'undefined'
]);
