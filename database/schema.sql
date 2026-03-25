SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- ========================
-- TABLES
-- ========================

CREATE TABLE `activity_logs` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `device_name` varchar(100) NOT NULL,
  `activity` varchar(200) NOT NULL,
  `trigger_type` varchar(50) NOT NULL,
  `log_type` enum('info','success','warning','error') DEFAULT 'info',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_time` (`user_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `ai_chat_history` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `sender` enum('user','bot') NOT NULL,
  `message` text NOT NULL,
  `platform` varchar(20) DEFAULT 'web',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_chat` (`user_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `automation_rules` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `sensor_id` int UNSIGNED DEFAULT NULL,
  `device_id` int UNSIGNED NOT NULL,
  `condition_type` varchar(20) NOT NULL,
  `threshold` decimal(10,4) DEFAULT NULL,
  `threshold_min` decimal(10,4) DEFAULT NULL,
  `threshold_max` decimal(10,4) DEFAULT NULL,
  `action` varchar(30) DEFAULT 'on',
  `delay_ms` int UNSIGNED DEFAULT 0,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `days` json DEFAULT NULL,
  `is_enabled` tinyint(1) DEFAULT 1,
  `from_template` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `cv_state` (
  `user_id` int UNSIGNED NOT NULL,
  `is_active` tinyint(1) DEFAULT 0,
  `model_loaded` tinyint(1) DEFAULT 0,
  `person_count` int DEFAULT 0,
  `brightness` int DEFAULT 0,
  `light_condition` varchar(20) DEFAULT 'unknown',
  `last_updated` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `devices` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `device_key` varchar(100) NOT NULL,
  `name` varchar(100) NOT NULL,
  `icon` varchar(50) DEFAULT 'fa-plug',
  `type` varchar(50) DEFAULT 'switch',
  `topic_sub` varchar(200) DEFAULT NULL,
  `topic_pub` varchar(200) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `last_state` tinyint(1) DEFAULT 0,
  `latest_state` tinyint(1) DEFAULT 0,
  `last_seen` datetime DEFAULT NULL,
  `last_state_changed` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `device_sessions` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `device_id` int UNSIGNED NOT NULL,
  `turned_on_at` datetime NOT NULL,
  `turned_off_at` datetime DEFAULT NULL,
  `duration_seconds` int UNSIGNED DEFAULT NULL,
  `trigger_type` varchar(50) DEFAULT 'Manual',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `persistent_sessions` (
  `id` varchar(128) NOT NULL,
  `data` mediumtext NOT NULL,
  `timestamp` int UNSIGNED NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `schedules` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `label` varchar(100) DEFAULT NULL,
  `time_hhmm` char(5) NOT NULL,
  `days` json DEFAULT NULL,
  `action` varchar(20) DEFAULT 'on',
  `devices` json DEFAULT NULL,
  `is_enabled` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `sensors` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `sensor_key` varchar(100) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` varchar(50) NOT NULL,
  `icon` varchar(50) DEFAULT 'fa-microchip',
  `unit` varchar(20) DEFAULT NULL,
  `topic` varchar(200) NOT NULL,
  `latest_value` decimal(12,4) DEFAULT NULL,
  `last_seen` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `sensor_readings` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `sensor_id` int UNSIGNED NOT NULL,
  `value` decimal(12,4) NOT NULL,
  `recorded_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `sessions` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `session_token` varchar(128) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `expires_at` datetime NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_token` (`session_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `users` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `role` enum('admin','user') DEFAULT 'user',
  `is_active` tinyint(1) DEFAULT 1,
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `mqtt_templates` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `slug` varchar(50) NOT NULL,
  `broker` varchar(200) NOT NULL,
  `port` int DEFAULT 1883,
  `use_ssl` tinyint(1) DEFAULT 0,
  `username` varchar(100) DEFAULT NULL,
  `path` varchar(100) DEFAULT '/mqtt',
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `mqtt_templates` (`name`, `slug`, `broker`, `port`, `use_ssl`, `username`, `path`, `description`) VALUES
('HiveMQ Cloud (Cluster)', 'hivemq', 'broker.hivemq.com', 8884, 1, NULL, '/mqtt', 'Broker publik HiveMQ dengan SSL/TLS.'),
('EMQX Cloud', 'emqx', 'broker.emqx.io', 8084, 1, NULL, '/mqtt', 'Broker cloud EMQX dengan SSL/TLS.'),
('Mosquitto (Eclipse)', 'mosquitto', 'test.mosquitto.org', 8081, 1, NULL, '/mqtt', 'Broker publik Mosquitto.'),
('Localhost (Development)', 'local', '127.0.0.1', 8083, 0, NULL, '/mqtt', 'Broker lokal untuk pengembangan.');

CREATE TABLE `user_settings` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `mqtt_template` varchar(50) DEFAULT 'hivemq',
  `mqtt_broker` varchar(200) DEFAULT 'broker.hivemq.com',
  `mqtt_port` int DEFAULT 8884,
  `mqtt_use_ssl` tinyint(1) DEFAULT 1,
  `mqtt_username` varchar(100) DEFAULT NULL,
  `mqtt_password_enc` text DEFAULT NULL,
  `mqtt_client_id` varchar(100) DEFAULT NULL,
  `mqtt_path` varchar(100) DEFAULT '/mqtt',
  `telegram_chat_id` varchar(100) DEFAULT NULL,
  `telegram_bot_token` varchar(255) DEFAULT NULL,
  `automation_lamp` tinyint(1) DEFAULT 1,
  `automation_fan` tinyint(1) DEFAULT 1,
  `automation_lock` tinyint(1) DEFAULT 1,
  `lamp_on_threshold` decimal(10,4) DEFAULT 0.3000,
  `lamp_off_threshold` decimal(10,4) DEFAULT 0.7000,
  `fan_temp_high` decimal(10,4) DEFAULT 30.0000,
  `fan_temp_normal` decimal(10,4) DEFAULT 25.0000,
  `lock_delay` int DEFAULT 5000,
  `theme` varchar(20) DEFAULT 'light',
  `quick_control_devices` json DEFAULT NULL,
  `cv_rules` json DEFAULT NULL,
  `cv_config` json DEFAULT NULL,
  `cv_min_confidence` decimal(10,4) DEFAULT 0.5000,
  `cv_dark_threshold` decimal(10,4) DEFAULT 0.3000,
  `cv_bright_threshold` decimal(10,4) DEFAULT 0.7000,
  `cv_human_rules_enabled` tinyint(1) DEFAULT 1,
  `cv_light_rules_enabled` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ========================
-- FOREIGN KEYS
-- ========================

ALTER TABLE `activity_logs`
  ADD CONSTRAINT FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `ai_chat_history`
  ADD CONSTRAINT FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `automation_rules`
  ADD CONSTRAINT FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `cv_state`
  ADD CONSTRAINT FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `devices`
  ADD CONSTRAINT FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `device_sessions`
  ADD CONSTRAINT FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `schedules`
  ADD CONSTRAINT FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `sensors`
  ADD CONSTRAINT FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `sensor_readings`
  ADD CONSTRAINT FOREIGN KEY (`sensor_id`) REFERENCES `sensors` (`id`) ON DELETE CASCADE;

ALTER TABLE `sessions`
  ADD CONSTRAINT FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `user_settings`
  ADD CONSTRAINT FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

COMMIT;
