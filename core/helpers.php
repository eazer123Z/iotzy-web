<?php

function encryptSecret(string $plainText): ?string {
    $plainText = trim($plainText);
    if ($plainText === '') return null;
    $key = hash('sha256', APP_SECRET, true);
    $iv  = random_bytes(16);
    $enc = openssl_encrypt($plainText, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
    return $enc === false ? null : base64_encode($iv . $enc);
}

function decryptSecret(?string $cipherText): string {
    if (!$cipherText) return '';
    $raw = base64_decode($cipherText, true);
    if ($raw === false || strlen($raw) <= 16) return '';
    $key = hash('sha256', APP_SECRET, true);
    $iv  = substr($raw, 0, 16);
    $enc = substr($raw, 16);
    return openssl_decrypt($enc, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv) ?: '';
}

function jsonOut(mixed $data, int $code = 200): never {
    if ($code !== 200) http_response_code($code);
    while (ob_get_level() > 0) ob_end_clean();
    header('Content-Type: application/json');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function registerApiErrorHandler(): void {
    register_shutdown_function(function() {
        $err = error_get_last();
        if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
            while (ob_get_level() > 0) ob_end_clean();
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false, 
                'error' => "FATAL_DEBUG: " . $err['message'] . " in " . $err['file'] . " on line " . $err['line']
            ]);
            exit;
        }
    });
}
