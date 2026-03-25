<?php
/**
 * controllers/AutomationController.php
 * ───
 * Otak dari sistem otomasi IoTzy. Mengelola aturan berbasis sensor (trigger),
 * penjadwalan waktu (schedules), dan template otomasi cepat.
 */

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/UserDataService.php'; // Updated include path

function handleAutomationAction(string $action, int $userId, array $body, PDO $db): void {

    // ── AUTOMATION RULES ──

    if ($action === 'get_automation_rules') {
        $stmt = $db->prepare("SELECT ar.*,s.name AS sensor_name,s.type AS sensor_type,s.unit AS sensor_unit,d.name AS device_name,d.icon AS device_icon FROM automation_rules ar LEFT JOIN sensors s ON s.id=ar.sensor_id JOIN devices d ON d.id=ar.device_id WHERE ar.user_id=? ORDER BY ar.created_at ASC");
        $stmt->execute([$userId]);
        $grouped = [];
        foreach ($stmt->fetchAll() as $r) {
            $sid = $r['sensor_id'] ? (string)$r['sensor_id'] : 'device_'.$r['device_id'];
            $grouped[$sid][] = [
                'ruleId'=>'db_'.$r['id'],'dbId'=>(int)$r['id'],
                'sensorId'=>$r['sensor_id'] ? (int)$r['sensor_id'] : null,
                'condition'=>$r['condition_type'],
                'threshold'=>$r['threshold']!==null?(float)$r['threshold']:null,
                'thresholdMin'=>$r['threshold_min']!==null?(float)$r['threshold_min']:null,
                'thresholdMax'=>$r['threshold_max']!==null?(float)$r['threshold_max']:null,
                'deviceId'=>(string)$r['device_id'],'action'=>$r['action'],
                'delay'=>(int)$r['delay_ms'],'startTime'=>$r['start_time'],'endTime'=>$r['end_time'],
                'days'=>json_decode($r['days']??'[]',true)??[],
                'enabled'=>(bool)$r['is_enabled'],'fromTemplate'=>$r['from_template'],
            ];
        }
        jsonOut($grouped);
    }

    if ($action === 'add_automation_rule') {
        $senId = (int)($body['sensor_id'] ?? 0);
        $devId = (int)($body['device_id'] ?? 0);
        $cond  = trim($body['condition'] ?? '');
        $act   = trim($body['action'] ?? 'on');
        $delay = max(0,(int)($body['delay'] ?? 0));
        $tpl   = trim($body['from_template'] ?? '');
        $allowedConds   = ['gt','lt','range','detected','absent','time_only'];
        $allowedActions = ['on','off','speed_high','speed_mid','speed_low','toggle'];
        if (!$devId || !in_array($cond,$allowedConds,true)) jsonOut(['success'=>false,'message'=>'Konfigurasi aturan tidak valid']);
        if ($cond!=='time_only' && !$senId) jsonOut(['success'=>false,'message'=>'Tentukan sensor sebagai pemicu']);
        if (!in_array($act,$allowedActions,true)) $act='on';
        if ($senId) {
            $s=$db->prepare("SELECT id FROM sensors WHERE id=? AND user_id=?"); $s->execute([$senId,$userId]);
            if (!$s->fetch()) jsonOut(['success'=>false,'message'=>'Sensor tidak terdaftar']);
        }
        $d=$db->prepare("SELECT id FROM devices WHERE id=? AND user_id=?"); $d->execute([$devId,$userId]);
        if (!$d->fetch()) jsonOut(['success'=>false,'message'=>'Perangkat tidak terdaftar']);
        $threshold    = isset($body['threshold'])     ? (float)$body['threshold']     : null;
        $thresholdMin = isset($body['threshold_min']) ? (float)$body['threshold_min'] : null;
        $thresholdMax = isset($body['threshold_max']) ? (float)$body['threshold_max'] : null;
        $days         = isset($body['days'])          ? json_encode($body['days'])    : null;
        $startTime    = $body['start_time'] ? trim($body['start_time']) : null;
        $endTime      = $body['end_time']   ? trim($body['end_time'])   : null;
        if ($cond==='range' && $thresholdMin!==null && $thresholdMax!==null && $thresholdMin>=$thresholdMax)
            jsonOut(['success'=>false,'message'=>'Batas minimal harus lebih kecil dari maksimal']);
        $newId = dbInsert("INSERT INTO automation_rules (user_id,sensor_id,device_id,condition_type,threshold,threshold_min,threshold_max,action,delay_ms,start_time,end_time,days,from_template) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", [$userId,$senId?:null,$devId,$cond,$threshold,$thresholdMin,$thresholdMax,$act,$delay,$startTime,$endTime,$days,$tpl?:null]);
        addActivityLog($userId,'Otomasi','Aturan baru berhasil dibuat','User','success');
        jsonOut(['success'=>true,'id'=>$newId,'rule_id'=>'db_'.$newId,'message'=>'Aturan berhasil ditambahkan']);
    }

    if ($action === 'update_automation_rule') {
        $ruleId  = (int)($body['id'] ?? 0);
        $enabled = isset($body['is_enabled']) ? (int)(bool)$body['is_enabled'] : null;
        $stmt = $db->prepare("SELECT id FROM automation_rules WHERE id=? AND user_id=?");
        $stmt->execute([$ruleId,$userId]);
        if (!$stmt->fetch()) jsonOut(['success'=>false,'error'=>'Aturan tidak ditemukan']);
        if ($enabled!==null) dbWrite("UPDATE automation_rules SET is_enabled=? WHERE id=?", [$enabled,$ruleId]);
        jsonOut(['success'=>true,'message'=>'Status aturan berhasil diubah']);
    }

    if ($action === 'delete_automation_rule') {
        $ruleId = (int)($body['id'] ?? 0);
        $stmt = $db->prepare("SELECT id FROM automation_rules WHERE id=? AND user_id=?");
        $stmt->execute([$ruleId,$userId]);
        if ($stmt->fetch()) {
            dbWrite("DELETE FROM automation_rules WHERE id=? AND user_id=?", [$ruleId,$userId]);
            addActivityLog($userId,'Otomasi','Aturan telah dihapus','User','warning');
        }
        jsonOut(['success'=>true,'message'=>'Aturan berhasil dihapus']);
    }

    // ── SCHEDULES ──

    if ($action === 'get_schedules') {
        $stmt = $db->prepare("SELECT * FROM schedules WHERE user_id=? ORDER BY time_hhmm ASC");
        $stmt->execute([$userId]);
        jsonOut(array_map(fn($r)=>[
            'id'=>(int)$r['id'],'label'=>$r['label'],'time'=>$r['time_hhmm'],
            'days'=>json_decode($r['days']??'[]',true)??[],
            'action'=>$r['action'],
            'devices'=>json_decode($r['devices']??'[]',true)??[],
            'enabled'=>(bool)$r['is_enabled'],'created_at'=>$r['created_at'],
        ], $stmt->fetchAll()));
    }

    if ($action === 'add_schedule') {
        $time    = trim($body['time'] ?? '');
        $days    = $body['days'] ?? [];
        $devices = $body['devices'] ?? [];
        $act     = trim($body['action'] ?? 'on');
        $label   = trim($body['label'] ?? '');
        if (!preg_match('/^\d{2}:\d{2}$/',$time)) jsonOut(['success'=>false,'error'=>'Format waktu harus HH:MM']);
        if (empty($devices)) jsonOut(['success'=>false,'error'=>'Pilih minimal satu perangkat']);
        if (!in_array($act,['on','off','toggle'],true)) $act='on';
        $days    = array_values(array_filter((array)$days,    fn($v)=>is_string($v)||is_int($v)));
        $devices = array_values(array_filter((array)$devices, fn($v)=>is_numeric($v)));
        $newId = dbInsert("INSERT INTO schedules (user_id,label,time_hhmm,days,action,devices) VALUES (?,?,?,?,?,?)", [$userId,$label?:null,$time,json_encode($days),$act,json_encode($devices)]);
        addActivityLog($userId,'Jadwal','Penjadwalan baru: '.$time,'User','success');
        jsonOut(['success'=>true,'id'=>$newId,'message'=>'Jadwal berhasil disimpan']);
    }

    if ($action === 'toggle_schedule') {
        $schedId = (int)($body['id'] ?? 0);
        $enabled = (int)(bool)($body['enabled'] ?? false);
        $stmt = $db->prepare("SELECT id FROM schedules WHERE id=? AND user_id=?");
        $stmt->execute([$schedId,$userId]);
        if (!$stmt->fetch()) jsonOut(['success'=>false,'error'=>'Jadwal tidak ditemukan']);
        dbWrite("UPDATE schedules SET is_enabled=? WHERE id=?", [$enabled,$schedId]);
        jsonOut(['success'=>true]);
    }

    if ($action === 'delete_schedule') {
        $schedId = (int)($body['id'] ?? 0);
        $stmt = $db->prepare("SELECT id FROM schedules WHERE id=? AND user_id=?");
        $stmt->execute([$schedId,$userId]);
        if ($stmt->fetch()) dbWrite("DELETE FROM schedules WHERE id=? AND user_id=?", [$schedId,$userId]);
        jsonOut(['success'=>true]);
    }
}
