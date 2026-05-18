-- =================================================================
--  VTS Live Demo Data
--  Run after full_sample_data.sql to set up 5 in-progress trips
--  for the live map demonstration.
--  mysql -uroot -pKyhb8@6ZM8QN vms_db < /opt/vms/vts_live_demo.sql
-- =================================================================

-- ── Fix stale in_progress records (completed trips from past days) ─
UPDATE vehicle_requisition
   SET status = 'completed',
       end_time = start_time + INTERVAL distance/55 HOUR
 WHERE status = 'in_progress'
   AND date < CURDATE();

-- ── 5 live trips for today ────────────────────────────────────────
-- Vehicle 1: DHK-1234  Rahim Uddin    Dhaka → Chittagong   (SE)
-- Vehicle 2: DHK-5678  Karim Ali      Dhaka → Sylhet        (NE)
-- Vehicle 3: DHK-3301  Selim Hossain  Chittagong → Dhaka HQ (NW, return)
-- Vehicle 4: SYL-0044  Motahar Ali    Dhaka → Rajshahi      (W)
-- Vehicle 5: DHK-4412  Farid Ahmed    Dhaka → Mymensingh    (N)

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
   'Parts collection from Mymensingh depot', 'Fleet Mgr', NULL, 'in_progress')

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
