<?php
/**
 * api/index.php — PRODUCTION BRIDGE (Final Sync)
 * 
 * Melayani request Vercel dan meneruskannya ke index.php utama.
 */

// Aktifkan error logging ke stderr (Vercel Logs)
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Bypass router utama jika request mengarah ke db-init
$requestUri = $_SERVER['REQUEST_URI'] ?? '';
if (strpos($requestUri, '/api/db-init.php') !== false) {
    require __DIR__ . '/db-init.php';
    exit;
}

// Teruskan ke router utama
require __DIR__ . '/../index.php';
