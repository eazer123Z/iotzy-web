<?php
require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/auth.php';

// Native API Error Handler (from core/helpers.php)
if (function_exists('registerApiErrorHandler')) {
    registerApiErrorHandler();
}

// Simple CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Define action early to avoid undefined variable error
$action = $_GET['action'] ?? $_POST['action'] ?? '';

header('Content-Type: ' . ($action ? 'application/json' : 'text/html; charset=UTF-8'));

if (!$action) {
    // ═══ UI ROUTING LOGIC (PORTED FROM ROOT INDEX) ═══
    $route = $_GET['route'] ?? 'dashboard';
    $db = getLocalDB(); // Initialize DB early for UI

    // Auth handling
    if (in_array($route, ['login', 'register'])) {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            require_once __DIR__ . '/../controllers/AuthController.php';
            if (!$db) {
                echo "Database unavailable";
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
        echo "Database connection failed";
        exit;
    }

    $settings = getUserSettings($user['id']);
    $devices = getUserDevices($user['id']);
    $sensors = getUserSensors($user['id']);

    // Fetch CV State
    $cvStateStmt = $db->prepare("SELECT * FROM cv_state WHERE user_id = ?");
    $cvStateStmt->execute([$user['id']]);
    $cvState = $cvStateStmt->fetch(PDO::FETCH_ASSOC) ?: ['is_active' => 0, 'person_count' => 0, 'brightness' => 0, 'light_condition' => 'unknown'];

    // Wajib generate CSRF Token agar bisa disuntikkan ke window.CSRF_TOKEN di Javascript
    generateCsrfToken();

    include __DIR__ . '/../components/header.php';
    include __DIR__ . '/../components/sidebar.php';
?>
    <?php include __DIR__ . '/../components/topbar.php'; ?>
      
      <?php include __DIR__ . '/../pages/dashboard.php'; ?>
      <?php include __DIR__ . '/../pages/devices.php'; ?>
      <?php include __DIR__ . '/../pages/sensors.php'; ?>
      <?php include __DIR__ . '/../pages/automation.php'; ?>
      <?php include __DIR__ . '/../pages/camera.php'; ?>
      <?php include __DIR__ . '/../pages/analytics.php'; ?>
      <?php include __DIR__ . '/../pages/settings.php'; ?>

    </div> <!-- close page-wrapper (opened in topbar.php) -->
    </main> <!-- close main-content (opened in topbar.php) -->

    <?php
    include __DIR__ . '/../components/bottom_nav.php';
    include __DIR__ . '/../components/footer.php';
    exit;
}

// Parse Body
$inputJSON = file_get_contents('php://input');
$body = json_decode($inputJSON, true);
if (json_last_error() !== JSON_ERROR_NONE)
    $body = $_POST;

$db = getLocalDB();
if (!$db) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database unavailable']);
    exit;

}

// Auth Actions
if (in_array($action, ['login', 'register', 'logout'], true)) {
    require_once __DIR__ . '/../controllers/AuthController.php';
    handleAuthAction($action, $body, $db);
    exit;
}

// Secure Actions
if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;

}

$userId = (int)$_SESSION['user_id'];

// Special: update_cv_state
if ($action === 'update_cv_state') {
    $sql = "UPDATE cv_state SET 
            is_active = COALESCE(?, is_active), 
            model_loaded = COALESCE(?, model_loaded), 
            person_count = COALESCE(?, person_count), 
            brightness = COALESCE(?, brightness), 
            light_condition = COALESCE(?, light_condition), 
            last_updated = NOW() 
            WHERE user_id = ?";
    $stmt = $db->prepare($sql);
    $stmt->execute([
        isset($body['is_active']) ? (int)$body['is_active'] : null,
        isset($body['model_loaded']) ? (int)$body['model_loaded'] : null,
        isset($body['person_count']) ? (int)$body['person_count'] : null,
        isset($body['brightness']) ? (int)$body['brightness'] : null,
        $body['light_condition'] ?? null,
        $userId
    ]);
    echo json_encode(['success' => true]);
    exit;
}

// Controllers Map (adjusted path to ../controllers/)
$routes = [
    'get_devices' => 'DeviceController.php', 'add_device' => 'DeviceController.php',
    'update_device' => 'DeviceController.php', 'delete_device' => 'DeviceController.php',
    'update_device_state' => 'DeviceController.php',
    'get_sensors' => 'SensorController.php', 'add_sensor' => 'SensorController.php',
    'update_sensor' => 'SensorController.php', 'delete_sensor' => 'SensorController.php',
    'update_sensor_value' => 'SensorController.php',
    'get_automation_rules' => 'AutomationController.php', 'add_automation_rule' => 'AutomationController.php',
    'update_automation_rule' => 'AutomationController.php', 'delete_automation_rule' => 'AutomationController.php',
    'get_cv_rules' => 'CVController.php', 'save_cv_rules' => 'CVController.php',
    'get_cv_config' => 'CVController.php', 'save_cv_config' => 'CVController.php',
    'get_settings' => 'SettingsController.php', 'save_settings' => 'SettingsController.php',
    'get_mqtt_templates' => 'SettingsController.php',
    'get_logs' => 'LogController.php', 'add_log' => 'LogController.php', 'clear_logs' => 'LogController.php',
    'get_user' => 'ProfileController.php', 'update_profile' => 'ProfileController.php',
    'change_password' => 'ProfileController.php',
    'ai_chat_process' => 'AIChatController.php', 'delete_chat_history' => 'AIChatController.php',
    'get_ai_chat_history' => 'AIChatController.php', 'test_telegram' => 'AIChatController.php',
    'get_dashboard_data' => 'DashboardController.php'
];

if (isset($routes[$action])) {
    $file = $routes[$action];
    require_once __DIR__ . '/../controllers/' . $file;
    $handler = 'handle' . str_replace('Controller.php', 'Action', $file);
    if (function_exists($handler)) {
        $handler($action, $userId, $body, $db);
    }
    else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => "Handler '$handler' missing"]);
    }
}
else {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => "Action '$action' unknown"]);
}
