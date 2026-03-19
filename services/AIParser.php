<?php
/**
 * services/AIParser.php — AI Natural Language Processor
 *
 * Dari: includes/ai_parser.php (339 baris)
 * Fungsionalitas: parse perintah user → JSON AI actions → execute
 */

require_once __DIR__ . '/../core/bootstrap.php';

if (!defined('AI_TIMEOUT_SECONDS'))
    define('AI_TIMEOUT_SECONDS', 120);
if (!defined('AI_CONNECT_TIMEOUT'))
    define('AI_CONNECT_TIMEOUT', 15);
if (!defined('AI_MAX_RETRIES'))
    define('AI_MAX_RETRIES', 3);
if (!defined('AI_RETRY_DELAY_MS'))
    define('AI_RETRY_DELAY_MS', 1000);
if (!defined('AI_MAX_TOKENS'))
    define('AI_MAX_TOKENS', 8000);
if (!defined('AI_HISTORY_KEEP'))
    define('AI_HISTORY_KEEP', 60);
if (!defined('AI_HISTORY_SEND'))
    define('AI_HISTORY_SEND', 10);
if (!defined('AI_MODEL'))
    define('AI_MODEL', 'openai/gpt-4o-mini');

function iotzy_collect_full_context(int $userId, PDO $db): array
{
    $ctx = [];
    $stmt = $db->prepare("SELECT u.id,u.username,u.email,u.full_name,u.role,u.is_active,u.last_login,u.created_at,us.mqtt_broker,us.mqtt_port,us.mqtt_use_ssl,us.mqtt_username,us.mqtt_client_id,us.mqtt_path,us.telegram_chat_id,us.automation_lamp,us.automation_fan,us.automation_lock,us.lamp_on_threshold,us.lamp_off_threshold,us.fan_temp_high,us.fan_temp_normal,us.lock_delay,us.theme,us.quick_control_devices,us.cv_rules,us.cv_config FROM users u LEFT JOIN user_settings us ON us.user_id=u.id WHERE u.id=?");
    $stmt->execute([$userId]);
    $ctx['user'] = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $stmt = $db->prepare("SELECT id,name,type,icon,device_key,topic_sub,topic_pub,is_active,last_state,latest_state,last_seen,last_state_changed FROM devices WHERE user_id=? ORDER BY name");
    $stmt->execute([$userId]);
    $ctx['devices'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $stmt = $db->prepare("SELECT id,name,type,icon,sensor_key,unit,topic,latest_value,last_seen FROM sensors WHERE user_id=? ORDER BY name");
    $stmt->execute([$userId]);
    $ctx['sensors'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $stmt = $db->prepare("SELECT sr.sensor_id,s.name sensor_name,s.unit,ROUND(AVG(sr.value),2) avg_val,ROUND(MIN(sr.value),2) min_val,ROUND(MAX(sr.value),2) max_val,COUNT(*) total_readings FROM sensor_readings sr JOIN sensors s ON s.id=sr.sensor_id WHERE s.user_id=? AND sr.recorded_at >= NOW() - INTERVAL '1 hour' GROUP BY sr.sensor_id,s.name,s.unit");
    $stmt->execute([$userId]);
    $ctx['sensor_summary_1h'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $stmt = $db->prepare("SELECT ar.id,ar.condition_type,ar.threshold,ar.threshold_min,ar.threshold_max,ar.action,ar.delay_ms,ar.is_enabled,ar.start_time,ar.end_time,ar.days,ar.from_template,s.name sensor_name,s.type sensor_type,s.unit,d.name device_name,d.id device_id,d.type device_type,d.is_active device_is_active FROM automation_rules ar LEFT JOIN sensors s ON s.id=ar.sensor_id JOIN devices d ON d.id=ar.device_id WHERE ar.user_id=? ORDER BY ar.is_enabled DESC,ar.id ASC");
    $stmt->execute([$userId]);
    $ctx['rules'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $stmt = $db->prepare("SELECT id,label,time_hhmm,days,action,devices,is_enabled,created_at FROM schedules WHERE user_id=? ORDER BY time_hhmm");
    $stmt->execute([$userId]);
    $rawSched = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $deviceMap = array_column($ctx['devices'], 'name', 'id');
    foreach ($rawSched as &$sc) {
        $ids = json_decode($sc['devices'] ?? '[]', true);
        $sc['device_names'] = array_values(array_map(fn($id) => $deviceMap[$id] ?? "Device#$id", (array)$ids));
        $sc['days_decoded'] = json_decode($sc['days'] ?? '[]', true);
        $sc['device_ids_raw'] = (array)$ids;
    }
    unset($sc);
    $ctx['schedules'] = $rawSched;
    $stmt = $db->prepare("SELECT d.name device_name,ds.turned_on_at,ds.turned_off_at,ds.duration_seconds,ds.trigger_type FROM device_sessions ds JOIN devices d ON d.id=ds.device_id WHERE ds.user_id=? AND ds.turned_on_at::date = CURRENT_DATE ORDER BY ds.turned_on_at DESC LIMIT 30");
    $stmt->execute([$userId]);
    $ctx['device_sessions_today'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $stmt = $db->prepare("SELECT device_name,activity,trigger_type,log_type,created_at FROM activity_logs WHERE user_id=? ORDER BY created_at DESC LIMIT 25");
    $stmt->execute([$userId]);
    $ctx['activity_logs'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $q = fn($sql) => (function () use ($db, $userId, $sql) {
        $s = $db->prepare($sql);
        $s->execute([$userId]);
        return (int)$s->fetchColumn(); }
    )();
    $ctx['stats'] = ['total_devices' => $q("SELECT COUNT(*) FROM devices WHERE user_id=?"), 'devices_on' => $q("SELECT COUNT(*) FROM devices WHERE user_id=? AND last_state=1 AND is_active=TRUE"), 'devices_off' => $q("SELECT COUNT(*) FROM devices WHERE user_id=? AND last_state=0 AND is_active=TRUE"), 'devices_inactive' => $q("SELECT COUNT(*) FROM devices WHERE user_id=? AND is_active=FALSE"), 'total_sensors' => $q("SELECT COUNT(*) FROM sensors WHERE user_id=?"), 'total_rules' => $q("SELECT COUNT(*) FROM automation_rules WHERE user_id=?"), 'rules_enabled' => $q("SELECT COUNT(*) FROM automation_rules WHERE user_id=? AND is_enabled=TRUE"), 'total_schedules' => $q("SELECT COUNT(*) FROM schedules WHERE user_id=?"), 'schedules_enabled' => $q("SELECT COUNT(*) FROM schedules WHERE user_id=? AND is_enabled=TRUE"), 'logs_today' => $q("SELECT COUNT(*) FROM activity_logs WHERE user_id=? AND created_at::date = CURRENT_DATE")];
    $s = $db->prepare("SELECT COALESCE(SUM(duration_seconds),0) FROM device_sessions WHERE user_id=? AND turned_on_at::date = CURRENT_DATE");
    $s->execute([$userId]);
    $ctx['stats']['total_on_minutes_today'] = round($s->fetchColumn() / 60, 1);
    $stmt = $db->prepare("SELECT ip_address,user_agent,created_at,expires_at FROM sessions WHERE user_id=? AND expires_at>NOW() ORDER BY created_at DESC LIMIT 5");
    $stmt->execute([$userId]);
    $ctx['active_sessions'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return $ctx;
}

function iotzy_format_context(array $ctx): string
{
    $sec = [];
    $u = $ctx['user'];
    $st = $ctx['stats'];
    $DAY = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    $mqtt = $u['mqtt_broker'] ? "{$u['mqtt_broker']}:{$u['mqtt_port']} ssl:" . ($u['mqtt_use_ssl'] ? 'ya' : 'tdk') . ($u['mqtt_username'] ? " user:{$u['mqtt_username']}" : '') . ($u['mqtt_path'] ? " path:{$u['mqtt_path']}" : '') : 'belum-dikonfigurasi';
    $tg = $u['telegram_chat_id'] ? "chat_id:{$u['telegram_chat_id']}" : 'belum-diset';
    $auto = [];
    if ($u['automation_lamp'])
        $auto[] = "lamp(on≤{$u['lamp_on_threshold']} off≥{$u['lamp_off_threshold']})";
    if ($u['automation_fan'])
        $auto[] = "fan(high:{$u['fan_temp_high']}°C normal:{$u['fan_temp_normal']}°C)";
    if ($u['automation_lock'])
        $auto[] = "lock(delay:{$u['lock_delay']}ms)";
    $sec[] = "## AKUN\nNama:{$u['full_name']} | User:{$u['username']} | Role:{$u['role']} | Tema:{$u['theme']}\nMQTT:$mqtt | Telegram:$tg\nAuto-bawaan: " . (empty($auto) ? 'semua-nonaktif' : implode(' | ', $auto));
    $sec[] = "## STATISTIK\nDevice:{$st['total_devices']} (ON:{$st['devices_on']} OFF:{$st['devices_off']}) Sensor:{$st['total_sensors']} Rules:{$st['total_rules']}({$st['rules_enabled']} aktif) Jadwal:{$st['total_schedules']}({$st['schedules_enabled']} aktif) Log:{$st['logs_today']} Nyala:{$st['total_on_minutes_today']}mnt";
    if (!empty($ctx['devices'])) {
        $rows = [];
        foreach ($ctx['devices'] as $d)
            $rows[] = "  ID:{$d['id']} \"{$d['name']}\" " . ($d['is_active'] ? '' : '[OFF]') . ' ' . ($d['last_state'] ? 'ON' : 'OFF');
        $sec[] = "## PERANGKAT\n" . implode("\n", $rows);
    }
    if (!empty($ctx['sensors'])) {
        $sumMap = array_column($ctx['sensor_summary_1h'], null, 'sensor_id');
        $rows = [];
        foreach ($ctx['sensors'] as $s) {
            $val = $s['latest_value'] !== null ? $s['latest_value'] . $s['unit'] : 'N/A';
            $rows[] = "  ID:{$s['id']} \"{$s['name']}\" {$s['type']} val:{$val}";
        }
        $sec[] = "## SENSOR\n" . implode("\n", $rows);
    }
    if (!empty($ctx['rules'])) {
        $rows = [];
        foreach ($ctx['rules'] as $r) {
            $cond = $r['condition_type'];
            $rows[] = "  ID:{$r['id']} {$cond} → \"{$r['device_name']}\" {$r['action']} [" . ($r['is_enabled'] ? 'ON' : 'OFF') . "]";
        }
        $sec[] = "## RULES\n" . implode("\n", $rows);
    }
    if (!empty($ctx['schedules'])) {
        $rows = [];
        foreach ($ctx['schedules'] as $sc)
            $rows[] = "  ID:{$sc['id']} {$sc['time_hhmm']} → " . implode(',', $sc['device_names']) . " {$sc['action']}";
        $sec[] = "## JADWAL\n" . implode("\n", $rows);
    }
    if (!empty($ctx['activity_logs'])) {
        $rows = [];
        foreach (array_slice($ctx['activity_logs'], 0, 10) as $l)
            $rows[] = "  [{$l['log_type']}] " . date('H:i', strtotime($l['created_at'])) . " {$l['device_name']} {$l['activity']}";
        $sec[] = "## LOG\n" . implode("\n", $rows);
    }
    return implode("\n\n", $sec);
}

function iotzy_get_history(int $userId, PDO $db): string
{
    $stmt = $db->prepare("SELECT sender,message,platform FROM ai_chat_history WHERE user_id=? ORDER BY created_at DESC LIMIT " . AI_HISTORY_SEND);
    $stmt->execute([$userId]);
    $rows = array_reverse($stmt->fetchAll(PDO::FETCH_ASSOC));
    if (empty($rows))
        return '';
    return implode("\n", array_map(fn($h) => (($h['platform'] === 'telegram' ? '[T]' : '[W]')) . ' ' . ($h['sender'] === 'user' ? 'U' : 'A') . ": {$h['message']}", $rows));
}

function iotzy_save_message(int $userId, PDO $db, string $sender, string $msg, string $platform = 'web'): void
{
    if (!trim($msg))
        return;
    $db->prepare("INSERT INTO ai_chat_history (user_id,sender,message,platform) VALUES (?,?,?,?)")->execute([$userId, $sender, $msg, $platform]);
    $db->prepare("DELETE FROM ai_chat_history WHERE user_id=? AND id NOT IN (SELECT id FROM ai_chat_history WHERE user_id=? ORDER BY created_at DESC LIMIT " . (int)AI_HISTORY_KEEP . ")")->execute([$userId, $userId]);
}

function iotzy_call_api(string $apiKey, array $payload): array
{
    $lastErr = '';
    for ($i = 1; $i <= AI_MAX_RETRIES + 1; $i++) {
        $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_CONNECTTIMEOUT => AI_CONNECT_TIMEOUT, CURLOPT_TIMEOUT => AI_TIMEOUT_SECONDS, CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $apiKey, 'Content-Type: application/json', 'HTTP-Referer: ' . (defined('APP_URL') ? APP_URL : ''), 'X-Title: ' . (defined('APP_NAME') ? APP_NAME : 'IOTZY')], CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE)]);
        $raw = curl_exec($ch);
        $err = curl_error($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if (!$err && $code === 200) {
            $res = json_decode($raw, true);
            $c = $res['choices'][0]['message']['content'] ?? null;
            if ($c !== null)
                return ['ok' => true, 'content' => $c];
            $lastErr = $res['error']['message'] ?? 'Empty.';
        }
        else
            $lastErr = $err ?: "HTTP $code";
        if ($i <= AI_MAX_RETRIES)
            usleep(AI_RETRY_DELAY_MS * 1000);
    }
    return ['ok' => false, 'error' => $lastErr];
}

function parse_nl_to_action(int $userId, string $command, array $devices = [], array $sensors = [], string $platform = 'web'): array
{
    $apiKey = defined('OPENROUTER_API_KEY') ? OPENROUTER_API_KEY : '';
    if (!$apiKey)
        return ['success' => false, 'error' => 'API key belum dikonfigurasi.'];
    $db = getLocalDB();
    if (!$db)
        return ['success' => false, 'error' => 'Database tidak tersedia.'];
    iotzy_save_message($userId, $db, 'user', $command, $platform);
    $ctx = iotzy_collect_full_context($userId, $db);
    $ctxText = iotzy_format_context($ctx);
    $history = iotzy_get_history($userId, $db);
    $time = date('Y-m-d H:i:s');
    $day = date('l');
    $sysPrompt = <<<PROMPT

Kamu adalah IoTzy Assistant — AI personal cerdas untuk Smart Room "IoTzy". 
Karakter: Ramah, tech-savvy, solutif, dan selalu menjawab dalam Bahasa Indonesia yang natural. 

DATA SISTEM (Gunakan ID untuk kontrol):
$ctxText

WAKTU SEKARANG: $time ($day)
RIWAYAT CHAT: $history

TUGAS: 
1. Berikan respon tekstual (response_text) yang informatif dan mendukung HTML (<b>, <i>, <br>).
2. Jika ada perintah kontrol (nyalakan, matikan, jadwalkan, hapus), masukkan ke array `actions`.
3. Gunakan ID internal dari data sistem untuk setiap aksi.
4. Jika user bertanya di luar konteks IoTzy, jawab: "Maaf, saya hanya ahli dalam mengelola Smart Room IoTzy Anda 😄"

OUTPUT WAJIB JSON MURNI:
{"response_text":"...","intent":"...","ui_action":"...","actions":[]}

Intent: kontrol_device, cek_sensor, buat_rule, jadwal, hapus, navigasi, info, sapaan.
UI_Action: navigate_dashboard|navigate_devices|navigate_sensors|navigate_automation|navigate_settings|refresh|none
Actions Format: 
- {"type":"immediate","action":"on|off|toggle","device_ids":[ID]}
- {"type":"automation","sensor_id":ID,"condition_type":"gt|lt|between","threshold":X,"action":"on|off","device_ids":[ID]}
- {"type":"delete_device|delete_sensor|delete_rule","device_id|sensor_id|rule_id":ID}
PROMPT;
    $res = iotzy_call_api($apiKey, ['model' => AI_MODEL, 'messages' => [['role' => 'system', 'content' => $sysPrompt], ['role' => 'user', 'content' => $command]], 'temperature' => 0.1, 'max_tokens' => AI_MAX_TOKENS]);
    if (!$res['ok']) {
        $msg = "Koneksi AI sibuk, coba lagi ya! 🔄";
        iotzy_save_message($userId, $db, 'bot', $msg, $platform);
        return ['success' => false, 'error' => $msg];
    }
    $raw = trim($res['content']);
    $raw = preg_replace(['/^```json\s*/i', '/^```\s*/i', '/```\s*$/s'], '', $raw);
    $raw = trim($raw);
    $json = json_decode($raw, true);
    if (!$json || json_last_error() !== JSON_ERROR_NONE) {
        if (preg_match('/(\{[\s\S]*\})/u', $raw, $m))
            $json = json_decode($m[1], true);
    }
    if (!$json || json_last_error() !== JSON_ERROR_NONE) {
        $json = json_decode(preg_replace(['/,\s*}/', '/,\s*]/'], ['}', ']'], $raw), true);
    }
    if (!$json || json_last_error() !== JSON_ERROR_NONE) {
        $msg = "Gagal memproses jawaban AI. Coba kirim ulang ya 😊";
        iotzy_save_message($userId, $db, 'bot', $msg);
        return ['success' => false, 'error' => $msg];
    }
    $json['response_text'] = $json['response_text'] ?? 'Siap!';
    $json['intent'] = $json['intent'] ?? 'info';
    $json['ui_action'] = $json['ui_action'] ?? 'none';
    $json['actions'] = $json['actions'] ?? [];
    iotzy_save_message($userId, $db, 'bot', $json['response_text'], $platform);
    return ['success' => true, 'data' => $json];
}

function execute_ai_actions(int $userId, array $parsed): array
{
    $result = ['success' => true, 'executed' => [], 'errors' => []];
    if (empty($parsed['actions']))
        return $result;
    $db = getLocalDB();
    if (!$db)
        return ['success' => false, 'errors' => ['DB error.']];
    foreach ($parsed['actions'] as $a) {
        $type = $a['type'] ?? '';
        try {
            switch ($type) {
                case 'immediate':
                    foreach ((array)($a['device_ids'] ?? []) as $id) {
                        if ($a['action'] === 'toggle')
                            $db->prepare("UPDATE devices SET last_state=1-last_state,latest_state=1-last_state,last_seen=NOW() WHERE id=? AND user_id=?")->execute([$id, $userId]);
                        else {
                            $v = $a['action'] === 'on' ? 1 : 0;
                            $db->prepare("UPDATE devices SET last_state=?,latest_state=?,last_seen=NOW() WHERE id=? AND user_id=?")->execute([$v, $v, $id, $userId]);
                        }
                    }
                    $result['executed'][] = 'immediate';
                    break;
                case 'schedule':
                    $db->prepare("INSERT INTO schedules (user_id,label,time_hhmm,days,action,devices) VALUES (?,?,?,?,?,?)")->execute([$userId, $a['label'] ?? 'AI', $a['time'] ?? '00:00', json_encode($a['days'] ?? [0, 1, 2, 3, 4, 5, 6]), $a['action'] ?? 'on', json_encode($a['device_ids'] ?? [])]);
                    $result['executed'][] = 'schedule';
                    break;
                case 'automation':
                    $stmt = $db->prepare("INSERT INTO automation_rules (user_id,sensor_id,device_id,condition_type,threshold,threshold_min,threshold_max,action,delay_ms,start_time,end_time,days) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)");
                    foreach ((array)($a['device_ids'] ?? []) as $dId)
                        $stmt->execute([$userId, $a['sensor_id'] ?? null, $dId, $a['condition_type'] ?? 'gt', $a['threshold'] ?? null, $a['threshold_min'] ?? null, $a['threshold_max'] ?? null, $a['action'] ?? 'on', $a['delay_ms'] ?? 0, $a['start_time'] ?? null, $a['end_time'] ?? null, isset($a['days']) ? json_encode($a['days']) : null]);
                    $result['executed'][] = 'automation';
                    break;
                case 'add_device':
                    $db->prepare("INSERT INTO devices (user_id,name,type,icon,device_key,topic_sub,topic_pub) VALUES (?,?,?,?,?,?,?)")->execute([$userId, $a['name'], $a['device_type'] ?? 'switch', $a['icon'] ?? 'fa-plug', $a['device_key'] ?? strtolower(str_replace(' ', '_', $a['name'])), $a['topic_sub'] ?? '', $a['topic_pub'] ?? '']);
                    $result['executed'][] = 'add_device';
                    break;
                case 'add_sensor':
                    $db->prepare("INSERT INTO sensors (user_id,name,type,icon,sensor_key,unit,topic) VALUES (?,?,?,?,?,?,?)")->execute([$userId, $a['name'], $a['sensor_type'] ?? 'temperature', $a['icon'] ?? 'fa-microchip', $a['sensor_key'] ?? strtolower(str_replace(' ', '_', $a['name'])), $a['unit'] ?? '', $a['topic'] ?? '']);
                    $result['executed'][] = 'add_sensor';
                    break;
                case 'delete_device':
                    $db->prepare("DELETE FROM devices WHERE id=? AND user_id=?")->execute([$a['device_id'], $userId]);
                    $result['executed'][] = 'del_device';
                    break;
                case 'delete_sensor':
                    $db->prepare("DELETE FROM sensors WHERE id=? AND user_id=?")->execute([$a['sensor_id'], $userId]);
                    $result['executed'][] = 'del_sensor';
                    break;
                case 'delete_rule':
                    $db->prepare("DELETE FROM automation_rules WHERE id=? AND user_id=?")->execute([$a['rule_id'], $userId]);
                    $result['executed'][] = 'del_rule';
                    break;
                case 'delete_schedule':
                    $db->prepare("DELETE FROM schedules WHERE id=? AND user_id=?")->execute([$a['schedule_id'], $userId]);
                    $result['executed'][] = 'del_sched';
                    break;
                case 'toggle_device_active':
                    $db->prepare("UPDATE devices SET is_active=? WHERE id=? AND user_id=?")->execute([(int)(bool)($a['is_active'] ?? true), $a['device_id'], $userId]);
                    $result['executed'][] = 'toggle_dev';
                    break;
                case 'toggle_rule':
                    $db->prepare("UPDATE automation_rules SET is_enabled=? WHERE id=? AND user_id=?")->execute([(int)(bool)($a['is_enabled'] ?? true), $a['rule_id'], $userId]);
                    $result['executed'][] = 'toggle_rule';
                    break;
                case 'toggle_schedule':
                    $db->prepare("UPDATE schedules SET is_enabled=? WHERE id=? AND user_id=?")->execute([(int)(bool)($a['is_enabled'] ?? true), $a['schedule_id'], $userId]);
                    $result['executed'][] = 'toggle_sched';
                    break;
                case 'update_mqtt':
                    $db->prepare("UPDATE user_settings SET mqtt_broker=?,mqtt_port=?,mqtt_use_ssl=?,mqtt_username=?,mqtt_path=? WHERE user_id=?")->execute([$a['mqtt_broker'] ?? null, $a['mqtt_port'] ?? 8884, (int)(bool)($a['mqtt_use_ssl'] ?? true), $a['mqtt_username'] ?? null, $a['mqtt_path'] ?? '/mqtt', $userId]);
                    $result['executed'][] = 'mqtt';
                    break;
                case 'update_telegram':
                    $db->prepare("UPDATE user_settings SET telegram_chat_id=?,telegram_bot_token=? WHERE user_id=?")->execute([$a['telegram_chat_id'] ?? null, $a['telegram_bot_token'] ?? null, $userId]);
                    $result['executed'][] = 'telegram';
                    break;
                case 'update_thresholds':
                    $ok = ['lamp_on_threshold', 'lamp_off_threshold', 'fan_temp_high', 'fan_temp_normal', 'lock_delay'];
                    $sets = [];
                    $vals = [];
                    foreach ($ok as $f) {
                        if (isset($a[$f])) {
                            $sets[] = "$f=?";
                            $vals[] = $a[$f];
                        }
                    }
                    if ($sets) {
                        $vals[] = $userId;
                        $db->prepare("UPDATE user_settings SET " . implode(',', $sets) . " WHERE user_id=?")->execute($vals);
                    }
                    $result['executed'][] = 'thresholds';
                    break;
                case 'toggle_builtin_automation':
                    $cm = ['lamp' => 'automation_lamp', 'fan' => 'automation_fan', 'lock' => 'automation_lock'];
                    $col = $cm[$a['target'] ?? ''] ?? null;
                    if ($col)
                        $db->prepare("UPDATE user_settings SET $col=? WHERE user_id=?")->execute([(int)(bool)($a['enabled'] ?? true), $userId]);
                    $result['executed'][] = 'builtin';
                    break;
                case 'update_profile':
                    $ok = ['full_name', 'email'];
                    $f = array_intersect_key($a['fields'] ?? [], array_flip($ok));
                    if ($f) {
                        $sets = implode(',', array_map(fn($k) => "$k=?", array_keys($f)));
                        $db->prepare("UPDATE users SET $sets WHERE id=?")->execute(array_merge(array_values($f), [$userId]));
                    }
                    $result['executed'][] = 'profile';
                    break;
                case 'update_theme':
                    $t = in_array($a['theme'] ?? '', ['light', 'dark']) ? $a['theme'] : 'light';
                    $db->prepare("UPDATE user_settings SET theme=? WHERE user_id=?")->execute([$t, $userId]);
                    $result['executed'][] = "theme:$t";
                    break;
                case 'navigate':
                    $result['executed'][] = "nav:" . ($a['page'] ?? '');
                    break;
                default:
                    $result['errors'][] = "Unknown: $type";
            }
        }
        catch (\Throwable $e) {
            $result['errors'][] = "$type: " . $e->getMessage();
            $result['success'] = false;
        }
    }
    return $result;
}