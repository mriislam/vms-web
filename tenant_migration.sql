-- ============================================================
-- NEXVMS Multi-Tenant Migration
-- Run ONCE on the database. Safe to re-run (IF NOT EXISTS / ignore errors).
-- ============================================================

-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id             BIGINT       AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  slug           VARCHAR(50)  NOT NULL UNIQUE,
  logo_url       VARCHAR(500),
  plan           VARCHAR(20)  DEFAULT 'starter',
  status         VARCHAR(20)  DEFAULT 'active',
  contact_email  VARCHAR(120),
  contact_phone  VARCHAR(20),
  address        VARCHAR(255),
  max_users      INT          DEFAULT 50,
  max_vehicles   INT          DEFAULT 100,
  trial_ends_at  DATE,
  created_at     DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Insert the default tenant for all existing data
INSERT IGNORE INTO tenants (id, name, slug, plan, status)
VALUES (1, 'Default Organization', 'default', 'enterprise', 'active');

-- 3. Add tenant_id to every data table (ignore "Duplicate column" errors — safe to re-run)
ALTER TABLE users               ADD COLUMN IF NOT EXISTS tenant_id BIGINT DEFAULT 1 AFTER id;
ALTER TABLE vehicles            ADD COLUMN IF NOT EXISTS tenant_id BIGINT DEFAULT 1 AFTER id;
ALTER TABLE drivers             ADD COLUMN IF NOT EXISTS tenant_id BIGINT DEFAULT 1 AFTER id;
ALTER TABLE fuel_records        ADD COLUMN IF NOT EXISTS tenant_id BIGINT DEFAULT 1 AFTER id;
ALTER TABLE maintenance         ADD COLUMN IF NOT EXISTS tenant_id BIGINT DEFAULT 1 AFTER id;
ALTER TABLE expenses            ADD COLUMN IF NOT EXISTS tenant_id BIGINT DEFAULT 1 AFTER id;
ALTER TABLE driver_leaves       ADD COLUMN IF NOT EXISTS tenant_id BIGINT DEFAULT 1 AFTER id;
ALTER TABLE inventory           ADD COLUMN IF NOT EXISTS tenant_id BIGINT DEFAULT 1 AFTER id;
ALTER TABLE notices             ADD COLUMN IF NOT EXISTS tenant_id BIGINT DEFAULT 1 AFTER id;
ALTER TABLE coordinators        ADD COLUMN IF NOT EXISTS tenant_id BIGINT DEFAULT 1 AFTER id;
ALTER TABLE vendors             ADD COLUMN IF NOT EXISTS tenant_id BIGINT DEFAULT 1 AFTER id;
ALTER TABLE routes              ADD COLUMN IF NOT EXISTS tenant_id BIGINT DEFAULT 1 AFTER id;
ALTER TABLE parking_slots       ADD COLUMN IF NOT EXISTS tenant_id BIGINT DEFAULT 1 AFTER id;
ALTER TABLE audit_logs          ADD COLUMN IF NOT EXISTS tenant_id BIGINT DEFAULT 1 AFTER id;
ALTER TABLE dispatches          ADD COLUMN IF NOT EXISTS tenant_id BIGINT DEFAULT 1 AFTER id;
ALTER TABLE accidents           ADD COLUMN IF NOT EXISTS tenant_id BIGINT DEFAULT 1 AFTER id;
ALTER TABLE gps_devices         ADD COLUMN IF NOT EXISTS tenant_id BIGINT DEFAULT 1 AFTER id;
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS tenant_id BIGINT DEFAULT 1 AFTER id;
ALTER TABLE requisitions        ADD COLUMN IF NOT EXISTS tenant_id BIGINT DEFAULT 1 AFTER id;
ALTER TABLE fuel_prices         ADD COLUMN IF NOT EXISTS tenant_id BIGINT DEFAULT 1 AFTER id;
ALTER TABLE service_centers     ADD COLUMN IF NOT EXISTS tenant_id BIGINT DEFAULT 1 AFTER id;
ALTER TABLE maintenance_parts   ADD COLUMN IF NOT EXISTS tenant_id BIGINT DEFAULT 1 AFTER id;
ALTER TABLE driver_leave_balances ADD COLUMN IF NOT EXISTS tenant_id BIGINT DEFAULT 1 AFTER id;
ALTER TABLE notice_reads        ADD COLUMN IF NOT EXISTS tenant_id BIGINT DEFAULT 1 AFTER id;
ALTER TABLE departments         ADD COLUMN IF NOT EXISTS tenant_id BIGINT DEFAULT 1 AFTER id;

-- 4. Backfill all existing rows to the default tenant
UPDATE users               SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE vehicles            SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE drivers             SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE fuel_records        SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE maintenance         SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE expenses            SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE driver_leaves       SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE inventory           SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE notices             SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE coordinators        SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE vendors             SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE routes              SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE parking_slots       SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE audit_logs          SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE dispatches          SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE accidents           SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE gps_devices         SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE notification_settings SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE requisitions        SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE fuel_prices         SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE service_centers     SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE maintenance_parts   SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE driver_leave_balances SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE notice_reads        SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE departments         SET tenant_id = 1 WHERE tenant_id IS NULL;

-- 5. Verify
SELECT 'Migration complete' AS status;
SELECT id, name, slug, status FROM tenants;
SELECT COUNT(*) AS total_users, MIN(tenant_id) AS min_tid, MAX(tenant_id) AS max_tid FROM users;
