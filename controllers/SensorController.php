<?php

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/UserDataService.php';

function handleSensorAction(string $action, int $userId, array $body, PDO $db): void {
    if ($action === 'get_sensors') jsonOut(getUserSensors($userId));

    requireCsrf();

    if ($action === 'add_sensor') {
        $name  = trim($body['name'] ?? '');
        $type  = trim($body['type'] ?? 'temperature');
        $topic = trim($body['topic'] ?? '');
        $unit  = trim($body['unit'] ?? '');
        $allowedTypes = ['temperature','humidity','presence','brightness','motion','smoke','gas','air_quality'];
        if (!in_array($type, $allowedTypes, true)) $type = 'temperature';
        if (!$name || !$topic) jsonOut(['error'=>'Nama sensor dan Topic MQTT harus diisi']);
        $iconMap = ['temperature'=>'fa-temperature-half','humidity'=>'fa-droplet','presence'=>'fa-user-check','brightness'=>'fa-sun','motion'=>'fa-person-running','smoke'=>'fa-fire','gas'=>'fa-triangle-exclamation','air_quality'=>'fa-wind'];
        $icon  = $iconMap[$type] ?? 'fa-microchip';
        $key   = 'sensor_' . uniqid();
        $newId = dbInsert("INSERT INTO sensors (user_id,sensor_key,name,type,icon,unit,topic) VALUES (?,?,?,?,?,?,?)", [$userId,$key,$name,$type,$icon,$unit,$topic]);
        addActivityLog($userId, $name, 'Sensor baru ditambahkan', 'User', 'success');
        jsonOut(['success'=>true,'id'=>$newId,'sensor_key'=>$key,'message'=>'Sensor berhasil disimpan']);
    }

    if ($action === 'update_sensor') {
        $senId = (int)($body['id'] ?? 0);
        $name  = trim($body['name'] ?? '');
        $topic = trim($body['topic'] ?? '');
        $unit  = trim($body['unit'] ?? '');
        $type  = trim($body['type'] ?? 'temperature');
        $allowedTypes = ['temperature','humidity','air_quality','presence','brightness','motion','smoke','gas'];
        if (!$senId || !$name || !$topic || !in_array($type, $allowedTypes, true)) jsonOut(['success'=>false,'error'=>'Data input tidak lengkap']);
        $stmt = $db->prepare("SELECT id FROM sensors WHERE id=? AND user_id=?");
        $stmt->execute([$senId,$userId]);
        if (!$stmt->fetch()) jsonOut(['success'=>false,'error'=>'Sensor tidak ditemukan']);
        $typeIcons = ['temperature'=>'fa-temperature-half','humidity'=>'fa-droplet','air_quality'=>'fa-wind','presence'=>'fa-user-check','brightness'=>'fa-sun','motion'=>'fa-person-running','smoke'=>'fa-fire','gas'=>'fa-triangle-exclamation'];
        $icon = $typeIcons[$type] ?? 'fa-microchip';
        dbWrite("UPDATE sensors SET name=?,type=?,icon=?,unit=?,topic=? WHERE id=? AND user_id=?", [$name,$type,$icon,$unit,$topic,$senId,$userId]);
        addActivityLog($userId, $name, 'Konfigurasi sensor diperbarui', 'User', 'info');
        jsonOut(['success'=>true,'message'=>'Sensor berhasil diperbarui']);
    }

    if ($action === 'delete_sensor') {
        $senId = (int)($body['id'] ?? 0);
        $stmt  = $db->prepare("SELECT name FROM sensors WHERE id=? AND user_id=?");
        $stmt->execute([$senId,$userId]);
        $sen = $stmt->fetch();
        if ($sen) {
            dbWrite("DELETE FROM sensors WHERE id=? AND user_id=?", [$senId,$userId]);
            addActivityLog($userId, $sen['name'], 'Sensor telah dihapus', 'User', 'warning');
        }
        jsonOut(['success'=>true,'message'=>'Sensor berhasil dihapus']);
    }

    if ($action === 'update_sensor_value') {
        $senId = (int)($body['id'] ?? 0);
        $val   = $body['value'] ?? null;
        if (!$senId || $val===null) jsonOut(['success'=>false,'error'=>'Parameter data tidak valid']);
        $stmt = $db->prepare("SELECT id FROM sensors WHERE id=? AND user_id=?");
        $stmt->execute([$senId,$userId]);
        if (!$stmt->fetch()) jsonOut(['success'=>false,'error'=>'Sensor tidak ditemukan']);
        dbWrite("UPDATE sensors SET latest_value=?,last_seen=NOW() WHERE id=?", [(string)$val,$senId]);
        $s2 = $db->prepare("SELECT recorded_at FROM sensor_readings WHERE sensor_id=? ORDER BY recorded_at DESC LIMIT 1");
        $s2->execute([$senId]);
        $lastRead = $s2->fetchColumn();
        $lastTs   = ($lastRead && strtotime($lastRead)) ? strtotime($lastRead) : 0;
        if ($lastTs===0 || (time()-$lastTs)>=10) dbInsert("INSERT INTO sensor_readings (sensor_id,value) VALUES (?,?)", [$senId,(float)$val]);
        jsonOut(['success'=>true]);
    }

    if ($action === 'get_sensor_readings') {
        $senId = (int)($_GET['sensor_id'] ?? 0);
        $limit = max(1, min((int)($_GET['limit'] ?? 30), 500));
        if (!$senId) jsonOut([]);
        $stmt = $db->prepare("SELECT sr.value,sr.recorded_at FROM sensor_readings sr JOIN sensors s ON s.id=sr.sensor_id WHERE sr.sensor_id=? AND s.user_id=? ORDER BY sr.recorded_at DESC LIMIT ?");
        $stmt->execute([$senId,$userId,$limit]);
        jsonOut(array_reverse($stmt->fetchAll()));
    }
}
