<?php

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/UserDataService.php';

function handleDashboardAction(string $action, int $userId, array $body, PDO $db): void
{
    if ($action !== 'get_dashboard_data') {
        return;
    }

    try {
        $cameraBundle = getUserCameraBundle($userId, $db);
        $analytics = getDailyAnalyticsSummary($userId, date('Y-m-d'), $db);

        jsonOut([
            'success' => true,
            'devices' => getUserDevices($userId),
            'sensors' => getUserSensors($userId),
            'cv_state' => $cameraBundle['cv_state'] ?? iotzyDefaultCvState(),
            'camera' => $cameraBundle['camera'] ?? null,
            'camera_settings' => $cameraBundle['camera_settings'] ?? [],
            'analytics_summary' => $analytics['summary'] ?? [],
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        jsonOut([
            'success' => false,
            'error' => 'Database error: ' . $e->getMessage(),
        ], 500);
    }
}
