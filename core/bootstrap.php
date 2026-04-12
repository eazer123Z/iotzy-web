<?php

ob_start();
$baseDir = dirname(__DIR__);

error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

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

foreach ($_SERVER as $key => $val) {
    if (is_string($val) && getenv($key) === false) {
        putenv("{$key}={$val}");
    }
}

require_once $baseDir . '/config/app.php';
require_once $baseDir . '/config/database.php';
require_once $baseDir . '/config/ai.php';
require_once $baseDir . '/config/telegram.php';
require_once $baseDir . '/core/helpers.php';

if (!headers_sent()) {
    header('X-IoTzy-Build: ' . APP_VERSION);
    // TODO: Replace 'unsafe-inline' 'unsafe-eval' with CSP nonces for inline scripts.
    // This requires generating a nonce per request and adding nonce="{$nonce}" to all <script> tags.
    // Example: $cspNonce = base64_encode(random_bytes(16));
    // Then: script-src 'self' 'nonce-{$cspNonce}' https://cdn.jsdelivr.net ...
    // Current inline scripts in footer.php would need the nonce attribute.
    header("Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' data: https://cdnjs.cloudflare.com https://fonts.gstatic.com; connect-src 'self' ws: wss: https:; media-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: no-referrer');
}

// Session Handler — Vercel menggunakan PersistentSession (DB-backed)
$isVercel = getenv('VERCEL') === "1" || isset($_SERVER['VERCEL']) || isset($_ENV['VERCEL']);

if ($isVercel) {
    require_once $baseDir . '/core/PersistentSession.php';
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_set_save_handler(new PersistentSessionHandler(), true);
    }
}
