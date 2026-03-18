<?php
/**
 * config/app.php — Konfigurasi Aplikasi
 */

define('APP_NAME',         'IoTzy');
define('APP_URL',          rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\'));
define('APP_VERSION',      '7.0.0');
define('APP_SECRET',       'a7d8e9f0c1b2a3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0');
define('SESSION_LIFETIME', 86400);
define('APP_TIMEZONE',     'Asia/Makassar');

date_default_timezone_set(APP_TIMEZONE);
