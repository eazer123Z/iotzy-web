<?php
/**
 * services/DBHelper.php — Legacy DB Helpers (backward-compat wrappers)
 *
 * Fungsi utama sudah ada di config/database.php.
 * File ini hanya menyediakan wrapper jika dipanggil langsung dari legacy code.
 */

require_once __DIR__ . '/../config/database.php';

// Semua fungsi utama (dbInsert, dbWrite, dbStatus) sudah di config/database.php
// File ini hanya require config/database.php untuk backward compatibility.

/**
 * Encrypt a plaintext string using AES-256-CBC.
 * Guard agar tidak bentrok dengan core/helpers.php
 */
if (!function_exists('encryptSecret')) {
    function encryptSecret(string $plainText): ?string {
        $plainText = trim($plainText);
        if ($plainText === '') return null;

        $key = hash('sha256', (defined('APP_SECRET') ? APP_SECRET : 'fallback-secret'), true);
        $iv  = random_bytes(16);
        $enc = openssl_encrypt($plainText, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);

        if ($enc === false) return null;
        return base64_encode($iv . $enc);
    }
}

/**
 * Decrypt a ciphertext string.
 */
if (!function_exists('decryptSecret')) {
    function decryptSecret(?string $cipherText): string {
        if (!$cipherText) return '';

        $raw = base64_decode($cipherText, true);
        if ($raw === false || strlen($raw) <= 16) return '';

        $key = hash('sha256', (defined('APP_SECRET') ? APP_SECRET : 'fallback-secret'), true);
        $iv  = substr($raw, 0, 16);
        $enc = substr($raw, 16);
        $dec = openssl_decrypt($enc, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);

        return $dec === false ? '' : $dec;
    }
}
