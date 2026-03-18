<?php
/**
 * core/helpers.php — Utility Functions
 */

/**
 * Encrypt a plaintext string using AES-256-CBC.
 */
function encryptSecret(string $plainText): ?string {
    $plainText = trim($plainText);
    if ($plainText === '') return null;

    $key = hash('sha256', APP_SECRET, true);
    $iv  = random_bytes(16);
    $enc = openssl_encrypt($plainText, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);

    if ($enc === false) {
        error_log('[IoTzy] encryptSecret error');
        return null;
    }

    return base64_encode($iv . $enc);
}

/**
 * Decrypt a ciphertext string encrypted with encryptSecret().
 */
function decryptSecret(?string $cipherText): string {
    if (!$cipherText) return '';

    $raw = base64_decode($cipherText, true);
    if ($raw === false || strlen($raw) <= 16) return '';

    $key = hash('sha256', APP_SECRET, true);
    $iv  = substr($raw, 0, 16);
    $enc = substr($raw, 16);
    $dec = openssl_decrypt($enc, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);

    return $dec === false ? '' : $dec;
}
