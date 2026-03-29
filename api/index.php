<?php

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/auth.php';

if (function_exists('registerApiErrorHandler')) {
    registerApiErrorHandler();
}

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';
header('Content-Type: ' . ($action ? 'application/json' : 'text/html; charset=UTF-8'));

if (!$action) {
    $route = $_GET['route'] ?? 'dashboard';
    $db = getLocalDB();

    if (in_array($route, ['login', 'register'], true)) {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            require_once __DIR__ . '/../controllers/AuthController.php';
            if (!$db) {
                echo 'Database unavailable';
                exit;
            }
            handleAuthAction($route, $_POST, $db);
        }
        if (isLoggedIn()) {
            header('Location: ./');
            exit;
        }
        require __DIR__ . "/../pages/auth/{$route}.php";
        exit;
    }

    if ($route === 'logout') {
        logoutUser();
        header('Location: ?route=login');
        exit;
    }

    require_once __DIR__ . '/../core/UserDataService.php';
    requireLogin();

    $user = getCurrentUser();
    if (!$user) {
        logoutUser();
        header('Location: ?route=login');
        exit;
    }

    if (!$db) {
        echo 'Database connection failed';
        exit;
    }

    $settings = getUserSettings((int)$user['id']);
    $devices = getUserDevices((int)$user['id']);
    $sensors = getUserSensors((int)$user['id']);
    $cameraBundle = getUserCameraBundle((int)$user['id'], $db);
    $cvState = $cameraBundle['cv_state'] ?? iotzyDefaultCvState();
    $camera = $cameraBundle['camera'] ?? null;
    $cameraSettings = $cameraBundle['camera_settings'] ?? [];

    generateCsrfToken();

    include __DIR__ . '/../components/header.php';
    include __DIR__ . '/../components/sidebar.php';
    include __DIR__ . '/../components/topbar.php';
    include __DIR__ . '/../pages/dashboard.php';
    include __DIR__ . '/../pages/devices.php';
    include __DIR__ . '/../pages/sensors.php';
    include __DIR__ . '/../pages/automation.php';
    include __DIR__ . '/../pages/camera.php';
    include __DIR__ . '/../pages/analytics.php';
    include __DIR__ . '/../pages/settings.php';
    echo '</div></main>';
    include __DIR__ . '/../components/bottom_nav.php';
    include __DIR__ . '/../components/footer.php';
    exit;
}

$inputJSON = file_get_contents('php://input');
$body = json_decode($inputJSON, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    $body = $_POST;
}

$db = getLocalDB();
if (!$db) {
    jsonOut(['success' => false, 'error' => 'Database unavailable'], 500);
}

if (in_array($action, ['login', 'register', 'logout'], true)) {
    require_once __DIR__ . '/../controllers/AuthController.php';
    handleAuthAction($action, $body, $db);
    exit;
}

if (!isLoggedIn()) {
    jsonOut(['success' => false, 'error' => 'Unauthorized'], 401);
}

$userId = (int)$_SESSION['user_id'];

if ($action === 'update_cv_state') {
    requireCsrf();
    require_once __DIR__ . '/../core/UserDataService.php';
    $state = updateUserCVState($userId, $body, $db);
    jsonOut([
        'success' => true,
        'cv_state' => $state,
    ]);
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
