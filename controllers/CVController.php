<?php

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/UserDataService.php';

function handleCVAction(string $action, int $userId, array $body, PDO $db): void
{
    $defRules = [
        'human' => ['enabled' => true, 'onDetect' => [], 'onAbsent' => [], 'delay' => 5000],
        'light' => ['enabled' => true, 'onDark' => [], 'onBright' => [], 'delay' => 2000],
    ];

    $bundle = getUserCameraBundle($userId, $db);
    $cameraId = (int)($bundle['camera']['id'] ?? 0);

    if ($action === 'get_cv_rules') {
        $rules = iotzyJsonDecode($bundle['camera_settings']['cv_rules'] ?? null, $defRules);
        jsonOut($rules ?: $defRules);
    }

    if ($action === 'save_cv_rules') {
        requireCsrf();
        $rules = $body['rules'] ?? null;
        if (!$rules || !is_array($rules) || $cameraId <= 0) {
            jsonOut(['success' => false, 'error' => 'Data tidak valid']);
        }

        $json = json_encode($rules, JSON_UNESCAPED_UNICODE);
        dbWrite("UPDATE camera_settings SET cv_rules = ? WHERE camera_id = ?", [$json, $cameraId]);
        dbWrite("UPDATE user_settings SET cv_rules = ? WHERE user_id = ?", [$json, $userId]);
        jsonOut(['success' => true]);
    }

    if ($action === 'get_cv_config') {
        $settings = $bundle['camera_settings'] ?? [];
        $config = [
            'showBoundingBox' => isset($settings['show_bounding_box']) ? (bool)$settings['show_bounding_box'] : true,
            'showDebugInfo' => isset($settings['show_debug_info']) ? (bool)$settings['show_debug_info'] : true,
            'minConfidence' => isset($settings['min_confidence']) ? (float)$settings['min_confidence'] : 0.6,
            'darkThreshold' => isset($settings['dark_threshold']) ? (float)$settings['dark_threshold'] : 0.3,
            'brightThreshold' => isset($settings['bright_threshold']) ? (float)$settings['bright_threshold'] : 0.7,
            'humanEnabled' => isset($settings['human_rules_enabled']) ? (bool)$settings['human_rules_enabled'] : true,
            'lightEnabled' => isset($settings['light_rules_enabled']) ? (bool)$settings['light_rules_enabled'] : true,
        ];
        jsonOut($config);
    }

    if ($action === 'save_cv_config') {
        requireCsrf();
        $config = $body['config'] ?? null;
        if (!$config || !is_array($config) || $cameraId <= 0) {
            jsonOut(['success' => false, 'error' => 'Data tidak valid']);
        }

        $showBoundingBox = array_key_exists('showBoundingBox', $config) ? (int)(bool)$config['showBoundingBox'] : null;
        $showDebugInfo = array_key_exists('showDebugInfo', $config) ? (int)(bool)$config['showDebugInfo'] : null;
        $minConfidence = array_key_exists('minConfidence', $config) ? max(0.1, min(0.99, (float)$config['minConfidence'])) : null;
        $darkThreshold = array_key_exists('darkThreshold', $config) ? max(0.01, min(0.99, (float)$config['darkThreshold'])) : null;
        $brightThreshold = array_key_exists('brightThreshold', $config) ? max(0.01, min(0.99, (float)$config['brightThreshold'])) : null;
        $humanEnabled = array_key_exists('humanEnabled', $config) ? (int)(bool)$config['humanEnabled'] : null;
        $lightEnabled = array_key_exists('lightEnabled', $config) ? (int)(bool)$config['lightEnabled'] : null;

        dbWrite(
            "UPDATE camera_settings
             SET show_bounding_box = COALESCE(?, show_bounding_box),
                 show_debug_info = COALESCE(?, show_debug_info),
                 min_confidence = COALESCE(?, min_confidence),
                 dark_threshold = COALESCE(?, dark_threshold),
                 bright_threshold = COALESCE(?, bright_threshold),
                 human_rules_enabled = COALESCE(?, human_rules_enabled),
                 light_rules_enabled = COALESCE(?, light_rules_enabled)
             WHERE camera_id = ?",
            [
                $showBoundingBox,
                $showDebugInfo,
                $minConfidence,
                $darkThreshold,
                $brightThreshold,
                $humanEnabled,
                $lightEnabled,
                $cameraId,
            ]
        );

        dbWrite(
            "UPDATE user_settings
             SET cv_min_confidence = COALESCE(?, cv_min_confidence),
                 cv_dark_threshold = COALESCE(?, cv_dark_threshold),
                 cv_bright_threshold = COALESCE(?, cv_bright_threshold),
                 cv_human_rules_enabled = COALESCE(?, cv_human_rules_enabled),
                 cv_light_rules_enabled = COALESCE(?, cv_light_rules_enabled)
             WHERE user_id = ?",
            [$minConfidence, $darkThreshold, $brightThreshold, $humanEnabled, $lightEnabled, $userId]
        );

        jsonOut(['success' => true]);
    }
}
