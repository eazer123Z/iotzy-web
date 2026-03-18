<?php
/**
 * index.php — Main Entry Point / Router
 */

require_once __DIR__ . '/core/bootstrap.php';
require_once __DIR__ . '/middleware/auth.php';
require_once __DIR__ . '/services/UserDataService.php';

$route  = $_GET['route'] ?? 'dashboard';

// Rute Publik (Tidak perlu login)
if ($route === 'login') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        require_once __DIR__ . '/controllers/AuthController.php';
        $db = getLocalDB();
        if (!$db) {
            $err = $GLOBALS['DB_LAST_ERROR'] ?? 'Database tidak tersedia.';
            jsonOut(['success' => false, 'error' => $err]);
        }
        handleAuthAction('login', $_POST, $db);
    }
    if (isLoggedIn()) { header('Location: ' . rtrim(APP_URL, '/') . '/'); exit; }
    require __DIR__ . '/views/auth/login.php';
    exit;
}
if ($route === 'register') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        require_once __DIR__ . '/controllers/AuthController.php';
        $db = getLocalDB();
        if (!$db) {
            $err = $GLOBALS['DB_LAST_ERROR'] ?? 'Database tidak tersedia.';
            jsonOut(['success' => false, 'error' => $err]);
        }
        handleAuthAction('register', $_POST, $db);
    }
    if (isLoggedIn()) { header('Location: ' . rtrim(APP_URL, '/') . '/'); exit; }
    require __DIR__ . '/views/auth/register.php';
    exit;
}
if ($route === 'logout') {
    logoutUser();
    header('Location: '.APP_URL.'/?route=login');
    exit;
}

// ── Rute Terproteksi ──
requireLogin();

// Load data utama untuk dashboard / views
$user = getCurrentUser();
if (!$user) {
    logoutUser();
    header('Location: ' . rtrim(APP_URL, '/') . '/?route=login');
    exit;
}

$settings = getUserSettings($user['id']);
$devices  = getUserDevices($user['id']);
$sensors  = getUserSensors($user['id']);

// Keamanan: hapus field sensitif
$safeSettings = $settings;
unset($safeSettings['mqtt_password_enc']);

// Semua rute ini akan menggunakan Layout SPA-like (seperti desain aslinya)
// Di desain asli TAv2, semua view di-load sekaligus dan di-toggle via JS.
// Jadi index.php me-load semuanya:

include __DIR__ . '/views/layouts/header.php';
include __DIR__ . '/views/layouts/sidebar.php';
include __DIR__ . '/views/layouts/topbar.php';

include __DIR__ . '/views/pages/dashboard.php';
include __DIR__ . '/views/pages/devices.php';
include __DIR__ . '/views/pages/sensors.php';
include __DIR__ . '/views/pages/automation.php';
include __DIR__ . '/views/pages/camera.php';
include __DIR__ . '/views/pages/analytics.php';
include __DIR__ . '/views/pages/settings.php';

include __DIR__ . '/views/layouts/bottom-nav.php';
include __DIR__ . '/views/modals/all-modals.php';
include __DIR__ . '/views/layouts/footer.php';