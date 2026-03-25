<?php
/**
 * api/index.php — Main Entry Point / Front Controller for Vercel
 * ───
 * Dipindah dari root ke folder api/ agar memenuhi aturan ketat Vercel V2 Serverless Functions.
 */

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/UserDataService.php';

$route = $_GET['route'] ?? 'dashboard';

// ─────────────── RUTE PUBLIK ───────────────

if ($route === 'login') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        require_once __DIR__ . '/../controllers/AuthController.php';
        $db = getLocalDB();
        if (!$db) {
            $err = $GLOBALS['DB_LAST_ERROR'] ?? 'Database tidak tersedia.';
            jsonOut(['success' => false, 'error' => $err]);
        }
        handleAuthAction('login', $_POST, $db);
    }
    if (isLoggedIn()) { header('Location: ' . rtrim(APP_URL, '/') . '/'); exit; }
    require __DIR__ . '/../pages/auth/login.php';
    exit;
}

if ($route === 'register') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        require_once __DIR__ . '/../controllers/AuthController.php';
        $db = getLocalDB();
        if (!$db) {
            $err = $GLOBALS['DB_LAST_ERROR'] ?? 'Database tidak tersedia.';
            jsonOut(['success' => false, 'error' => $err]);
        }
        handleAuthAction('register', $_POST, $db);
    }
    if (isLoggedIn()) { header('Location: ' . rtrim(APP_URL, '/') . '/'); exit; }
    require __DIR__ . '/../pages/auth/register.php';
    exit;
}

if ($route === 'logout') {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        header('Location: ' . APP_URL . '/?route=login');
        exit;
    }
    $token = $_POST['csrf_token'] ?? null;
    if (!validateCsrfToken($token)) {
        http_response_code(403);
        die('Invalid CSRF token');
    }
    logoutUser();
    header('Location: ' . APP_URL . '/?route=login');
    exit;
}

// ─────────────── RUTE TERPROTEKSI ───────────────
requireLogin();

$user = getCurrentUser();
if (!$user) {
    logoutUser();
    header('Location: ' . rtrim(APP_URL, '/') . '/?route=login');
    exit;
}

$settings = getUserSettings($user['id']);
$devices  = getUserDevices($user['id']);
$sensors  = getUserSensors($user['id']);

$db = getLocalDB();

$cvStateStmt = $db->prepare("SELECT * FROM cv_state WHERE user_id = ?");
$cvStateStmt->execute([$user['id']]);
$cvState = $cvStateStmt->fetch(PDO::FETCH_ASSOC) ?: [
    'is_active'       => 0,
    'person_count'    => 0,
    'brightness'      => 0,
    'light_condition' => 'unknown'
];

$safeSettings = $settings;
unset($safeSettings['mqtt_password_enc']);

// ─────────────── LAYOUT ───────────────
include __DIR__ . '/../components/header.php';
include __DIR__ . '/../components/sidebar.php';
include __DIR__ . '/../components/topbar.php';

include __DIR__ . '/../pages/dashboard.php';
include __DIR__ . '/../pages/devices.php';
include __DIR__ . '/../pages/sensors.php';
include __DIR__ . '/../pages/camera.php';
include __DIR__ . '/../pages/automation.php';
include __DIR__ . '/../pages/analytics.php';
include __DIR__ . '/../pages/settings.php';
include __DIR__ . '/../pages/history.php';
include __DIR__ . '/../pages/schedules.php';
include __DIR__ . '/../pages/recordings.php';
include __DIR__ . '/../pages/camera_cv.php';

include __DIR__ . '/../components/bottom_nav.php';
include __DIR__ . '/../components/modals.php';
include __DIR__ . '/../components/footer.php';
