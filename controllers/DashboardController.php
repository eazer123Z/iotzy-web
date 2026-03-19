<?php

require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../services/UserDataService.php';

class DashboardController {

    public function index() {
        $user     = getCurrentUser();
        $settings = getUserSettings($user['id']);
        $devices  = getUserDevices($user['id']);
        $sensors  = getUserSensors($user['id']);

        // Remove sensitive fields from settings if any
        $safeSettings = $settings;

        // Assemble layout
        include __DIR__ . '/../views/layouts/header.php';
        include __DIR__ . '/../views/layouts/sidebar.php';
        include __DIR__ . '/../views/layouts/topbar.php';

        // Page views
        include __DIR__ . '/../views/pages/dashboard.php';
        include __DIR__ . '/../views/pages/devices.php';
        include __DIR__ . '/../views/pages/sensors.php';
        include __DIR__ . '/../views/pages/automation.php';
        include __DIR__ . '/../views/pages/camera.php';
        include __DIR__ . '/../views/pages/analytics.php';
        include __DIR__ . '/../views/pages/settings.php';

        // Close layout + modals + scripts
        include __DIR__ . '/../views/layouts/bottom-nav.php';
        include __DIR__ . '/../views/modals/all-modals.php';
        include __DIR__ . '/../views/layouts/footer.php';
    }
}
