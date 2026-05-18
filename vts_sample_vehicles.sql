-- =================================================================
--  VTS Sample Vehicles — 5 additional vehicles + 1 driver
--  Required by vts_live_demo.sql (trips for CTG-7788, DHK-9900,
--  CTG-4455, SYL-3322, KHL-3300)
--  Run BEFORE vts_live_demo.sql and vts_gps_setup.sql
--  mysql -uroot -pKyhb8@6ZM8QN vms_db < /opt/vms/vts_sample_vehicles.sql
-- =================================================================
USE vms_db;

-- ── Additional vehicles ───────────────────────────────────────────
INSERT IGNORE INTO vehicles
  (reg_no, make, model, year, type, ownership, color, fuel_type,
   chassis_no, engine_no, odometer, insurance_expiry, purchase_date,
   purchase_price, last_service, owner, status)
VALUES
  ('CTG-4455','Toyota',     'Hilux',   2023,'Pickup',  'Private',   'White', 'Diesel',
   'TY004455','EN004455', 12000,'2028-06-30','2023-01-20',3600000,'2026-04-10','Branch C', 'active'),

  ('SYL-3322','Toyota',     'Hiace',   2021,'Microbus','Special',   'Silver','Diesel',
   'TY003322','EN003322', 34500,'2027-09-15','2021-06-10',4200000,'2026-03-25','VIP Pool', 'active'),

  ('DHK-9900','Toyota',     'Corolla', 2022,'Sedan',   'Government','White', 'Petrol',
   'TY009900','EN009900', 21800,'2027-11-20','2022-04-05',2800000,'2026-05-01','HQ Fleet', 'active'),

  ('KHL-3300','Mitsubishi', 'L200',    2023,'Pickup',  'Private',   'Black', 'Diesel',
   'MT003300','EN003300',  8500,'2028-03-10','2023-07-15',3900000,'2026-04-20','Logistics','active');

-- ── Additional driver for CTG-4455 ───────────────────────────────
INSERT IGNORE INTO drivers
  (name, license_no, phone, nid, dob, blood_group, experience,
   join_date, address, ownership, status, last_trip, total_trips)
VALUES
  ('Nasim Uddin','DL-013-2023','01700-000013','3456712345','1994-11-08','O+', 2,
   '2023-10-01','Chittagong Sadar','Private','active','2026-05-18',62);

-- ── Leave balance for new driver ─────────────────────────────────
INSERT IGNORE INTO driver_leave_balance (driver_id, leave_type, total_days, used_days, year)
SELECT id,'Annual',14,0,2026 FROM drivers WHERE license_no='DL-013-2023' UNION ALL
SELECT id,'Sick',  10,0,2026 FROM drivers WHERE license_no='DL-013-2023' UNION ALL
SELECT id,'Casual', 7,0,2026 FROM drivers WHERE license_no='DL-013-2023';

-- ── Verify ────────────────────────────────────────────────────────
SELECT reg_no, make, model, type, status
  FROM vehicles
 WHERE reg_no IN ('CTG-4455','SYL-3322','DHK-9900','KHL-3300')
 ORDER BY reg_no;
