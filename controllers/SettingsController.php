<?php
/**
 * controllers/SettingsController.php — User Settings
 */

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../services/UserDataService.php';

function handleSettingsAction(string $action, int $userId, array $body, PDO $db): void {
    if ($action === 'get_settings') jsonOut(getUserSettings($userId));

    if ($action === 'save_settings') {
        dbWrite("INSERT IGNORE INTO user_settings (user_id) VALUES (?)", [$userId]);
        $fieldCasters = [
            'mqtt_broker'           => fn($v)=>substr(trim((string)$v),0,200),
            'mqtt_port'             => fn($v)=>max(1,min(65535,(int)$v)),
            'mqtt_client_id'        => fn($v)=>substr(trim((string)$v),0,100),
            'mqtt_path'             => fn($v)=>substr(trim((string)$v),0,100),
            'mqtt_use_ssl'          => fn($v)=>(int)(bool)$v,
            'mqtt_username'         => fn($v)=>substr(trim((string)$v),0,100),
            'telegram_chat_id'      => fn($v)=>substr(trim((string)$v),0,100),
            'telegram_bot_token'    => fn($v)=>substr(trim((string)$v),0,255),
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
