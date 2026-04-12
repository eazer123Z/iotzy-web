SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- ========================
-- CORE TABLES
-- ========================

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
  UNIQUE KEY `uk_users_username` (`username`),
  KEY `idx_users_email` (`email`)
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
  UNIQUE KEY `uk_sessions_token` (`session_token`),
  KEY `idx_sessions_user_expires` (`user_id`,`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `persistent_sessions` (
  `id` varchar(128) NOT NULL,
  `data` mediumtext NOT NULL,
  `timestamp` int UNSIGNED NOT NULL,
  PRIMARY KEY (`id`)
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
  UNIQUE KEY `uk_mqtt_templates_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
  UNIQUE KEY `uk_user_settings_user` (`user_id`),
  KEY `idx_user_settings_telegram_chat_id` (`telegram_chat_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================
-- TEMPLATE TABLES
-- ========================

CREATE TABLE `device_templates` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `device_type` varchar(50) NOT NULL,
  `control_mode` enum('binary','range','state') NOT NULL DEFAULT 'binary',
  `default_icon` varchar(50) DEFAULT 'fa-plug',
  `state_on_label` varchar(30) DEFAULT NULL,
  `state_off_label` varchar(30) DEFAULT NULL,
  `default_min_value` decimal(12,4) DEFAULT NULL,
  `default_max_value` decimal(12,4) DEFAULT NULL,
  `default_step_value` decimal(12,4) DEFAULT NULL,
  `default_topic_sub_pattern` varchar(200) DEFAULT NULL,
  `default_topic_pub_pattern` varchar(200) DEFAULT NULL,
  `meta` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `sort_order` int DEFAULT 0,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_device_templates_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `sensor_templates` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug` varchar(50) NOT NULL,
  `family` varchar(50) NOT NULL,
  `metric` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `sensor_type` varchar(50) NOT NULL,
  `default_icon` varchar(50) DEFAULT 'fa-microchip',
  `default_unit` varchar(20) DEFAULT NULL,
  `output_kind` enum('numeric','binary','enum') NOT NULL DEFAULT 'numeric',
  `default_topic_pattern` varchar(200) DEFAULT NULL,
  `supports_device_link` tinyint(1) DEFAULT 0,
  `is_power_metric` tinyint(1) DEFAULT 0,
  `sort_order` int DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sensor_templates_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================
-- DEVICE / SENSOR TABLES
-- ========================

CREATE TABLE `devices` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `device_template_id` int UNSIGNED DEFAULT NULL,
  `device_key` varchar(100) NOT NULL,
  `name` varchar(100) NOT NULL,
  `icon` varchar(50) DEFAULT 'fa-plug',
  `type` varchar(50) DEFAULT 'switch',
  `topic_sub` varchar(200) DEFAULT NULL,
  `topic_pub` varchar(200) DEFAULT NULL,
  `control_value` decimal(12,4) DEFAULT NULL,
  `control_text` varchar(100) DEFAULT NULL,
  `state_on_label` varchar(30) DEFAULT NULL,
  `state_off_label` varchar(30) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `last_state` tinyint(1) DEFAULT 0,
  `latest_state` tinyint(1) DEFAULT 0,
  `last_seen` datetime DEFAULT NULL,
  `last_state_changed` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_devices_device_key` (`device_key`),
  KEY `idx_devices_user_created` (`user_id`,`created_at`),
  KEY `idx_devices_template` (`device_template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `device_sessions` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `device_id` int UNSIGNED NOT NULL,
  `turned_on_at` datetime NOT NULL,
  `turned_off_at` datetime DEFAULT NULL,
  `duration_seconds` int UNSIGNED DEFAULT NULL,
  `trigger_type` varchar(50) DEFAULT 'Manual',
  `energy_wh` decimal(12,4) DEFAULT NULL,
  `avg_power_watts` decimal(12,4) DEFAULT NULL,
  `peak_power_watts` decimal(12,4) DEFAULT NULL,
  `latest_power_watts` decimal(12,4) DEFAULT NULL,
  `energy_source` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_device_sessions_user_time` (`user_id`,`turned_on_at`),
  KEY `idx_device_sessions_device_time` (`device_id`,`turned_on_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `sensors` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `device_id` int UNSIGNED DEFAULT NULL,
  `sensor_template_id` int UNSIGNED DEFAULT NULL,
  `sensor_key` varchar(100) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` varchar(50) NOT NULL,
  `icon` varchar(50) DEFAULT 'fa-microchip',
  `unit` varchar(20) DEFAULT NULL,
  `topic` varchar(200) NOT NULL,
  `latest_value` decimal(12,4) DEFAULT NULL,
  `last_seen` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sensors_sensor_key` (`sensor_key`),
  KEY `idx_sensors_user_created` (`user_id`,`created_at`),
  KEY `idx_sensors_device_created` (`device_id`,`created_at`),
  KEY `idx_sensors_template` (`sensor_template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- NOTE: sensor_readings will grow unbounded. For production at scale, consider:
-- 1. Partitioning by month: ALTER TABLE sensor_readings PARTITION BY RANGE (TO_DAYS(recorded_at)) ...
-- 2. Ensure cron cleanup (iotzy_cleanup_sensor_readings) runs daily
-- 3. For high-volume deployments, consider TimescaleDB or InfluxDB
CREATE TABLE `sensor_readings` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `sensor_id` int UNSIGNED NOT NULL,
  `value` decimal(12,4) NOT NULL,
  `recorded_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sensor_readings_sensor_time` (`sensor_id`,`recorded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================
-- LOGS / AUTOMATION / CHAT
-- ========================

CREATE TABLE `activity_logs` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `device_id` int UNSIGNED DEFAULT NULL,
  `sensor_id` int UNSIGNED DEFAULT NULL,
  `device_name` varchar(100) NOT NULL,
  `activity` varchar(200) NOT NULL,
  `trigger_type` varchar(50) NOT NULL,
  `log_type` enum('info','success','warning','error') DEFAULT 'info',
  `metadata` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_activity_logs_user_time` (`user_id`,`created_at`),
  KEY `idx_activity_logs_device_time` (`device_id`,`created_at`),
  KEY `idx_activity_logs_sensor_time` (`sensor_id`,`created_at`)
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
  PRIMARY KEY (`id`),
  KEY `idx_automation_rules_user_enabled` (`user_id`,`is_enabled`),
  KEY `idx_automation_rules_sensor` (`sensor_id`),
  KEY `idx_automation_rules_device` (`device_id`)
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
  PRIMARY KEY (`id`),
  KEY `idx_schedules_user_time` (`user_id`,`time_hhmm`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `ai_chat_history` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `sender` enum('user','bot') NOT NULL,
  `message` text NOT NULL,
  `platform` varchar(20) DEFAULT 'web',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ai_chat_history_user_time` (`user_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `ai_chat_history_archive` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `sender` enum('user','bot') NOT NULL,
  `message` text NOT NULL,
  `platform` varchar(20) DEFAULT 'web',
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ai_chat_history_archive_user_time` (`user_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `ai_rate_limits` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `action_name` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ai_rate_limits_user_time` (`user_id`,`action_name`,`created_at`),
  KEY `idx_ai_rate_limits_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `ai_token_metrics` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `prompt_tokens` int UNSIGNED NOT NULL,
  `history_tokens` int UNSIGNED NOT NULL,
  `context_tokens` int UNSIGNED NOT NULL,
  `response_tokens` int UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ai_token_metrics_user_time` (`user_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================
-- CAMERA MODULE
-- ========================

CREATE TABLE `cameras` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `camera_key` varchar(100) NOT NULL,
  `name` varchar(100) NOT NULL,
  `source_type` enum('mjpeg','hls','webrtc','rtsp_proxy','snapshot') NOT NULL DEFAULT 'snapshot',
  `preview_url` varchar(255) DEFAULT NULL,
  `stream_url` varchar(255) DEFAULT NULL,
  `snapshot_url` varchar(255) DEFAULT NULL,
  `topic_sub` varchar(200) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `last_seen` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cameras_camera_key` (`camera_key`),
  KEY `idx_cameras_user_created` (`user_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `camera_settings` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `camera_id` int UNSIGNED NOT NULL,
  `show_bounding_box` tinyint(1) DEFAULT 1,
  `show_debug_info` tinyint(1) DEFAULT 1,
  `min_confidence` decimal(10,4) DEFAULT 0.5000,
  `dark_threshold` decimal(10,4) DEFAULT 0.3000,
  `bright_threshold` decimal(10,4) DEFAULT 0.7000,
  `human_rules_enabled` tinyint(1) DEFAULT 1,
  `light_rules_enabled` tinyint(1) DEFAULT 1,
  `cv_rules` json DEFAULT NULL,
  `cv_config` json DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_camera_settings_camera` (`camera_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `cv_state` (
  `camera_id` int UNSIGNED NOT NULL,
  `is_active` tinyint(1) DEFAULT 0,
  `model_loaded` tinyint(1) DEFAULT 0,
  `person_count` int DEFAULT 0,
  `brightness` int DEFAULT 0,
  `light_condition` varchar(20) DEFAULT 'unknown',
  `last_updated` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`camera_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `camera_stream_sessions` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `camera_id` int UNSIGNED NOT NULL,
  `stream_key` varchar(120) NOT NULL,
  `publisher_camera_key` varchar(100) NOT NULL,
  `publisher_name` varchar(100) NOT NULL,
  `source_label` varchar(100) DEFAULT NULL,
  `viewer_camera_key` varchar(100) DEFAULT NULL,
  `viewer_name` varchar(100) DEFAULT NULL,
  `offer_sdp` text DEFAULT NULL,
  `answer_sdp` text DEFAULT NULL,
  `status` enum('idle','awaiting_viewer','connecting','live','ended') NOT NULL DEFAULT 'idle',
  `started_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `last_publisher_heartbeat` datetime DEFAULT CURRENT_TIMESTAMP,
  `last_viewer_heartbeat` datetime DEFAULT NULL,
  `ended_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_camera_stream_sessions_stream_key` (`stream_key`),
  KEY `idx_camera_stream_sessions_user_status` (`user_id`,`status`,`updated_at`),
  KEY `idx_camera_stream_sessions_camera` (`camera_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `camera_stream_candidates` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `stream_session_id` int UNSIGNED NOT NULL,
  `sender_camera_key` varchar(100) NOT NULL,
  `recipient_camera_key` varchar(100) NOT NULL,
  `candidate_json` text NOT NULL,
  `delivered_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_camera_stream_candidates_recipient` (`stream_session_id`,`recipient_camera_key`,`delivered_at`,`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================
-- SEEDS
-- ========================

INSERT INTO `mqtt_templates` (`name`, `slug`, `broker`, `port`, `use_ssl`, `username`, `path`, `description`) VALUES
('HiveMQ Cloud (Cluster)', 'hivemq', 'broker.hivemq.com', 8884, 1, NULL, '/mqtt', 'Broker publik HiveMQ dengan SSL/TLS.'),
('EMQX Cloud', 'emqx', 'broker.emqx.io', 8084, 1, NULL, '/mqtt', 'Broker cloud EMQX dengan SSL/TLS.'),
('Mosquitto (Eclipse)', 'mosquitto', 'test.mosquitto.org', 8081, 1, NULL, '/mqtt', 'Broker publik Mosquitto.'),
('Localhost (Development)', 'local', '127.0.0.1', 8083, 0, NULL, '/mqtt', 'Broker lokal untuk pengembangan.');

INSERT INTO `device_templates`
  (`slug`, `name`, `device_type`, `control_mode`, `default_icon`, `state_on_label`, `state_off_label`, `default_min_value`, `default_max_value`, `default_step_value`, `default_topic_sub_pattern`, `default_topic_pub_pattern`, `meta`, `is_active`, `sort_order`)
VALUES
  ('led_lamp', 'LED Lamp', 'light', 'binary', 'fa-lightbulb', 'ON', 'OFF', NULL, NULL, NULL, 'iotzy/{device_key}/status', 'iotzy/{device_key}/set', JSON_OBJECT('category', 'lighting'), 1, 1),
  ('fan_5v', 'Fan 5V', 'fan', 'binary', 'fa-wind', 'ON', 'OFF', NULL, NULL, NULL, 'iotzy/{device_key}/status', 'iotzy/{device_key}/set', JSON_OBJECT('category', 'cooling'), 1, 2),
  ('servo', 'Servo', 'servo', 'range', 'fa-gear', NULL, NULL, 0, 180, 1, 'iotzy/{device_key}/angle', 'iotzy/{device_key}/set', JSON_OBJECT('value_unit', 'degree'), 1, 3),
  ('door_lock', 'Door Lock', 'lock', 'state', 'fa-lock', 'LOCKED', 'UNLOCKED', NULL, NULL, NULL, 'iotzy/{device_key}/status', 'iotzy/{device_key}/set', JSON_OBJECT('category', 'access'), 1, 4);

INSERT INTO `sensor_templates`
  (`slug`, `family`, `metric`, `name`, `sensor_type`, `default_icon`, `default_unit`, `output_kind`, `default_topic_pattern`, `supports_device_link`, `is_power_metric`, `sort_order`, `is_active`)
VALUES
  ('dht22_temperature', 'dht22', 'temperature', 'DHT22 Temperature', 'temperature', 'fa-temperature-half', 'C', 'numeric', 'iotzy/{device_key}/dht22/temperature', 0, 0, 1, 1),
  ('dht22_humidity', 'dht22', 'humidity', 'DHT22 Humidity', 'humidity', 'fa-droplet', '%', 'numeric', 'iotzy/{device_key}/dht22/humidity', 0, 0, 2, 1),
  ('ina219_voltage', 'ina219', 'voltage', 'INA219 Voltage', 'voltage', 'fa-bolt', 'V', 'numeric', 'iotzy/{device_key}/ina219/voltage', 1, 1, 3, 1),
  ('ina219_current', 'ina219', 'current', 'INA219 Current', 'current', 'fa-bolt', 'A', 'numeric', 'iotzy/{device_key}/ina219/current', 1, 1, 4, 1),
  ('ina219_power', 'ina219', 'power', 'INA219 Power', 'power', 'fa-bolt', 'W', 'numeric', 'iotzy/{device_key}/ina219/power', 1, 1, 5, 1),
  ('pir_motion', 'pir', 'motion', 'PIR Motion', 'motion', 'fa-person-running', '', 'binary', 'iotzy/{device_key}/pir/motion', 0, 0, 6, 1),
  ('mq2_gas', 'mq2', 'gas', 'MQ-2 Gas', 'gas', 'fa-triangle-exclamation', 'ppm', 'numeric', 'iotzy/{device_key}/mq2/gas', 0, 0, 7, 1),
  ('ultrasonic_distance', 'ultrasonic', 'distance', 'Ultrasonic Distance', 'distance', 'fa-ruler-horizontal', 'cm', 'numeric', 'iotzy/{device_key}/ultrasonic/distance', 0, 0, 8, 1);

-- ========================
-- FOREIGN KEYS
-- ========================

ALTER TABLE `sessions`
  ADD CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `user_settings`
  ADD CONSTRAINT `fk_user_settings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `devices`
  ADD CONSTRAINT `fk_devices_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_devices_template` FOREIGN KEY (`device_template_id`) REFERENCES `device_templates` (`id`) ON DELETE SET NULL;

ALTER TABLE `device_sessions`
  ADD CONSTRAINT `fk_device_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_device_sessions_device` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE;

ALTER TABLE `sensors`
  ADD CONSTRAINT `fk_sensors_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sensors_device` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_sensors_template` FOREIGN KEY (`sensor_template_id`) REFERENCES `sensor_templates` (`id`) ON DELETE SET NULL;

ALTER TABLE `sensor_readings`
  ADD CONSTRAINT `fk_sensor_readings_sensor` FOREIGN KEY (`sensor_id`) REFERENCES `sensors` (`id`) ON DELETE CASCADE;

ALTER TABLE `activity_logs`
  ADD CONSTRAINT `fk_activity_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_activity_logs_device` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_activity_logs_sensor` FOREIGN KEY (`sensor_id`) REFERENCES `sensors` (`id`) ON DELETE SET NULL;

ALTER TABLE `automation_rules`
  ADD CONSTRAINT `fk_automation_rules_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_automation_rules_sensor` FOREIGN KEY (`sensor_id`) REFERENCES `sensors` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_automation_rules_device` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE;

ALTER TABLE `schedules`
  ADD CONSTRAINT `fk_schedules_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `ai_chat_history`
  ADD CONSTRAINT `fk_ai_chat_history_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `cameras`
  ADD CONSTRAINT `fk_cameras_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `camera_settings`
  ADD CONSTRAINT `fk_camera_settings_camera` FOREIGN KEY (`camera_id`) REFERENCES `cameras` (`id`) ON DELETE CASCADE;

ALTER TABLE `cv_state`
  ADD CONSTRAINT `fk_cv_state_camera` FOREIGN KEY (`camera_id`) REFERENCES `cameras` (`id`) ON DELETE CASCADE;

ALTER TABLE `camera_stream_sessions`
  ADD CONSTRAINT `fk_camera_stream_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_camera_stream_sessions_camera` FOREIGN KEY (`camera_id`) REFERENCES `cameras` (`id`) ON DELETE CASCADE;

ALTER TABLE `camera_stream_candidates`
  ADD CONSTRAINT `fk_camera_stream_candidates_session` FOREIGN KEY (`stream_session_id`) REFERENCES `camera_stream_sessions` (`id`) ON DELETE CASCADE;

COMMIT;
