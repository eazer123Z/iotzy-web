<?php

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/UserDataService.php';

function handleCVAction(string $action, int $userId, array $body, PDO $db): void
{
    $defRules = iotzyDefaultCvRules();

    $bundle = getUserCameraBundle($userId, $db);
    $cameraId = (int)($bundle['camera']['id'] ?? 0);

    if ($action === 'get_cv_rules') {
        $rules = array_replace_recursive($defRules, iotzyJsonDecode($bundle['camera_settings']['cv_rules'] ?? null, []));
        jsonOut($rules);
    }

    if ($action === 'save_cv_rules') {
        requireCsrf();
        $rules = $body['rules'] ?? null;
        if (!$rules || !is_array($rules) || $cameraId <= 0) {
            jsonOut(['success' => false, 'error' => 'Data tidak valid']);
        }

        $savedRules = iotzyPersistCvRules($db, $userId, $cameraId, $rules);
        jsonOut(['success' => true, 'rules' => $savedRules]);
    }

    if ($action === 'get_cv_config') {
        $config = iotzyNormalizeCvConfigFlat($bundle['camera_settings'] ?? []);
        jsonOut($config);
    }

    if ($action === 'save_cv_config') {
        requireCsrf();
        $config = $body['config'] ?? null;
        if (!$config || !is_array($config) || $cameraId <= 0) {
            jsonOut(['success' => false, 'error' => 'Data tidak valid']);
        }

        $savedConfig = iotzyPersistCvConfig(
            $db,
            $userId,
            $cameraId,
            $config,
            getUserSettings($userId) ?? [],
            $bundle['camera_settings'] ?? []
        );

        jsonOut(['success' => true, 'config' => $savedConfig]);
    }
}
