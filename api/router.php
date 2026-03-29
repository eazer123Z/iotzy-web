<?php

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/UserDataService.php';

registerApiErrorHandler();

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE, PUT');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header('Content-Type: application/json');
$action = $_GET['action'] ?? $_POST['action'] ?? '';
if (!$action) {
    jsonOut(['error' => 'Action tidak ditentukan'], 400);
}

$inputJSON = file_get_contents('php://input');
$body = json_decode($inputJSON, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    $body = $_POST;
}

$db = getLocalDB();
if (!$db) {
    jsonOut(['error' => 'Database tidak tersedia.'], 500);
}

if (in_array($action, ['login', 'register', 'logout'], true)) {
    require_once __DIR__ . '/../controllers/AuthController.php';
    handleAuthAction($action, $body, $db);
    exit;
}

if (!isLoggedIn()) {
    jsonOut(['error' => 'Sesi berakhir'], 401);
}

$userId = (int)$_SESSION['user_id'];

if ($action === 'update_cv_state') {
    requireCsrf();
    jsonOut(['success' => true, 'cv_state' => updateUserCVState($userId, $body, $db)]);
}

$routes = [
    'get_devices' => 'DeviceController.php',
    'get_device_templates' => 'DeviceController.php',
    'add_device' => 'DeviceController.php',
    'update_device' => 'DeviceController.php',
    'delete_device' => 'DeviceController.php',
    'update_device_state' => 'DeviceController.php',
    'get_device_sessions' => 'DeviceController.php',

    'get_sensors' => 'SensorController.php',
    'get_sensor_templates' => 'SensorController.php',
    'add_sensor' => 'SensorController.php',
    'update_sensor' => 'SensorController.php',
    'delete_sensor' => 'SensorController.php',
    'update_sensor_value' => 'SensorController.php',
    'get_sensor_readings' => 'SensorController.php',
    'get_sensor_history' => 'SensorController.php',

    'get_automation_rules' => 'AutomationController.php',
    'add_automation_rule' => 'AutomationController.php',
    'update_automation_rule' => 'AutomationController.php',
    'delete_automation_rule' => 'AutomationController.php',

    'get_cv_rules' => 'CVController.php',
    'save_cv_rules' => 'CVController.php',
    'get_cv_config' => 'CVController.php',
    'save_cv_config' => 'CVController.php',

    'get_settings' => 'SettingsController.php',
    'save_settings' => 'SettingsController.php',
    'get_mqtt_templates' => 'SettingsController.php',

    'get_logs' => 'LogController.php',
    'get_logs_daily_summary' => 'LogController.php',
    'get_device_daily_summary' => 'LogController.php',
    'add_log' => 'LogController.php',
    'clear_logs' => 'LogController.php',

    'get_user' => 'ProfileController.php',
    'update_profile' => 'ProfileController.php',
    'change_password' => 'ProfileController.php',

    'ai_chat_process' => 'AIChatController.php',
    'delete_chat_history' => 'AIChatController.php',
    'get_ai_chat_history' => 'AIChatController.php',
    'test_telegram' => 'AIChatController.php',
    'db_status' => 'AIChatController.php',

    'get_dashboard_data' => 'DashboardController.php',
];

if (isset($routes[$action])) {
    $file = $routes[$action];
    require_once __DIR__ . '/../controllers/' . $file;
    $handler = 'handle' . str_replace('Controller.php', 'Action', $file);
    if (function_exists($handler)) {
        $handler($action, $userId, $body, $db);
    } else {
        jsonOut(['success' => false, 'error' => "Handler '$handler' missing"], 500);
    }
} else {
    jsonOut(['success' => false, 'error' => "Action '$action' unknown"], 400);
}
