-- =================================================================
--  VTS GPS Device Setup
--  Creates gps_devices table and seeds 5 tracked vehicles
--  Run: mysql -uroot -pKyhb8@6ZM8QN vms_db < /opt/vms/vts_gps_setup.sql
-- =================================================================

CREATE TABLE IF NOT EXISTS gps_devices (
  id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  vehicle_reg   VARCHAR(20)  NOT NULL UNIQUE,
  imei          VARCHAR(20)  NOT NULL UNIQUE,
  msisdn        VARCHAR(20)  NOT NULL,
  client_mobile VARCHAR(20)  NULL,
  client_id     VARCHAR(20)  NOT NULL UNIQUE,
  device_model  VARCHAR(40)  NOT NULL DEFAULT 'GT06N',
  status        VARCHAR(10)  NOT NULL DEFAULT 'active',
  last_seen     DATETIME     NULL,
  last_lat      DOUBLE       NULL,
  last_lng      DOUBLE       NULL,
  last_speed    DOUBLE       NULL DEFAULT 0,
  engine_status VARCHAR(10)  NOT NULL DEFAULT 'off',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vehicle_reg (vehicle_reg),
  INDEX idx_imei        (imei),
  INDEX idx_client_id   (client_id)
) ENGINE=InnoDB;

-- ── 5 GPS devices linked to our demo vehicles ─────────────────────
INSERT INTO gps_devices
  (vehicle_reg, imei, msisdn, client_mobile, client_id, device_model, status, engine_status)
VALUES
  ('DHK-1234','861100000000001','01700111001','01900111001','VMS-BD-001','Concox GT06N','active','on'),
  ('DHK-5678','861100000000002','01700111002','01900111002','VMS-BD-002','Concox GT06N','active','on'),
  ('DHK-3301','861100000000003','01700111003','01900111003','VMS-BD-003','Concox GT06N','active','on'),
  ('SYL-0044','861100000000004','01700111004','01900111004','VMS-BD-004','Concox TR06', 'active','on'),
  ('DHK-4412','861100000000005','01700111005','01900111005','VMS-BD-005','Concox TR06', 'active','on')
ON DUPLICATE KEY UPDATE
  engine_status = VALUES(engine_status);

-- ── Verify ────────────────────────────────────────────────────────
SELECT vehicle_reg, imei, msisdn, client_id, device_model, engine_status
  FROM gps_devices ORDER BY vehicle_reg;
