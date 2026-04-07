<?php

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/auth.php';

if (function_exists('registerApiErrorHandler')) {
    registerApiErrorHandler();
}

$apiOnlyMode = defined('IOTZY_API_ONLY') && IOTZY_API_ONLY === true;

$requestScheme = (
    (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (int)($_SERVER['SERVER_PORT'] ?? 0) === 443
    || strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https'
) ? 'https' : 'http';
$requestHost = trim((string)($_SERVER['HTTP_HOST'] ?? ''));
$origin = rtrim(trim((string)($_SERVER['HTTP_ORIGIN'] ?? '')), '/');
$allowedOrigins = [];

if ($requestHost !== '') {
    $allowedOrigins[] = $requestScheme . '://' . $requestHost;
}

if (defined('APP_URL') && preg_match('/^https?:\/\//i', APP_URL)) {
    $allowedOrigins[] = rtrim(APP_URL, '/');
}

$allowedOrigins = array_values(array_unique(array_filter($allowedOrigins)));
$isCorsOriginAllowed = $origin === '' || in_array($origin, $allowedOrigins, true);

if ($origin !== '' && $isCorsOriginAllowed) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}

header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN, X-CSRF-Token');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code($isCorsOriginAllowed ? 200 : 403);
    exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';
header('Content-Type: ' . ($action ? 'application/json' : 'text/html; charset=UTF-8'));

if (!$action) {
    if ($apiOnlyMode) {
        jsonOut(['success' => false, 'error' => 'Action tidak ditentukan'], 400);
    }

    $route = $_GET['route'] ?? 'dashboard';
    $db = getLocalDB();

    if (in_array($route, ['login', 'register'], true)) {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            require_once __DIR__ . '/../controllers/AuthController.php';
            if (!$db) {
                $err = $GLOBALS['DB_LAST_ERROR'] ?? 'Database unavailable';
                jsonOut(['success' => false, 'error' => $err]);
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
    $devices = getUserDevicesClientPayload((int)$user['id'], $db);
    $sensors = getUserSensorsClientPayload((int)$user['id'], $db);

    $shouldBootstrapCamera = in_array($route, ['camera', 'settings'], true);
    $cameraBundle = [
        'cv_state' => iotzyDefaultCvState(),
        'camera' => null,
        'camera_settings' => [],
    ];
    $cameraStreamSessions = [];

    if ($shouldBootstrapCamera) {
        $cameraBundle = getUserCameraBundle((int)$user['id'], $db, [
            'camera_key' => $_COOKIE['iotzy_camera_key'] ?? null,
            'camera_name' => $_COOKIE['iotzy_camera_name'] ?? null,
        ]);
        $cameraStreamSessions = getUserCameraStreamSessions((int)$user['id'], [
            'camera_key' => $_COOKIE['iotzy_camera_key'] ?? null,
            'camera_name' => $_COOKIE['iotzy_camera_name'] ?? null,
            'camera_active' => false,
        ], $db);
    }

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

$readOnlyActions = [
    'get_devices',
    'get_device_templates',
    'get_device_sessions',
    'get_sensors',
    'get_sensor_templates',
    'get_sensor_readings',
    'get_sensor_history',
    'get_automation_rules',
    'get_schedules',
    'get_cv_rules',
    'get_cv_config',
    'get_camera_stream_sessions',
    'get_camera_stream_snapshot',
    'get_settings',
    'get_mqtt_templates',
    'get_logs',
    'get_logs_daily_summary',
    'get_device_daily_summary',
    'get_user',
    'get_ai_chat_history',
    'get_ai_token_metrics',
    'db_status',
    'get_dashboard_data',
];
if (!in_array($action, $readOnlyActions, true)) {
    requireCsrf();
}

$rateLimits = [
    'update_sensor_value' => [60, 60],
    'add_log' => [60, 60],
    'poll_camera_stream_updates' => [180, 60],
    'ai_chat_process' => [20, 60],
    'ai_chat_fast_track' => [30, 60],
];
if (isset($rateLimits[$action])) {
    [$maxHits, $windowSeconds] = $rateLimits[$action];
    if (!iotzyAllowApiRateLimit($userId, $action, $maxHits, $windowSeconds, $db)) {
        jsonOut(['success' => false, 'error' => 'Too many requests'], 429);
    }
}

if ($action === 'update_cv_state') {
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
    'get_schedules' => 'AutomationController.php',
    'add_schedule' => 'AutomationController.php',
    'toggle_schedule' => 'AutomationController.php',
    'delete_schedule' => 'AutomationController.php',

    'get_cv_rules' => 'CVController.php',
    'save_cv_rules' => 'CVController.php',
    'get_cv_config' => 'CVController.php',
    'save_cv_config' => 'CVController.php',

    'get_camera_stream_sessions' => 'CameraStreamController.php',
    'get_camera_stream_snapshot' => 'CameraStreamController.php',
    'start_camera_stream' => 'CameraStreamController.php',
    'join_camera_stream' => 'CameraStreamController.php',
    'submit_camera_stream_answer' => 'CameraStreamController.php',
    'push_camera_stream_candidate' => 'CameraStreamController.php',
    'push_camera_stream_snapshot' => 'CameraStreamController.php',
    'poll_camera_stream_updates' => 'CameraStreamController.php',
    'stop_camera_stream' => 'CameraStreamController.php',

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
    'ai_chat_fast_track' => 'AIChatController.php',
    'delete_chat_history' => 'AIChatController.php',
    'get_ai_chat_history' => 'AIChatController.php',
    'get_ai_token_metrics' => 'AIChatController.php',
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
