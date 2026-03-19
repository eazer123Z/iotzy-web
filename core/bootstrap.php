<?php
/**
 * core/bootstrap.php — Master Loader
 * 
 * Satu file untuk require semua config dan helpers.
 * Semua file PHP cukup: require_once __DIR__ . '/../core/bootstrap.php';
 */

$baseDir = dirname(__DIR__);

// Load .env if exists (up to 2 levels up)
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
            if (!$line || strpos($line, '#') === 0 || strpos($line, '=') === false) continue;
            list($name, $value) = explode('=', $line, 2);
            $name  = trim($name);
            $value = trim($value, " \t\n\r\0\x0B\"'");
            if (!isset($_SERVER[$name]) && !isset($_ENV[$name])) {
                putenv("{$name}={$value}");
                $_ENV[$name] = $value;
                $_SERVER[$name] = $value;
            }
        }
        break; // Stop after first .env found
    }
}

// Config
require_once $baseDir . '/config/app.php';
require_once $baseDir . '/config/database.php';
require_once $baseDir . '/config/telegram.php';

// Core utilities
require_once $baseDir . '/core/helpers.php';
require_once $baseDir . '/core/response.php';

// Aktifkan error handler untuk API
registerApiErrorHandler();

// 🔥 PERSISTENT SESSION HANDLER (Khusus Vercel/Serverless)
require_once $baseDir . '/core/PersistentSession.php';
if (!session_id()) {
    session_set_save_handler(new PersistentSessionHandler(), true);
}
