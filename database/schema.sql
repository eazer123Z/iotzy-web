CREATE TABLE users (
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
) ENGINE=InnoDB;

CREATE TABLE user_settings (
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
) ENGINE=InnoDB;

CREATE TABLE devices (
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
) ENGINE=InnoDB;

CREATE TABLE sensors (
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
) ENGINE=InnoDB;

CREATE TABLE sensor_readings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sensor_id INT UNSIGNED NOT NULL,
    value DECIMAL(12,4) NOT NULL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sensor_time (sensor_id, recorded_at),
    FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE device_sessions (
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
) ENGINE=InnoDB;

-- FIX: sensor_id nullable untuk support time_only rules + days JSON untuk unified scheduling
CREATE TABLE automation_rules (
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
) ENGINE=InnoDB;

CREATE TABLE schedules (
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
) ENGINE=InnoDB;

CREATE TABLE activity_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    device_name VARCHAR(100) NOT NULL,
    activity VARCHAR(200) NOT NULL,
    trigger_type VARCHAR(50) NOT NULL,
    log_type ENUM('info','success','warning','error') DEFAULT 'info',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_time (user_id, created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- FIX: tambah kolom platform yang dibutuhkan ai_parser.php
CREATE TABLE ai_chat_history (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    sender ENUM('user','bot') NOT NULL,
    message TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL DEFAULT 'web',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_chat (user_id, created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE device_schedules (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    device_id INT UNSIGNED NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_enabled TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE sessions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    session_token VARCHAR(128) NOT NULL UNIQUE,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sessions_lookup (user_id, session_token, expires_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO users (username,email,password_hash,full_name,role) VALUES
('admin','admin@iotzy.local','$2y$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMZJool3xvXBB73QRD8C5BPxjC','Administrator','admin'),
('demo','demo@iotzy.local','$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC7ok9Z.Yt/MvIGW7Ld2','Demo User','user');

DELIMITER $$
CREATE TRIGGER after_user_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT IGNORE INTO user_settings (user_id) VALUES (NEW.id);
END$$
DELIMITER ;
