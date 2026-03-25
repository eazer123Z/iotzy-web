<?php
require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/auth.php';
registerApiErrorHandler();
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE, PUT');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
header('Content-Type: application/json');
$action = $_GET['action'] ?? $_POST['action'] ?? '';
if (!$action) { http_response_code(400); echo json_encode(['error' => 'Action tidak ditentukan']); exit; }
$inputJSON = file_get_contents('php://input'); $body = json_decode($inputJSON, true);
if (json_last_error() !== JSON_ERROR_NONE) $body = $_POST;
$db = getLocalDB();
if (!$db) { http_response_code(500); echo json_encode(['error' => 'Database tidak tersedia.']); exit; }
if (in_array($action, ['login', 'register', 'logout'], true)) { require_once __DIR__ . '/../controllers/AuthController.php'; handleAuthAction($action, $body, $db); exit; }
if (!isLoggedIn()) { http_response_code(401); echo json_encode(['error' => 'Sesi berakhir']); exit; }
requireCsrf(); $userId = (int)$_SESSION['user_id'];
if ($action === 'update_cv_state') {
    $sql = "UPDATE cv_state SET is_active = COALESCE(?, is_active), model_loaded = COALESCE(?, model_loaded), person_count = COALESCE(?, person_count), brightness = COALESCE(?, brightness), light_condition = COALESCE(?, light_condition), last_updated = NOW() WHERE user_id = ?";
    $db->prepare($sql)->execute([isset($body['is_active'])?(int)$body['is_active']:null, isset($body['model_loaded'])?(int)$body['model_loaded']:null, isset($body['person_count'])?(int)$body['person_count']:null, isset($body['brightness'])?(int)$body['brightness']:null, $body['light_condition']??null, $userId]);
    jsonOut(['success'=>true]); exit;
}
$routes = [
    'get_devices' => 'DeviceController.php', 'add_device' => 'DeviceController.php', 'update_device' => 'DeviceController.php', 'delete_device' => 'DeviceController.php', 'update_device_state' => 'DeviceController.php',
    'get_sensors' => 'SensorController.php', 'add_sensor' => 'SensorController.php', 'update_sensor' => 'SensorController.php', 'delete_sensor' => 'SensorController.php', 'update_sensor_value' => 'SensorController.php',
    'get_automation_rules' => 'AutomationController.php', 'add_automation_rule' => 'AutomationController.php', 'update_automation_rule' => 'AutomationController.php', 'delete_automation_rule' => 'AutomationController.php',
    'get_cv_rules' => 'CVController.php', 'save_cv_rules' => 'CVController.php', 'get_cv_config' => 'CVController.php', 'save_cv_config' => 'CVController.php',
    'get_settings' => 'SettingsController.php', 'save_settings' => 'SettingsController.php', 'get_mqtt_templates' => 'SettingsController.php',
    'get_logs' => 'LogController.php', 'add_log' => 'LogController.php', 'clear_logs' => 'LogController.php',
    'get_user' => 'ProfileController.php', 'update_profile' => 'ProfileController.php', 'change_password' => 'ProfileController.php',
    'ai_chat_process' => 'AIChatController.php', 'delete_chat_history' => 'AIChatController.php', 'get_ai_chat_history' => 'AIChatController.php', 'test_telegram' => 'AIChatController.php'
];
if (isset($routes[$action])) {
    $file = $routes[$action]; require_once __DIR__ . '/../controllers/' . $file;
    $handler = 'handle' . str_replace('Controller.php', 'Action', $file);
    if (function_exists($handler)) $handler($action, $userId, $body, $db);
    else jsonOut(['success' => false, 'error' => "Handler '$handler' missing"]);
} else { http_response_code(400); jsonOut(['success' => false, 'error' => "Action '$action' unknown"]); }
