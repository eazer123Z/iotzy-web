<?php
/**
 * api/db-init.php — Database Initializer for Cloud (Aiven)
 * 
 * Akses via browser: https://iotzy-web.vercel.app/api/db-init.php
 * Akan membuat semua tabel yang dibutuhkan jika belum ada.
 */

ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once __DIR__ . '/../core/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');

$db = getLocalDB();
if (!$db) {
    echo json_encode([
        'success' => false,
        'error' => 'Koneksi database gagal: ' . ($GLOBALS['DB_LAST_ERROR'] ?? 'Unknown')
    ]);
    exit;
}

$results = [];
$errors = [];

// ===================== PATCH EXISTING DB =====================
// Karena db production sudah telanjur ada tabel users dengan struktur lama,
// kita paksa fix tipe data dan kolom password_hash agar foreign key bisa nyambung.
try {
    $db->exec("ALTER TABLE users MODIFY id INT UNSIGNED AUTO_INCREMENT");

    // Cek kolom password
    $stmt = $db->query("SHOW COLUMNS FROM users LIKE 'password'");
    if ($stmt->rowCount() > 0) {
        $db->exec("ALTER TABLE users DROP COLUMN password");
    }

    // Cek kolom password_hash
    $stmt = $db->query("SHOW COLUMNS FROM users LIKE 'password_hash'");
    if ($stmt->rowCount() == 0) {
        $db->exec("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL AFTER email");
    }

    // Cek kolom full_name
    $stmt = $db->query("SHOW COLUMNS FROM users LIKE 'full_name'");
    if ($stmt->rowCount() == 0) {
        $db->exec("ALTER TABLE users ADD COLUMN full_name VARCHAR(100) DEFAULT NULL AFTER password_hash");
    }

    // Cek kolom role
    $stmt = $db->query("SHOW COLUMNS FROM users LIKE 'role'");
    if ($stmt->rowCount() == 0) {
        $db->exec("ALTER TABLE users ADD COLUMN role ENUM('admin','user') DEFAULT 'user' AFTER full_name");
    }

    // Cek kolom is_active
    $stmt = $db->query("SHOW COLUMNS FROM users LIKE 'is_active'");
    if ($stmt->rowCount() == 0) {
        $db->exec("ALTER TABLE users ADD COLUMN is_active TINYINT(1) DEFAULT 1 AFTER role");
    }

    // Cek kolom last_login
    $stmt = $db->query("SHOW COLUMNS FROM users LIKE 'last_login'");
    if ($stmt->rowCount() == 0) {
        $db->exec("ALTER TABLE users ADD COLUMN last_login DATETIME DEFAULT NULL AFTER is_active");
    }

    // Cek kolom created_at
    $stmt = $db->query("SHOW COLUMNS FROM users LIKE 'created_at'");
    if ($stmt->rowCount() == 0) {
        $db->exec("ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP AFTER last_login");
    }

    // Cek kolom updated_at
    $stmt = $db->query("SHOW COLUMNS FROM users LIKE 'updated_at'");
    if ($stmt->rowCount() == 0) {
        $db->exec("ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at");
    }
}
catch (Throwable $e) {
    // Abaikan error jika tabel users belum ada dan kolom sudah sesuai
}

// ===================== CREATE TABLES =====================

