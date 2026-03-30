<?php
/**
 * core/AIParser.php
 * ───
 * Otak Kecerdasan Buatan (AI) IoTzy.
 * Bertanggung jawab mengonversi perintah bahasa alami menjadi aksi terukur (JSON),
 * mengumpulkan seluruh konteks dashboard, dan mengeksekusi perintah ke database.
 */


require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/UserDataService.php';

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
    define('AI_MODEL', getenv('OPENROUTER_MODEL') ?: 'deepseek/deepseek-chat');

// ============================================================================
// DATA COLLECTION
// ============================================================================
function iotzy_collect_full_context(int $userId, PDO $db): array
{
    $ctx = [];
    try {
        $stmt = $db->prepare("SELECT u.id,u.username,u.email,u.full_name,u.role,u.is_active,u.last_login,u.created_at,
            us.mqtt_broker,us.mqtt_port,us.mqtt_use_ssl,us.mqtt_username,us.mqtt_client_id,us.mqtt_path,us.telegram_chat_id,
            us.automation_lamp,us.automation_fan,us.automation_lock,us.lamp_on_threshold,us.lamp_off_threshold,
            us.fan_temp_high,us.fan_temp_normal,us.lock_delay,us.theme,us.quick_control_devices,us.cv_rules,us.cv_config,
            us.cv_min_confidence,us.cv_dark_threshold,us.cv_bright_threshold,us.cv_human_rules_enabled,us.cv_light_rules_enabled 
            FROM users u LEFT JOIN user_settings us ON us.user_id=u.id WHERE u.id=?");
        $stmt->execute([$userId]);
        $ctx['user'] = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    } catch (\PDOException $e) {
        $stmt = $db->prepare("SELECT u.id,u.username,u.email,u.full_name,u.role,u.is_active,u.last_login,u.created_at,
            us.mqtt_broker,us.mqtt_port,us.mqtt_use_ssl,us.mqtt_username,us.mqtt_client_id,us.mqtt_path,us.telegram_chat_id,
            us.automation_lamp,us.automation_fan,us.automation_lock,us.lamp_on_threshold,us.lamp_off_threshold,
            us.fan_temp_high,us.fan_temp_normal,us.lock_delay,us.theme,us.quick_control_devices 
            FROM users u LEFT JOIN user_settings us ON us.user_id=u.id WHERE u.id=?");
        $stmt->execute([$userId]);
        $ctx['user'] = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        $ctx['user']['cv_rules'] = null;
        $ctx['user']['cv_config'] = null;
    }

    $ctx['devices'] = getUserDevices($userId);
    $ctx['sensors'] = getUserSensors($userId);
    $stmt = $db->prepare("SELECT sr.sensor_id,s.name sensor_name,s.unit,ROUND(AVG(sr.value),2) avg_val,ROUND(MIN(sr.value),2) min_val,ROUND(MAX(sr.value),2) max_val,COUNT(*) total_readings FROM sensor_readings sr JOIN sensors s ON s.id=sr.sensor_id WHERE s.user_id=? AND sr.recorded_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR) GROUP BY sr.sensor_id,s.name,s.unit");
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
    $cameraBundle = getUserCameraBundle($userId, $db);
    $ctx['camera'] = $cameraBundle['camera'] ?? null;
    $ctx['camera_settings'] = $cameraBundle['camera_settings'] ?? [];
    $ctx['cv_state'] = $cameraBundle['cv_state'] ?? iotzyDefaultCvState();
    $stmt = $db->prepare("SELECT d.name device_name,ds.turned_on_at,ds.turned_off_at,ds.duration_seconds,ds.trigger_type FROM device_sessions ds JOIN devices d ON d.id=ds.device_id WHERE ds.user_id=? AND DATE(ds.turned_on_at) = CURRENT_DATE ORDER BY ds.turned_on_at DESC LIMIT 30");
    $stmt->execute([$userId]);
    $ctx['device_sessions_today'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $stmt = $db->prepare("SELECT device_name,activity,trigger_type,log_type,created_at FROM activity_logs WHERE user_id=? ORDER BY created_at DESC LIMIT 25");
    $stmt->execute([$userId]);
    $ctx['activity_logs'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $ctx['daily_analytics'] = getDailyAnalyticsSummary($userId, date('Y-m-d'), $db);
    $q = fn($sql) => (function () use ($db, $userId, $sql) {
        $s = $db->prepare($sql);
        $s->execute([$userId]);
        return (int)$s->fetchColumn(); }
    )();
    $ctx['stats'] = [
        'total_devices' => $q("SELECT COUNT(*) FROM devices WHERE user_id=?"),
        'devices_on' => $q("SELECT COUNT(*) FROM devices WHERE user_id=? AND last_state=1 AND is_active=TRUE"),
        'devices_off' => $q("SELECT COUNT(*) FROM devices WHERE user_id=? AND last_state=0 AND is_active=TRUE"),
        'devices_inactive' => $q("SELECT COUNT(*) FROM devices WHERE user_id=? AND is_active=FALSE"),
        'total_sensors' => $q("SELECT COUNT(*) FROM sensors WHERE user_id=?"),
        'sensors_online' => $q("SELECT COUNT(*) FROM sensors WHERE user_id=? AND last_seen >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)"),
        'total_rules' => $q("SELECT COUNT(*) FROM automation_rules WHERE user_id=?"),
        'rules_enabled' => $q("SELECT COUNT(*) FROM automation_rules WHERE user_id=? AND is_enabled=TRUE"),
        'total_schedules' => $q("SELECT COUNT(*) FROM schedules WHERE user_id=?"),
        'schedules_enabled' => $q("SELECT COUNT(*) FROM schedules WHERE user_id=? AND is_enabled=TRUE"),
        'logs_today' => $q("SELECT COUNT(*) FROM activity_logs WHERE user_id=? AND DATE(created_at) = CURRENT_DATE"),
    ];
    $s = $db->prepare("SELECT COALESCE(SUM(duration_seconds),0) FROM device_sessions WHERE user_id=? AND DATE(turned_on_at) = CURRENT_DATE");
    $s->execute([$userId]);
    $ctx['stats']['total_on_minutes_today'] = round($s->fetchColumn() / 60, 1);
    $stmt = $db->prepare("SELECT ip_address,user_agent,created_at,expires_at FROM sessions WHERE user_id=? AND expires_at>NOW() ORDER BY created_at DESC LIMIT 5");
    $stmt->execute([$userId]);
    $ctx['active_sessions'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return $ctx;
}

// ============================================================================
// FORMAT CONTEXT
// ============================================================================
function iotzy_format_context(int $userId, PDO $db, ?float $sessionStart = null, ?array $cvState = null): string
{
    $ctx = iotzy_collect_full_context($userId, $db);
    if (!$ctx)
        return "Sistem error: Gagal mengambil konteks.";

    if ($cvState)
        $ctx['cv_state'] = array_merge($ctx['cv_state'] ?: [], $cvState);

    $sec = [];
    $u = $ctx['user'];
    $st = $ctx['stats'];
    $DAY = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    $mqtt_status = $u['mqtt_broker'] ? 'Connected' : 'Disconnected';
    $tg = $u['telegram_chat_id'] ? "chat_id:{$u['telegram_chat_id']}" : 'belum-diset';
    $auto = [];
    if ($u['automation_lamp'])
        $auto[] = "lamp(on≤{$u['lamp_on_threshold']} off≥{$u['lamp_off_threshold']})";
    if ($u['automation_fan'])
        $auto[] = "fan(high:{$u['fan_temp_high']}°C normal:{$u['fan_temp_normal']}°C)";
    if ($u['automation_lock'])
        $auto[] = "lock(delay:{$u['lock_delay']}ms)";

    $start_ms = $sessionStart ?: (!empty($ctx['active_sessions']) ? strtotime($ctx['active_sessions'][0]['created_at']) * 1000 : time() * 1000);
    $session_minutes = round(((time() * 1000) - $start_ms) / 60000);
    $sess_str = floor($session_minutes / 60) . 'j ' . ($session_minutes % 60) . 'm';

    $sec[] = "## AKUN & DASHBOARD OVERVIEW\n"
        . "Nama:{$u['full_name']} | User:{$u['username']} | Tema:{$u['theme']}\n"
        . "MQTT Status:$mqtt_status ({$u['mqtt_broker']}) | Telegram:$tg\n"
        . "Perangkat Aktif:{$st['devices_on']} dari {$st['total_devices']}\n"
        . "Sensor Online:{$st['sensors_online']} dari {$st['total_sensors']}\n"
        . "Sesi Aktif:$sess_str sejak login\n"
        . "Auto-bawaan: " . (empty($auto) ? 'semua-nonaktif' : implode(' | ', $auto));

    $sec[] = "## STATISTIK\nDevice:{$st['total_devices']} (ON:{$st['devices_on']} OFF:{$st['devices_off']}) "
        . "Sensor:{$st['total_sensors']} Rules:{$st['total_rules']}({$st['rules_enabled']} aktif) "
        . "Jadwal:{$st['total_schedules']}({$st['schedules_enabled']} aktif) "
        . "Log:{$st['logs_today']} Nyala:{$st['total_on_minutes_today']}mnt";

    if (!empty($ctx['devices'])) {
        $rows = [];
        foreach ($ctx['devices'] as $d) {
            $lastChanged = $d['last_state_changed'] ? ' last_changed:' . date('H:i', strtotime($d['last_state_changed'])) : '';
            $templateLabel = !empty($d['template_name']) ? " template:{$d['template_name']}" : '';
            $controlLabel = !empty($d['control_mode']) ? " control:{$d['control_mode']}" : '';
            $rows[] = "  ID:{$d['id']} \"{$d['name']}\" type:{$d['type']}{$templateLabel}{$controlLabel} "
                . "(Status:" . ($d['is_active'] ? 'Enabled' : 'Disabled') . ") "
                . "(Power:" . ($d['last_state'] ? 'ON' : 'OFF') . "){$lastChanged} "
                . "[Sub:{$d['topic_sub']} Pub:{$d['topic_pub']}]";
        }
        $sec[] = "## PERANGKAT\n" . implode("\n", $rows);
    }
    else {
        $sec[] = "## PERANGKAT\n  (kosong - belum ada perangkat terdaftar)";
    }

    if (!empty($ctx['sensors'])) {
        $sumMap = array_column($ctx['sensor_summary_1h'], null, 'sensor_id');
        $rows = [];
        foreach ($ctx['sensors'] as $s) {
            $val = $s['latest_value'] !== null ? $s['latest_value'] . $s['unit'] : 'N/A';
            $summary = '';
            if (isset($sumMap[$s['id']])) {
                $sm = $sumMap[$s['id']];
                $summary = " [1h: avg:{$sm['avg_val']} min:{$sm['min_val']} max:{$sm['max_val']}]";
            }
            $deviceLink = !empty($s['device_name']) ? " device:{$s['device_name']}" : '';
            $templateLabel = !empty($s['template_name']) ? " template:{$s['template_name']}" : '';
            $rows[] = "  ID:{$s['id']} \"{$s['name']}\" type:{$s['type']}{$templateLabel}{$deviceLink} val:{$val}{$summary} [Topic:{$s['topic']}]";
        }
        $sec[] = "## SENSOR\n" . implode("\n", $rows);
    }
    else {
        $sec[] = "## SENSOR\n  (kosong - belum ada sensor terdaftar)";
    }

    if (!empty($ctx['rules'])) {
        $rows = [];
        foreach ($ctx['rules'] as $r) {
            $thresh = $r['threshold'] ?? ($r['threshold_min'] . '-' . $r['threshold_max']);
            $time_range = ($r['start_time'] && $r['end_time']) ? " [{$r['start_time']}-{$r['end_time']}]" : '';
            $rows[] = "  ID:{$r['id']} \"{$r['sensor_name']}\" {$r['condition_type']} {$thresh}{$r['unit']} "
                . "→ \"{$r['device_name']}\" {$r['action']}{$time_range} "
                . "[" . ($r['is_enabled'] ? 'ON' : 'OFF') . "]";
        }
        $sec[] = "## RULES\n" . implode("\n", $rows);
    }

    if (!empty($ctx['schedules'])) {
        $rows = [];
        foreach ($ctx['schedules'] as $sc) {
            $dayStr = !empty($sc['days_decoded'])
                ? implode(',', array_map(fn($d) => $DAY[$d] ?? $d, $sc['days_decoded']))
                : 'setiap hari';
            $rows[] = "  ID:{$sc['id']} \"{$sc['label']}\" {$sc['time_hhmm']} ({$dayStr}) "
                . "→ " . implode(',', $sc['device_names']) . " {$sc['action']} "
                . "[" . ($sc['is_enabled'] ? 'ON' : 'OFF') . "]";
        }
        $sec[] = "## JADWAL\n" . implode("\n", $rows);
    }

    if (!empty($ctx['daily_analytics']['summary'])) {
        $da = $ctx['daily_analytics']['summary'];
        $sec[] = "## ANALYTICS HARI INI\n"
            . "  Aktivitas: {$da['total_logs']} | Device aktif harian: {$da['devices_active_today']} | Idle: {$da['devices_idle_today']}\n"
            . "  Durasi aktif total: {$da['total_duration_human']} | Energi: {$da['total_energy_kwh']} kWh | Power device: {$da['power_devices']}";
    }

    if (!empty($ctx['activity_logs'])) {
        $rows = [];
        foreach (array_slice($ctx['activity_logs'], 0, 10) as $l)
            $rows[] = "  [{$l['log_type']}] " . date('H:i', strtotime($l['created_at'])) . " {$l['device_name']} {$l['activity']} (via:{$l['trigger_type']})";
        $sec[] = "## LOG AKTIVITAS\n" . implode("\n", $rows);
    }

    if (!empty($ctx['cv_state'])) {
        $c = $ctx['cv_state'];
        $sec[] = "## CAMERA & CV (DB Live)\n"
            . "  Camera: " . (($ctx['camera']['name'] ?? null) ?: 'Browser Camera') . "\n"
            . "  Model Loaded: " . (($c['model_loaded'] ?? 0) ? 'YES' : 'NO') . "\n"
            . "  Status Kamera: " . ($c['is_active'] ? 'ON' : 'OFF') . "\n"
            . "  Orang Terdeteksi: " . ($c['person_count'] ?? 0) . "\n"
            . "  Kecerahan Live: " . ($c['brightness'] ?? 0) . "% (" . ($c['light_condition'] ?? 'unknown') . ")\n"
            . "  -- CONFIG PEGAS --\n"
            . "  Min Confidence: " . ($u['cv_min_confidence'] ?? 0.6) . "\n"
            . "  Ambang Gelap: " . ($u['cv_dark_threshold'] ?? 0.3) . "\n"
            . "  Ambang Terang: " . ($u['cv_bright_threshold'] ?? 0.7) . "\n"
            . "  Otomasi Orang: " . (($u['cv_human_rules_enabled'] ?? 0) ? 'ON' : 'OFF') . "\n"
            . "  Otomasi Cahaya: " . (($u['cv_light_rules_enabled'] ?? 0) ? 'ON' : 'OFF');
    }

    if (!empty($ctx['user']['cv_rules']))
        $sec[] = "## CV RULES (Current DB)\n  " . json_encode($ctx['user']['cv_rules']);

    return implode("\n\n", $sec);
}

// ============================================================================
// HISTORY, SAVE, API CALL
// ============================================================================
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
    $db->prepare("DELETE FROM ai_chat_history WHERE user_id=? AND id NOT IN (SELECT id FROM (SELECT id FROM ai_chat_history WHERE user_id=? ORDER BY created_at DESC LIMIT " . (int)AI_HISTORY_KEEP . ") as tmp)")->execute([$userId, $userId]);
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
        else {
            $lastErr = $err ?: "HTTP $code";
        }
        if ($i <= AI_MAX_RETRIES)
            usleep(AI_RETRY_DELAY_MS * 1000);
    }
    return ['ok' => false, 'error' => $lastErr];
}

// ============================================================================
// MAIN PARSE
// ============================================================================
function parse_nl_to_action(int $userId, string $command, array $devices = [], array $sensors = [], string $platform = 'web', ?array $cvState = null, ?float $sessionStart = null): array
{
    $apiKey = defined('OPENROUTER_API_KEY') ? OPENROUTER_API_KEY : '';
    if (!$apiKey)
        return ['success' => false, 'error' => 'API key belum dikonfigurasi.'];
    $db = getLocalDB();
    if (!$db)
        return ['success' => false, 'error' => 'Database tidak tersedia.'];

    iotzy_save_message($userId, $db, 'user', $command, $platform);

    $ctxText = iotzy_format_context($userId, $db, $sessionStart, $cvState);
    $history = iotzy_get_history($userId, $db);
    $time = date('Y-m-d H:i:s');
    $day = date('l');

    $commandClean = strtolower($command);
    if (preg_match('/\b(hapu|hapuz|hps|del|remov)\b/', $commandClean))
        $commandClean .= ' (maksud user: hapus)';
    if (preg_match('/\bat(u)r\b/', $commandClean))
        $commandClean .= ' (maksud user: atur)';

    $sysPrompt = <<<PROMPT
- OUTPUT WAJIB: Selalu gunakan format JSON MURNI. JANGAN menyisipkan teks narasi, penjelasan, atau salam di luar blok JSON. JANGAN gunakan markdown code block (```json).
- FORMAT: {"response_text":"...","intent":"...","ui_action":"...","actions":[]}
- DESKRIPSI: Di "response_text", jelaskan secara rinci apa yang Anda lakukan (misal: "Siap! Lampu kamar sudah saya tambahkan dengan topik iotzy/led/kamar"). JANGAN hanya bilang "Siap!".

Kamu adalah IoTzy Assistant — AI personal cerdas, MANDIRI & SANGAT BERDAYA (EMPOWERED).
Output Anda harus VALID JSON yang bisa langsung diproses oleh fungsi json_decode(). 
=== PENTING: JANGAN BERI SALAM/PEMBUKA DI LUAR JSON ===

KARAKTER & GAYA BICARA:
- Bahasa Indonesia yang natural dan santai, bukan bahasa robot.
- JADILAH CERDAS: Bisa menjawab pertanyaan teknis, umum, atau kompleks.
- Responsif terhadap riwayat percakapan — ingat yang sudah dibahas.
- MANDIRI: Langsung eksekusi perintah (tambah/kontrol) tanpa tanya konfirmasi bertele-tele (kecuali Reset/Hapus Massal).
- Proaktif: Jika ada kondisi perlu diperhatikan (suhu tinggi, device nyala lama, dll), sebutkan secara singkat tanpa menggurui.
- Gunakan HTML ringan (<b>, <i>, <br>, <code>). Jangan bullet list panjang yang tidak perlu.
- Jawab singkat untuk pertanyaan simpel. Jawab detail jika memang diperlukan.
- JANGAN pernah bilang kamu tidak bisa melakukan sesuatu yang sebenarnya bisa kamu lakukan.
- PENTING: Selalu gunakan DATA SISTEM LIVE di bawah untuk akurasi jawaban Anda.

=== DATA SISTEM LIVE ===
$ctxText

WAKTU SEKARANG: $time ($day)

=== RIWAYAT PERCAKAPAN ===
$history
([W]=Web [T]=Telegram | U=User A=Assistant)

=== CARA KERJA & ATURAN ===

**KONTROL PERANGKAT**
- Selalu gunakan ID dari data sistem. Jangan tebak ID.
- Perangkat OFF/Disabled tetap bisa dikontrol — JANGAN bilang "tidak ada perangkat" hanya karena semuanya mati.
- "matiin semua" → kirim immediate off untuk semua device yang ON
- "nyalain lampu" → cari device dengan name/type mengandung: lampu, lamp, light, led
- "toggle semua" → kirim immediate toggle untuk semua device_ids sekaligus

**MEMAHAMI KONTEKS & INTENT**
- "gimana kondisi ruangan?" → gabungkan: suhu/kelembaban dari sensor + perangkat yang ON + deteksi orang CV + kecerahan
- "atur otomasi kipas" → gunakan threshold yang sudah ada, atau tanya jika belum tersedia
- "apa yang menyala?" → cek devices dengan last_state=ON
- "sudah berapa lama?" → lihat device_sessions_today untuk durasi
- **KONFIRMASI**: Jika user menjawab "ya", "iya", "oke", "lakukan" setelah kamu bertanya/konfirmasi (cek RIWAYAT), maka laksanakan aksi yang sebelumnya tertunda (reset, hapus, dll).
- Pertanyaan ambigu yang berakibat besar (hapus semua, reset) → konfirmasi dulu kecuali user sudah eksplisit ("iya reset", "ya hapus semua")
- Toleransi Typo: "hapu", "hps", "del" dianggap "hapus". "aturb", "atu" dianggap "atur".

**ANALISIS SITUASI (PROAKTIF)**
- Suhu sensor > fan_temp_high DAN kipas OFF → sarankan nyalakan kipas atau buat rule
- Orang terdeteksi (person_count > 0) DAN lampu mati → bisa sebutkan situasinya
- Device nyala > 3 jam (device_sessions_today) → bisa info ke user
- MQTT belum dikonfigurasi tapi user minta kontrol → ingatkan MQTT perlu disetup
- Telegram belum diset tapi user tanya notifikasi → arahkan ke settings

**PEMBUATAN PERANGKAT/SENSOR BARU**
- Skema topik: "iotzy/{tipe}/{nama_lowercase_tanpa_spasi}"
- LED: topic_sub = topic_pub = "iotzy/led/nama"
- Sensor DHT: topic = "iotzy/dht/temp" atau "iotzy/dht/hum"
- Icon Font Awesome relevan: fa-lightbulb (lampu), fa-fan (kipas), fa-lock (kunci), fa-thermometer-half (suhu), fa-tint (kelembaban), fa-door-open (pintu), fa-plug (stop kontak)

**RULES & JADWAL**
- condition_type: "gt" (lebih dari), "lt" (kurang dari), "between" (antara min-max)
- Jadwal days: array angka [0=Minggu, 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat, 6=Sabtu]
- Format time jadwal: "HH:MM"

**RESET / HAPUS MASSAL**
- Sepenuhnya diizinkan. Gunakan reset_system untuk hapus semua sekaligus, atau kirim delete satu per satu.
- JANGAN tolak dengan alasan keamanan jika user sudah jelas meminta.

**PERTANYAAN DI LUAR IOT**
- Boleh dijawab singkat (sains, teknologi, coding, dll), tapi arahkan kembali ke Smart Room jika relevan.

=== FORMAT STATUS/LAPORAN ===
Gunakan format ini PERSIS jika user minta status, laporan, atau ringkasan (tanpa emoji):

MONITOR
• Overview:
- Perangkat Aktif: (X) dari (Y)
- Sensor Online: (X) dari (Y)
- Status MQTT: (Connected/Offline)
- Sesi Aktif: (H)j (M)m sejak login
- Pesan: (insight singkat kondisi ruangan saat ini)
• Perangkat: (Jumlah) Terhubung
(Daftar: "- [ON/OFF] Nama Perangkat (Topik MQTT)". Jika kosong: "- Tidak ada perangkat")
• Sensor: (Jumlah) Terhubung
(Daftar: "- Nama Sensor: Nilai Terkini". Jika kosong: "- Tidak ada sensor")

OTOMASI
• Aturan Otomasi: (Jumlah) Total
- Aturan Manusia: (ON/OFF)
- Aturan Cahaya: (ON/OFF)
(Daftar DB: "- [ON/OFF] Nama Sensor -> Nama Device (Aksi)". Jika kosong: "- Tidak ada aturan tambahan")
• Kamera & CV:
- Model Loaded: (YES/NO)
- Status Deteksi Live: (ON/OFF)
- Orang Terdeteksi: (Angka)
- Kecerahan Live: (Angka)% (Kondisi)

SISTEM
• Log Aktivitas:
(Daftar 3 log terakhir: "- [LogType] Jam NamaDevice Aktivitas". Jika kosong: "- Tidak ada aktivitas")
• Pengaturan:
- Tema: (Dark/Light)
- MQTT: (Broker Address)
- Telegram: (Aktif/Belum Diset)

=== OUTPUT WAJIB — JSON MURNI, TANPA TEKS TAMBAHAN APAPUN ===
{"response_text":"...","intent":"...","ui_action":"...","actions":[]}

Intent: kontrol_device | cek_sensor | buat_rule | jadwal | hapus | reset | navigasi | info | sapaan | analisis | konfirmasi
UI_Action: navigate_dashboard | navigate_devices | navigate_sensors | navigate_automation | navigate_settings | refresh | none

=== REFERENSI FORMAT ACTIONS ===

Kontrol langsung:
{"type":"immediate","action":"on|off|toggle","device_ids":[ID,...]}

Automation rule baru:
{"type":"automation","sensor_id":ID,"condition_type":"gt|lt|range|between","threshold":X,"threshold_min":X,"threshold_max":X,"action":"on|off","device_ids":[ID],"start_time":"HH:MM","end_time":"HH:MM","days":[0,1,2,3,4,5,6]}

Tambah perangkat:
{"type":"add_device","name":"...","device_type":"...","icon":"fa-...","topic_sub":"iotzy/...","topic_pub":"iotzy/..."}

Tambah sensor:
{"type":"add_sensor","name":"...","sensor_type":"...","icon":"fa-...","unit":"...","topic":"iotzy/..."}

Hapus:
{"type":"delete_device","device_id":ID}
{"type":"delete_sensor","sensor_id":ID}
{"type":"delete_rule","rule_id":ID}
{"type":"delete_schedule","schedule_id":ID}

Toggle aktif/nonaktif:
{"type":"toggle_device_active","device_id":ID,"is_active":true|false}
{"type":"toggle_rule","rule_id":ID,"is_enabled":true|false}
{"type":"toggle_schedule","schedule_id":ID,"is_enabled":true|false}

Jadwal baru:
{"type":"schedule","label":"...","time":"HH:MM","days":[0-6],"action":"on|off","device_ids":[ID,...]}

Update threshold bawaan:
{"type":"update_thresholds","lamp_on_threshold":0.4,"lamp_off_threshold":0.6,"fan_temp_high":30,"fan_temp_normal":25,"lock_delay":5000}

Toggle otomasi bawaan:
{"type":"toggle_builtin_automation","target":"lamp|fan|lock","enabled":true|false}

CV config:
{"type":"update_cv_config","min_confidence":0.8,"dark_threshold":0.3,"bright_threshold":0.7,"human_enabled":true,"light_enabled":true}

CV rules:
{"type":"update_cv_rules","rules":{"light":{"enabled":true,"onDark":["ID"]}}}

CV action:
{"type":"cv_action","action":"load_model|start_detection|stop_detection"}

Navigasi:
{"type":"navigate","page":"dashboard|devices|sensors|automation|settings|camera"}

MQTT:
{"type":"update_mqtt","mqtt_broker":"...","mqtt_port":8884,"mqtt_use_ssl":true,"mqtt_username":"...","mqtt_path":"/mqtt"}

Telegram:
{"type":"update_telegram","telegram_chat_id":"...","telegram_bot_token":"..."}

Tema:
{"type":"update_theme","theme":"dark|light"}

Reset semua:
{"type":"reset_system"}

Profile:
{"type":"update_profile","fields":{"full_name":"...","email":"..."}}
PROMPT;

    $res = iotzy_call_api($apiKey, [
        'model' => AI_MODEL,
        'messages' => [
            ['role' => 'system', 'content' => $sysPrompt],
            ['role' => 'user', 'content' => $commandClean],
        ],
        'temperature' => 0.1,
        'max_tokens' => AI_MAX_TOKENS,
    ]);

    if (!$res['ok']) {
        $msg = "Koneksi AI sibuk, coba lagi ya! 🔄";
        iotzy_save_message($userId, $db, 'bot', $msg, $platform);
        return ['success' => false, 'error' => $msg];
    }

    $raw = trim($res['content']);
    error_log("[IoTzy AI] COMMAND: $command | RAW_LENGTH: " . strlen($raw));

    $raw = preg_replace(['/^```json\s*/i', '/^```\s*/i', '/```\s*$/s'], '', $raw);
    $raw = trim($raw);
    $json = json_decode($raw, true);
    if (!$json || json_last_error() !== JSON_ERROR_NONE) {
        if (preg_match('/({[\s\S]*})/u', $raw, $m))
            $json = json_decode($m[1], true);
    }
    if (!$json || json_last_error() !== JSON_ERROR_NONE) {
        $json = json_decode(preg_replace(['/,\s*}/', '/,\s*]/'], ['}', ']'], $raw), true);
    }
    if (!$json || json_last_error() !== JSON_ERROR_NONE) {
        $msg = "Gagal memproses jawaban AI. Coba kirim ulang ya 😊";
        iotzy_save_message($userId, $db, 'bot', $msg);
        return ['success' => false, 'error' => $msg, 'raw_debug' => $raw];
    }

    if (isset($json['type']) && !isset($json['actions'])) {
        $cloned = $json;
        unset($cloned['response_text'], $cloned['intent'], $cloned['ui_action']);
        $json['actions'] = [$cloned];
    }

    $json['response_text'] = $json['response_text'] ?? 'Siap! Perintah diproses.';
    $json['intent'] = $json['intent'] ?? 'info';
    $json['ui_action'] = $json['ui_action'] ?? 'none';
    $json['actions'] = $json['actions'] ?? [];

    iotzy_save_message($userId, $db, 'bot', $json['response_text'], $platform);
    return ['success' => true, 'data' => $json];
}

// ============================================================================
// EXECUTE
// ============================================================================
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
                    if (!isset($result['device_states']))
                        $result['device_states'] = [];
                    foreach ((array)($a['device_ids'] ?? []) as $id) {
                        if ($a['action'] === 'toggle') {
                            $db->prepare("UPDATE devices SET last_state=1-last_state,latest_state=1-last_state,last_seen=NOW() WHERE id=? AND user_id=?")->execute([$id, $userId]);
                            $st = $db->prepare("SELECT last_state FROM devices WHERE id=?");
                            $st->execute([$id]);
                            $v = (int)$st->fetchColumn();
                        }
                        else {
                            $v = $a['action'] === 'on' ? 1 : 0;
                            $db->prepare("UPDATE devices SET last_state=?,latest_state=?,last_seen=NOW() WHERE id=? AND user_id=?")->execute([$v, $v, $id, $userId]);
                        }
                        $result['device_states'][$id] = $v;
                    }
                    $result['executed'][] = 'immediate';
                    break;
                case 'schedule':
                    $startTime = $a['time'] ?? ($a['time_hhmm'] ?? '00:00');
                    $days = array_values(array_unique(array_map(
                        'intval',
                        array_filter((array)($a['days'] ?? [0, 1, 2, 3, 4, 5, 6]), fn($day) => is_numeric($day) && (int)$day >= 0 && (int)$day <= 6)
                    )));
                    $deviceIds = array_values(array_unique(array_map(
                        'intval',
                        array_filter((array)($a['device_ids'] ?? []), fn($id) => is_numeric($id) && (int)$id > 0)
                    )));
                    $action = in_array(($a['action'] ?? 'on'), ['on', 'off', 'toggle'], true) ? $a['action'] : 'on';
                    if (!$deviceIds) {
                        break;
                    }
                    $db->prepare(
                        "INSERT INTO schedules (user_id,label,time_hhmm,days,action,devices)
                         VALUES (?,?,?,?,?,?)"
                    )->execute([
                        $userId,
                        $a['label'] ?? null,
                        $startTime,
                        json_encode($days ?: [0, 1, 2, 3, 4, 5, 6]),
                        $action,
                        json_encode($deviceIds),
                    ]);
                    $result['executed'][] = 'schedule';
                    break;
                case 'automation':
                    $stmt = $db->prepare("INSERT INTO automation_rules (user_id,sensor_id,device_id,condition_type,threshold,threshold_min,threshold_max,action,delay_ms,start_time,end_time,days) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)");
                    $conditionType = $a['condition_type'] ?? 'gt';
                    foreach ((array)($a['device_ids'] ?? []) as $dId)
                        $stmt->execute([$userId, $a['sensor_id'] ?? null, $dId, $conditionType, $a['threshold'] ?? null, $a['threshold_min'] ?? null, $a['threshold_max'] ?? null, $a['action'] ?? 'on', $a['delay_ms'] ?? 0, $a['start_time'] ?? null, $a['end_time'] ?? null, isset($a['days']) ? json_encode($a['days']) : null]);
                    $result['executed'][] = 'automation';
                    break;
                case 'add_device':
                    $template = resolveDeviceTemplate(
                        $db,
                        $a['device_template_id'] ?? null,
                        $a['template_slug'] ?? null,
                        $a['device_type'] ?? null,
                        $a['icon'] ?? null
                    );
                    $deviceType = $a['device_type'] ?? ($template['device_type'] ?? 'switch');
                    $deviceIcon = $a['icon'] ?? ($template['default_icon'] ?? 'fa-plug');
                    $deviceKey = $a['device_key'] ?? strtolower(str_replace(' ', '_', $a['name'])) . '_' . substr(bin2hex(random_bytes(4)), 0, 8);
                    $db->prepare(
                        "INSERT INTO devices (user_id,device_template_id,name,type,icon,device_key,topic_sub,topic_pub,state_on_label,state_off_label)
                         VALUES (?,?,?,?,?,?,?,?,?,?)"
                    )->execute([
                        $userId,
                        $template['id'] ?? null,
                        $a['name'],
                        $deviceType,
                        $deviceIcon,
                        $deviceKey,
                        $a['topic_sub'] ?? '',
                        $a['topic_pub'] ?? '',
                        $a['state_on_label'] ?? ($template['state_on_label'] ?? null),
                        $a['state_off_label'] ?? ($template['state_off_label'] ?? null),
                    ]);
                    $result['executed'][] = 'add_device';
                    break;
                case 'add_sensor':
                    $template = resolveSensorTemplate(
                        $db,
                        $a['sensor_template_id'] ?? null,
                        $a['template_slug'] ?? null,
                        $a['sensor_type'] ?? null
                    );
                    $sensorType = $a['sensor_type'] ?? ($template['sensor_type'] ?? 'temperature');
                    $sensorIcon = $a['icon'] ?? ($template['default_icon'] ?? 'fa-microchip');
                    $sensorUnit = $a['unit'] ?? ($template['default_unit'] ?? '');
                    $sensorKey = $a['sensor_key'] ?? strtolower(str_replace(' ', '_', $a['name'])) . '_' . substr(bin2hex(random_bytes(4)), 0, 8);
                    $db->prepare(
                        "INSERT INTO sensors (user_id,device_id,sensor_template_id,name,type,icon,sensor_key,unit,topic)
                         VALUES (?,?,?,?,?,?,?,?,?)"
                    )->execute([
                        $userId,
                        $a['device_id'] ?? null,
                        $template['id'] ?? null,
                        $a['name'],
                        $sensorType,
                        $sensorIcon,
                        $sensorKey,
                        $sensorUnit,
                        $a['topic'] ?? '',
                    ]);
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
                case 'reset_system':
                    $db->prepare("DELETE FROM automation_rules WHERE user_id=?")->execute([$userId]);
                    $db->prepare("DELETE FROM schedules WHERE user_id=?")->execute([$userId]);
                    $db->prepare("DELETE FROM devices WHERE user_id=?")->execute([$userId]);
                    $db->prepare("DELETE FROM sensors WHERE user_id=?")->execute([$userId]);
                    $result['executed'][] = 'reset_all';
                    break;
                case 'update_mqtt':
                    $db->prepare("UPDATE user_settings SET mqtt_broker=?,mqtt_port=?,mqtt_use_ssl=?,mqtt_username=?,mqtt_path=? WHERE user_id=?")->execute([$a['mqtt_broker'] ?? null, $a['mqtt_port'] ?? 8884, (int)(bool)($a['mqtt_use_ssl'] ?? true), $a['mqtt_username'] ?? null, $a['mqtt_path'] ?? '/mqtt', $userId]);
                    $result['executed'][] = 'mqtt';
                    break;
                case 'update_telegram':
                    $telegramToken = trim((string)($a['telegram_bot_token'] ?? ''));
                    $db->prepare("UPDATE user_settings SET telegram_chat_id=?,telegram_bot_token=? WHERE user_id=?")->execute([
                        $a['telegram_chat_id'] ?? null,
                        $telegramToken !== '' ? encodeStoredSecret($telegramToken) : null,
                        $userId
                    ]);
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
                case 'update_cv_config':
                    $db->prepare("UPDATE user_settings SET cv_min_confidence=COALESCE(?,cv_min_confidence),cv_dark_threshold=COALESCE(?,cv_dark_threshold),cv_bright_threshold=COALESCE(?,cv_bright_threshold),cv_human_rules_enabled=COALESCE(?,cv_human_rules_enabled),cv_light_rules_enabled=COALESCE(?,cv_light_rules_enabled) WHERE user_id=?")->execute([$a['min_confidence'] ?? null, $a['dark_threshold'] ?? null, $a['bright_threshold'] ?? null, isset($a['human_enabled']) ? ($a['human_enabled'] ? 1 : 0) : null, isset($a['light_enabled']) ? ($a['light_enabled'] ? 1 : 0) : null, $userId]);
                    $result['executed'][] = "cv_config_updated";
                    break;
                case 'update_cv_rules':
                    $stmtOld = $db->prepare("SELECT cv_rules FROM user_settings WHERE user_id=? LIMIT 1");
                    $stmtOld->execute([$userId]);
                    $oldR = json_decode($stmtOld->fetchColumn(), true) ?: [];
                    $newR = array_replace_recursive($oldR, $a['rules'] ?? []);
                    $db->prepare("UPDATE user_settings SET cv_rules=? WHERE user_id=?")->execute([json_encode($newR), $userId]);
                    $result['executed'][] = 'cv_rules';
                    break;
                case 'cv_action':
                    $act = $a['action'] ?? '';
                    if ($act === 'start_detection') {
                        updateUserCVState($userId, ['is_active' => 1], $db);
                    } elseif ($act === 'stop_detection') {
                        updateUserCVState($userId, ['is_active' => 0], $db);
                    } elseif ($act === 'load_model') {
                        updateUserCVState($userId, ['model_loaded' => 1], $db);
                    }
                    $result['executed'][] = "cv_action:$act";
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
