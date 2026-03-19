<?php
/**
 * api/data_router.php — Single Endpoint API Dispatcher
 *
 * Menggantikan file `data.php` (498 baris) yang monolitik.
 * Semua request frontend (GET/POST) dikirim ke sini beserta parameter `action`.
 * File ini akan memanggil controller yang tepat.
 */

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../middleware/auth.php';

// Register Global API Error Handler
registerApiErrorHandler();

header('Content-Type: application/json');

// 1. Ambil nama aksi (action)
$action = $_GET['action'] ?? $_POST['action'] ?? '';
if (!$action) {
    http_response_code(400);
    echo json_encode(['error' => 'Action tidak ditentukan']);
    exit;
}

// 2. Ambil payload body request (JSON atau POST urlencoded)
$inputJSON = file_get_contents('php://input');
$body      = json_decode($inputJSON, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    $body = $_POST; // Fallback jika kirim via form data standar
}

// 3. Setup Database Connection & Auth Check
$db = getLocalDB();
if (!$db) {
    http_response_code(500);
    echo json_encode(['error' => 'Database tidak tersedia.']);
    exit;
}

// Khusus AuthController tidak memerlukan logic login check (tapi logout butuh)
if (in_array($action, ['login', 'register', 'logout'], true)) {
    require_once __DIR__ . '/../controllers/AuthController.php';
    handleAuthAction($action, $body, $db);
    exit; // response dihandle oleh controller (via jsonOut)
}

// Untuk action selain Auth, WAJIB login dan kirim CSRF Token via header/post body
if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => 'Sesi berakhir, silakan login kembali.']);
    exit;
}

requireCsrf();

$userId = (int)$_SESSION['user_id'];

// 4. Security Check: Admin actions require admin role
if (strpos($action, 'admin_') === 0 && !isAdmin()) {
    http_response_code(403);
    jsonOut(['success' => false, 'error' => 'Akses ditolak. Fitur ini hanya untuk Administrator.']);
}

// 5. Dispatch Table — Map aksi ke Controller dan File yang sesuai
$routes = [
    // DeviceController
    'get_devices'         => 'DeviceController.php',
    'add_device'          => 'DeviceController.php',
    'update_device'       => 'DeviceController.php',
    'delete_device'       => 'DeviceController.php',
    'update_device_state' => 'DeviceController.php',
    'get_device_sessions' => 'DeviceController.php',

    // SensorController
    'get_sensors'         => 'SensorController.php',
    'add_sensor'          => 'SensorController.php',
    'update_sensor'       => 'SensorController.php',
    'delete_sensor'       => 'SensorController.php',
    'update_sensor_value' => 'SensorController.php',
    'get_sensor_readings' => 'SensorController.php',

    // AutomationController
    'get_automation_rules'=> 'AutomationController.php',
    'add_automation_rule' => 'AutomationController.php',
    'update_automation_rule'=> 'AutomationController.php',
    'delete_automation_rule'=> 'AutomationController.php',
    'get_schedules'       => 'AutomationController.php',
    'add_schedule'        => 'AutomationController.php',
    'toggle_schedule'     => 'AutomationController.php',
    'delete_schedule'     => 'AutomationController.php',

    // CVController
    'get_cv_rules'        => 'CVController.php',
    'save_cv_rules'       => 'CVController.php',
    'get_cv_config'       => 'CVController.php',
    'save_cv_config'      => 'CVController.php',

    // SettingsController
    'get_settings'        => 'SettingsController.php',
    'save_settings'       => 'SettingsController.php',

    // LogController
    'get_logs'            => 'LogController.php',
    'add_log'             => 'LogController.php',
    'clear_logs'          => 'LogController.php',

    // ProfileController
    'get_user'            => 'ProfileController.php',
    'update_profile'      => 'ProfileController.php',
    'change_password'     => 'ProfileController.php',

    // AIChatController
    'ai_chat_process'     => 'AIChatController.php',
    'delete_chat_history' => 'AIChatController.php',
    'get_ai_chat_history' => 'AIChatController.php',
    'test_telegram'       => 'AIChatController.php',
    'db_status'           => 'AIChatController.php',

    // Admin Actions
    'admin_get_users'     => 'AdminController.php',
    'admin_update_user'   => 'AdminController.php',
    'admin_delete_user'   => 'AdminController.php',
    'admin_add_user'      => 'AdminController.php',
];

// 5. Eksekusi Controller
if (isset($routes[$action])) {
    $file = $routes[$action];
    require_once __DIR__ . '/../controllers/' . $file;
    
    // Resolve nama fungsi handler berdasarkan nama file controller
    $handlerFunc = 'handle' . str_replace('Controller.php', 'Action', $file);
    
    if (function_exists($handlerFunc)) {
        // Pemanggilan handler. Handler wajib menggunakan fungsi `jsonOut()` 
        // sehingga eksekusi script akan otomatis berhenti.
        $handlerFunc($action, $userId, $body, $db);
    } else {
        jsonOut(['success' => false, 'error' => "Handler '$handlerFunc' tidak ditemukan dalam controller '$file'"]);
    }
} else {
    // Action tidak dikenali
    http_response_code(400);
    jsonOut(['success' => false, 'error' => "Action '$action' tidak dikenali"]);
}
