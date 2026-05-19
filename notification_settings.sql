-- Notification provider configuration table
-- Run once against vms_db before starting the backend

CREATE TABLE IF NOT EXISTS notification_settings (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    channel     VARCHAR(20) NOT NULL UNIQUE COMMENT 'fcm | sms | email | whatsapp',
    enabled     TINYINT(1)  NOT NULL DEFAULT 0,
    config_json TEXT        NOT NULL DEFAULT '{}',
    created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert disabled defaults for all four channels
INSERT IGNORE INTO notification_settings (channel, enabled, config_json) VALUES
    ('fcm',      0, '{}'),
    ('sms',      0, '{}'),
    ('email',    0, '{}'),
    ('whatsapp', 0, '{}');
