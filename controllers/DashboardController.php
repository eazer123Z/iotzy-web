<?php

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/UserDataService.php';

function handleDashboardAction(string $action, int $userId, array $body, PDO $db): void
{
    if ($action !== 'get_dashboard_data') {
        return;
    }

    try {
        $includeAnalytics = array_key_exists('include_analytics', $body) ? (bool)$body['include_analytics'] : true;
        $includeCameraSettings = array_key_exists('include_camera_settings', $body) ? (bool)$body['include_camera_settings'] : true;
        $includeCamera = array_key_exists('include_camera', $body) ? (bool)$body['include_camera'] : true;

        $cameraBundle = ($includeCamera || $includeCameraSettings)
            ? getUserCameraBundle($userId, $db, $body)
            : ['cv_state' => iotzyDefaultCvState()];
        $devices = getUserDevices($userId, $db);
        $sensors = getUserSensors($userId, $db);
        $analytics = $includeAnalytics
            ? getDailyAnalyticsHeadlineSummary($userId, date('Y-m-d'), $db, $devices, $sensors)
            : null;

        jsonOut([
            'success' => true,
            'devices' => array_map('iotzyBuildDeviceClientPayload', $devices),
            'sensors' => array_map('iotzyBuildSensorClientPayload', $sensors),
            'cv_state' => $cameraBundle['cv_state'] ?? iotzyDefaultCvState(),
            'camera' => $includeCamera ? ($cameraBundle['camera'] ?? null) : null,
            'camera_settings' => $includeCameraSettings ? ($cameraBundle['camera_settings'] ?? []) : null,
            'analytics_summary' => $analytics['summary'] ?? null,
        ]);
    } catch (PDOException $e) {
        error_log('[IoTzy Dashboard] ' . $e->getMessage());
        jsonOut([
            'success' => false,
            'error' => 'Gagal memuat data dashboard',
        ], 500);
    }
}
