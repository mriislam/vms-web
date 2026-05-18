-- =================================================================
--  VTS Live Demo Data — 10 in-progress trips, 15-min movement cycle
--  Run after full_sample_data.sql + vts_sample_vehicles.sql
--  mysql -uroot -pKyhb8@6ZM8QN vms_db < /opt/vms/vts_live_demo.sql
-- =================================================================

-- ── Fix stale in_progress records from past days ──────────────────
UPDATE vehicle_requisition
   SET status   = 'completed',
       end_time = start_time + INTERVAL distance/55 HOUR
 WHERE status = 'in_progress'
   AND date < CURDATE();

-- ── 10 live trips for today ───────────────────────────────────────
-- Each vehicle started at a different time so they are spread across their routes
--
--  #1  DHK-1234  Rahim Uddin     Dhaka → Chittagong   (SE, 250 km)
--  #2  DHK-5678  Karim Ali       Dhaka → Sylhet        (NE, 240 km)
--  #3  DHK-3301  Selim Hossain   Chittagong → Dhaka HQ (NW return, 250 km)
--  #4  SYL-0044  Motahar Ali     Dhaka → Rajshahi      (W,  260 km)
--  #5  DHK-4412  Farid Ahmed     Dhaka → Mymensingh    (N,  120 km)
--  #6  CTG-7788  Rubel Mia       Dhaka → Khulna        (SW, 280 km)
--  #7  DHK-9900  Nur Islam       Khulna → Dhaka HQ     (NE return, 280 km)
--  #8  CTG-4455  Nasim Uddin     Dhaka → Barisal       (S,  190 km)
--  #9  SYL-3322  Jalal Mia       Dhaka → Rangpur       (NW, 320 km)
-- #10  KHL-3300  Habib Ullah     Dhaka → Comilla       (E,  100 km)

INSERT INTO vehicle_requisition
  (dispatch_no, vehicle_reg, driver_name, origin, destination,
   distance, date, start_time, end_time, purpose, approved_by, fuel_used, status)
VALUES
  ('DSP-VTS-01','DHK-1234','Rahim Uddin',
   'Dhaka HQ','Chittagong',
   250, CURDATE(), NOW() - INTERVAL 3 HOUR, NULL,
   'Cargo delivery to Chittagong port', 'Admin', NULL, 'in_progress'),

  ('DSP-VTS-02','DHK-5678','Karim Ali',
   'Dhaka HQ','Sylhet',
   240, CURDATE(), NOW() - INTERVAL 2 HOUR, NULL,
   'Branch coordination — Sylhet office', 'Fleet Mgr', NULL, 'in_progress'),

  ('DSP-VTS-03','DHK-3301','Selim Hossain',
   'Chittagong','Dhaka HQ',
   250, CURDATE(), NOW() - INTERVAL 2 HOUR 30 MINUTE, NULL,
   'Return trip after cargo delivery', 'Admin', NULL, 'in_progress'),

  ('DSP-VTS-04','SYL-0044','Motahar Ali',
   'Dhaka HQ','Rajshahi',
   260, CURDATE(), NOW() - INTERVAL 1 HOUR 30 MINUTE, NULL,
   'Executive transport — Rajshahi division', 'Director', NULL, 'in_progress'),

  ('DSP-VTS-05','DHK-4412','Farid Ahmed',
   'Dhaka HQ','Mymensingh',
   120, CURDATE(), NOW() - INTERVAL 1 HOUR, NULL,
   'Parts collection from Mymensingh depot', 'Fleet Mgr', NULL, 'in_progress'),

  ('DSP-VTS-06','CTG-7788','Rubel Mia',
   'Dhaka HQ','Khulna',
   280, CURDATE(), NOW() - INTERVAL 4 HOUR, NULL,
   'Cargo delivery to Khulna port', 'Fleet Mgr', NULL, 'in_progress'),

  ('DSP-VTS-07','DHK-9900','Nur Islam',
   'Khulna','Dhaka HQ',
   280, CURDATE(), NOW() - INTERVAL 3 HOUR 30 MINUTE, NULL,
   'Return from Khulna distribution centre', 'Admin', NULL, 'in_progress'),

  ('DSP-VTS-08','CTG-4455','Nasim Uddin',
   'Dhaka HQ','Barisal',
   190, CURDATE(), NOW() - INTERVAL 2 HOUR, NULL,
   'Branch coordination — Barisal office', 'Fleet Mgr', NULL, 'in_progress'),

  ('DSP-VTS-09','SYL-3322','Jalal Mia',
   'Dhaka HQ','Rangpur',
   320, CURDATE(), NOW() - INTERVAL 4 HOUR 30 MINUTE, NULL,
   'Executive transport — Rangpur division', 'Director', NULL, 'in_progress'),

  ('DSP-VTS-10','KHL-3300','Habib Ullah',
   'Dhaka HQ','Comilla',
   100, CURDATE(), NOW() - INTERVAL 1 HOUR, NULL,
   'Parts collection from Comilla depot', 'Admin', NULL, 'in_progress')

ON DUPLICATE KEY UPDATE
  status     = VALUES(status),
  start_time = VALUES(start_time),
  end_time   = VALUES(end_time);

-- ── Verify ───────────────────────────────────────────────────────
SELECT dispatch_no, vehicle_reg, driver_name,
       CONCAT(origin,' → ',destination) AS route,
       distance, status, start_time
  FROM vehicle_requisition
 WHERE status = 'in_progress'
 ORDER BY start_time;
