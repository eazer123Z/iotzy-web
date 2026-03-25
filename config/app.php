<?php
/**
 * config/app.php
 * ───
 * Konfigurasi utama aplikasi IoTzy.
 * Menangani deteksi URL otomatis dan parameter dasar sistem.
 */

// Otomatis mendeteksi path folder aplikasi
$detectedUrl = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
$detectedUrl = preg_replace('/\/(api|controllers|core|pages|components|assets)$/', '', $detectedUrl);
if ($detectedUrl === '/') $detectedUrl = '';

define('APP_NAME',         getenv('APP_NAME') ?: 'IoTzy');
define('APP_URL',          getenv('APP_URL') ?: $detectedUrl);

$isVercel = isset($_SERVER['VERCEL']) || getenv('VERCEL') === "1";
define('ASSET_URL',        APP_URL . '/assets');

define('APP_VERSION',      '8.0.0-flat');

$appSecret = getenv('APP_SECRET');
if (!$appSecret) {
    error_log('[IoTzy FATAL] APP_SECRET tidak diset di environment');
    die('Server configuration error: APP_SECRET missing');
}
define('APP_SECRET', $appSecret);

define('SESSION_LIFETIME', 86400);
define('APP_TIMEZONE',     getenv('TIMEZONE') ?: 'Asia/Jakarta');

date_default_timezone_set(APP_TIMEZONE);
