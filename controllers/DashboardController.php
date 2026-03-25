<?php
function handleDashboardAction($action, $userId, $body, $db) {
    if ($action === 'get_dashboard_data') {
        // Fetch devices (dari DeviceController logic)
        $stmt = $db->prepare("SELECT id, name, type, icon, topic_sub, topic_pub, last_state, latest_state, is_online FROM devices WHERE user_id = ? ORDER BY created_at ASC");
        $stmt->execute([$userId]);
        $devices = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch sensors
        $stmt2 = $db->prepare("SELECT id, name, type, unit, icon, topic, latest_value, last_updated FROM sensors WHERE user_id = ? ORDER BY created_at ASC");
        $stmt2->execute([$userId]);
        $sensors = $stmt2->fetchAll(PDO::FETCH_ASSOC);

        // Fetch cv_state
        $stmt3 = $db->prepare("SELECT person_count, brightness, light_condition, is_active FROM cv_state WHERE user_id = ?");
        $stmt3->execute([$userId]);
        $cv_state = $stmt3->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'devices' => $devices,
            'sensors' => $sensors,
            'cv_state' => $cv_state ?: ['person_count' => 0, 'brightness' => 0, 'light_condition' => 'unknown', 'is_active' => 0]
        ]);
        exit;
    }
}
