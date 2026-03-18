<?php
/**
 * core/response.php — JSON Response & Error Handling
 */

/**
 * Output JSON response and terminate.
 */
function jsonOut(mixed $data, int $code = 200): never {
    if ($code !== 200) http_response_code($code);
    while (ob_get_level() > 0) ob_end_clean();
    header('Content-Type: application/json');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Register fatal error handler untuk API endpoints.
 */
function registerApiErrorHandler(): void {
    register_shutdown_function(function() {
        $err = error_get_last();
        if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
            while (ob_get_level() > 0) ob_end_clean();
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error'   => 'Fatal server error. Silakan coba lagi.'
            ]);

            // Log detail error ke storage
            $logPath = dirname(__DIR__) . '/storage/logs/errors.log';
            $logMsg  = '[' . date('Y-m-d H:i:s') . '] FATAL: ' 
                     . $err['message'] . ' in ' . $err['file'] 
                     . ' on line ' . $err['line'] . "\n";
            @file_put_contents($logPath, $logMsg, FILE_APPEND);
        }
    });
}
