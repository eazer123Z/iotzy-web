<?php

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/UserDataService.php';

function handleSettingsAction(string $action, int $userId, array $body, PDO $db): void {
    if ($action === 'get_settings') jsonOut(getUserSettings($userId));
    if ($action === 'get_mqtt_templates') {
        $stmt = $db->query("SELECT name, slug, broker, port, use_ssl, username, path, description FROM mqtt_templates ORDER BY id ASC");
        jsonOut(['success' => true, 'templates' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    if ($action === 'save_settings') {
        requireCsrf();
        $mqttDefaults = [
            'mqtt_broker'  => getenv('MQTT_HOST') ?: 'broker.hivemq.com',
            'mqtt_port'    => (int)(getenv('MQTT_PORT') ?: 8884),
            'mqtt_use_ssl' => (getenv('MQTT_USE_SSL') === 'true' || getenv('MQTT_USE_SSL') === '1') ? 1 : 0,
        ];
        dbWrite(
            "INSERT IGNORE INTO user_settings (user_id, mqtt_broker, mqtt_port, mqtt_use_ssl) VALUES (?, ?, ?, ?)",
            [$userId, $mqttDefaults['mqtt_broker'], $mqttDefaults['mqtt_port'], $mqttDefaults['mqtt_use_ssl']]
        );
        $fieldCasters = [
            'mqtt_broker'           => fn($v)=>substr(trim((string)$v),0,200),
            'mqtt_port'             => fn($v)=>max(1,min(65535,(int)$v)),
            'mqtt_client_id'        => fn($v)=>substr(trim((string)$v),0,100),
            'mqtt_path'             => fn($v)=>substr(trim((string)$v),0,100),
            'mqtt_use_ssl'          => fn($v)=>(int)(bool)$v,
            'mqtt_username'         => fn($v)=>substr(trim((string)$v),0,100),
            'telegram_chat_id'      => fn($v)=>substr(trim((string)$v),0,100),
            'automation_lamp'       => fn($v)=>(int)(bool)$v,
            'automation_fan'        => fn($v)=>(int)(bool)$v,
            'automation_lock'       => fn($v)=>(int)(bool)$v,
            'lamp_on_threshold'     => fn($v)=>max(0.0,min(1.0,(float)$v)),
            'lamp_off_threshold'    => fn($v)=>max(0.0,min(1.0,(float)$v)),
            'fan_temp_high'         => fn($v)=>max(-50.0,min(100.0,(float)$v)),
            'fan_temp_normal'       => fn($v)=>max(-50.0,min(100.0,(float)$v)),
            'lock_delay'            => fn($v)=>max(0,min(60000,(int)$v)),
            'theme'                 => fn($v)=>in_array((string)$v,['light','dark'],true)?(string)$v:'light',
            'quick_control_devices' => fn($v)=>json_encode(array_values(array_filter((array)$v,fn($id)=>is_numeric($id)))),
        ];
        if (isset($body['mqtt_password']) && $body['mqtt_password']!=='') {
            dbWrite("UPDATE user_settings SET mqtt_password_enc=? WHERE user_id=?", [encryptSecret((string)$body['mqtt_password']),$userId]);
        }
        $sets=[]; $vals=[];
        foreach ($fieldCasters as $field=>$caster) {
            if (array_key_exists($field,$body)) { $sets[]="$field=?"; $vals[]=$caster($body[$field]); }
        }
        if ($sets) { $vals[]=$userId; dbWrite("UPDATE user_settings SET ".implode(',',$sets)." WHERE user_id=?", $vals); }
        jsonOut(['success'=>true,'message'=>'Pengaturan berhasil disimpan']);
    }
}