$tables = [

    'users' => "CREATE TABLE IF NOT EXISTS users (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) DEFAULT NULL,
        role ENUM('admin','user') DEFAULT 'user',
        is_active TINYINT(1) DEFAULT 1,
        last_login DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'user_settings' => "CREATE TABLE IF NOT EXISTS user_settings (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL UNIQUE,
        mqtt_broker VARCHAR(200) DEFAULT 'broker.hivemq.com',
        mqtt_port INT DEFAULT 8884,
        mqtt_client_id VARCHAR(100) DEFAULT NULL,
        mqtt_path VARCHAR(100) DEFAULT '/mqtt',
        mqtt_use_ssl TINYINT(1) DEFAULT 1,
        mqtt_username VARCHAR(100) DEFAULT NULL,
        mqtt_password_enc VARCHAR(255) DEFAULT NULL,
        telegram_chat_id VARCHAR(100) DEFAULT NULL,
        telegram_bot_token VARCHAR(255) DEFAULT NULL,
        automation_lamp TINYINT(1) DEFAULT 1,
        automation_fan TINYINT(1) DEFAULT 1,
        automation_lock TINYINT(1) DEFAULT 1,
        lamp_on_threshold DECIMAL(4,2) DEFAULT 0.35,
        lamp_off_threshold DECIMAL(4,2) DEFAULT 0.50,
        fan_temp_high DECIMAL(5,2) DEFAULT 26.50,
        fan_temp_normal DECIMAL(5,2) DEFAULT 25.00,
        lock_delay INT DEFAULT 5000,
        quick_control_devices JSON DEFAULT NULL,
        theme VARCHAR(10) DEFAULT 'light',
        cv_rules JSON DEFAULT NULL,
        cv_config JSON DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'devices' => "CREATE TABLE IF NOT EXISTS devices (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        device_key VARCHAR(100) NOT NULL,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(50) DEFAULT 'fa-plug',
        type VARCHAR(50) DEFAULT 'switch',
        topic_sub VARCHAR(200) DEFAULT NULL,
        topic_pub VARCHAR(200) DEFAULT NULL,
        is_active TINYINT(1) DEFAULT 1,
        last_state TINYINT(1) DEFAULT 0,
        latest_state TINYINT(1) DEFAULT 0,
        last_seen DATETIME DEFAULT NULL,
        last_state_changed DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_devices_user_active (user_id, is_active),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'sensors' => "CREATE TABLE IF NOT EXISTS sensors (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        sensor_key VARCHAR(100) NOT NULL,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        icon VARCHAR(50) DEFAULT 'fa-microchip',
        unit VARCHAR(20) DEFAULT NULL,
        topic VARCHAR(200) NOT NULL,
        latest_value DECIMAL(12,4) DEFAULT NULL,
        last_seen DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sensors_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'sensor_readings' => "CREATE TABLE IF NOT EXISTS sensor_readings (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        sensor_id INT UNSIGNED NOT NULL,
        value DECIMAL(12,4) NOT NULL,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sensor_time (sensor_id, recorded_at),
        FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'device_sessions' => "CREATE TABLE IF NOT EXISTS device_sessions (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        device_id INT UNSIGNED NOT NULL,
        turned_on_at DATETIME NOT NULL,
        turned_off_at DATETIME DEFAULT NULL,
        duration_seconds INT UNSIGNED DEFAULT NULL,
        trigger_type VARCHAR(50) DEFAULT 'Manual',
        INDEX idx_device_time (device_id, turned_on_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'automation_rules' => "CREATE TABLE IF NOT EXISTS automation_rules (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        sensor_id INT UNSIGNED NULL DEFAULT NULL,
        device_id INT UNSIGNED NOT NULL,
        condition_type VARCHAR(20) NOT NULL,
        threshold DECIMAL(10,4) DEFAULT NULL,
        threshold_min DECIMAL(10,4) DEFAULT NULL,
        threshold_max DECIMAL(10,4) DEFAULT NULL,
        action VARCHAR(30) DEFAULT 'on',
        delay_ms INT UNSIGNED DEFAULT 0,
        start_time TIME DEFAULT NULL,
        end_time TIME DEFAULT NULL,
        days JSON DEFAULT NULL,
        is_enabled TINYINT(1) DEFAULT 1,
        from_template VARCHAR(100) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_automation_user_sensor (user_id, sensor_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE,
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'schedules' => "CREATE TABLE IF NOT EXISTS schedules (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        label VARCHAR(100) DEFAULT NULL,
        time_hhmm CHAR(5) NOT NULL,
        days JSON DEFAULT NULL,
        action VARCHAR(20) DEFAULT 'on',
        devices JSON DEFAULT NULL,
        is_enabled TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_schedules_user_enabled_time (user_id, is_enabled, time_hhmm),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'activity_logs' => "CREATE TABLE IF NOT EXISTS activity_logs (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        device_name VARCHAR(100) NOT NULL,
        activity VARCHAR(200) NOT NULL,
        trigger_type VARCHAR(50) NOT NULL,
        log_type ENUM('info','success','warning','error') DEFAULT 'info',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_time (user_id, created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'ai_chat_history' => "CREATE TABLE IF NOT EXISTS ai_chat_history (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        sender ENUM('user','bot') NOT NULL,
        message TEXT NOT NULL,
        platform VARCHAR(20) NOT NULL DEFAULT 'web',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_chat (user_id, created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'device_schedules' => "CREATE TABLE IF NOT EXISTS device_schedules (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        device_id INT UNSIGNED NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_enabled TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'sessions' => "CREATE TABLE IF NOT EXISTS sessions (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        session_token VARCHAR(128) NOT NULL UNIQUE,
        ip_address VARCHAR(45) DEFAULT NULL,
        user_agent TEXT DEFAULT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sessions_lookup (user_id, session_token, expires_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'persistent_sessions' => "CREATE TABLE IF NOT EXISTS persistent_sessions (
        id VARCHAR(128) NOT NULL PRIMARY KEY,
        data MEDIUMTEXT NOT NULL,
        timestamp INT UNSIGNED NOT NULL,
        INDEX idx_timestamp (timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
];

// Execute semua CREATE TABLE
foreach ($tables as $name => $sql) {
    try {
        $db->exec($sql);
        $results[] = "✅ $name — OK";
    }
    catch (Throwable $e) {
        $errors[] = "❌ $name — " . $e->getMessage();
    }
}

// ===================== DEFAULT DATA =====================

try {
    $stmt = $db->query("SELECT COUNT(*) FROM users");
    $count = (int)$stmt->fetchColumn();

    if ($count === 0) {
        // Insert default admin & demo user
        $db->exec("INSERT INTO users (username, email, password_hash, full_name, role) VALUES
            ('admin', 'admin@iotzy.local', '\$2y\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMZJool3xvXBB73QRD8C5BPxjC', 'Administrator', 'admin'),
            ('demo', 'demo@iotzy.local', '\$2y\$12\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC7ok9Z.Yt/MvIGW7Ld2', 'Demo User', 'user')
        ");

        // Insert default user_settings
        $db->exec("INSERT IGNORE INTO user_settings (user_id) VALUES (1), (2)");

        $results[] = "✅ Default users (admin/demo) — Inserted";
    }
    else {
        $results[] = "ℹ️ Users sudah ada ($count rows) — Skipped insert";
    }
}
catch (Throwable $e) {
    $errors[] = "❌ Default data — " . $e->getMessage();
}

// ===================== RESPONSE =====================

echo json_encode([
    'success' => empty($errors),
    'results' => $results,
    'errors' => $errors,
    'total' => count($tables),
    'time' => date('Y-m-d H:i:s'),
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
