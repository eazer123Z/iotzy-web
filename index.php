<?php
/**
 * main/index.php — Unified Dashboard Entry Point (Native PHP)
 */

require_once __DIR__ . '/core/bootstrap.php';
require_once __DIR__ . '/core/auth.php';
require_once __DIR__ . '/core/UserDataService.php';

$route = $_GET['route'] ?? 'dashboard';

// Auth handling
if (in_array($route, ['login', 'register'])) {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        require_once __DIR__ . '/controllers/AuthController.php';
        $db = getLocalDB();
        if (!$db) { jsonOut(['success' => false, 'error' => 'Database tidak tersedia.']); }
        handleAuthAction($route, $_POST, $db);
    }
    if (isLoggedIn()) { header('Location: ./'); exit; }
    require __DIR__ . "/pages/auth/{$route}.php";
    exit;
}

if ($route === 'logout') {
    requireCsrf();
    logoutUser();
    header('Location: ?route=login');
    exit;
}

requireLogin();

$user = getCurrentUser();
if (!$user) { logoutUser(); header('Location: ?route=login'); exit; }

$settings = getUserSettings($user['id']);
$devices  = getUserDevices($user['id']);
$sensors  = getUserSensors($user['id']);
$db = getLocalDB();

// Fetch CV State
$cvStateStmt = $db->prepare("SELECT * FROM cv_state WHERE user_id = ?");
$cvStateStmt->execute([$user['id']]);
$cvState = $cvStateStmt->fetch(PDO::FETCH_ASSOC) ?: ['is_active' => 0, 'person_count' => 0, 'brightness' => 0, 'light_condition' => 'unknown'];

include __DIR__ . '/components/header.php';
include __DIR__ . '/components/sidebar.php';
?>
<main class="main-content">
  <?php include __DIR__ . '/components/topbar.php'; ?>
  <div class="page-wrapper">
    <div id="dashboard" class="view active">
      <?php include __DIR__ . '/pages/dashboard.php'; ?>
    </div>
    <div id="devices" class="view">
      <?php include __DIR__ . '/pages/devices.php'; ?>
    </div>
    <!-- Other views handled by SPA logic -->
  </div>
</main>
<?php
include __DIR__ . '/components/footer.php';
