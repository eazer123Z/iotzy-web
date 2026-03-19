<?php
/**
 * core/bootstrap.php — Master Loader
 */

$baseDir = dirname(__DIR__);

// 🔥 cegah header error
ob_start();


// ==================== LOAD ENV ====================
$envPaths = [
    $baseDir . '/.env',
    dirname($baseDir) . '/.env',
    dirname(dirname($baseDir)) . '/.env'
];

foreach ($envPaths as $envFile) {
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if (!$line || strpos($line, '#') === 0 || strpos($line, '=') === false)
                continue;

            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value, " \t\n\r\0\x0B\"'");

            if (!isset($_SERVER[$name]) && !isset($_ENV[$name])) {
                putenv("{$name}={$value}");
                $_ENV[$name] = $value;
                $_SERVER[$name] = $value;
            }
        }
        break;
    }
}


// ==================== CONFIG ====================
require_once $baseDir . '/config/app.php';
require_once $baseDir . '/config/database.php';
require_once $baseDir . '/config/telegram.php';

// CORE
require_once $baseDir . '/core/helpers.php';
require_once $baseDir . '/core/response.php';

registerApiErrorHandler();


// ==================== SESSION FIX ====================

// 🔥 DETEKSI ENV (MINIMAL)
$isVercel = isset($_SERVER['VERCEL']);
$isDocker = file_exists('/.dockerenv');

if ($isVercel) {
    require_once $baseDir . '/core/PersistentSession.php';

    if (!session_id()) {
        session_set_save_handler(new PersistentSessionHandler(), true);
    }
}
else {
    // 🔥 Docker & Local
    session_save_path('/tmp');
}