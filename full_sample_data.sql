-- =============================================================
--  VMS — Full Sample Data (all tables, May 2026 current period)
--  Run: mysql -uroot -p vms_db < full_sample_data.sql
-- =============================================================
USE vms_db;

-- ─────────────────────────────────────────────────────────────
--  1. VEHICLES  (supplement — add more diverse fleet)
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO vehicles
  (reg_no,make,model,year,type,ownership,color,fuel_type,chassis_no,engine_no,odometer,insurance_expiry,purchase_date,purchase_price,last_service,owner,status) VALUES
  ('DHK-3301','Toyota',    'Hiace',       2022,'Microbus','Government','White',  'Diesel','TY003301','EN003301',28500,'2027-01-15','2022-05-10',3800000,'2026-05-05','HQ Fleet',  'active'),
  ('DHK-4412','Mitsubishi','Pajero',      2021,'SUV',     'Special',   'Black',  'Diesel','MT004412','EN004412',19200,'2026-10-20','2021-08-01',7200000,'2026-04-18','Director',  'active'),
  ('CTG-7788','Tata',      'Ace',         2020,'Pickup',  'Private',   'Blue',   'Diesel','TA007788','EN007788',55000,'2026-07-30','2020-11-05',2100000,'2026-03-20','Branch B',  'active'),
  ('SYL-0044','Toyota',    'Prado',       2023,'SUV',     'Special',   'Silver', 'Diesel','TY000044','EN000044', 8900,'2028-02-10','2023-03-15',9500000,'2026-05-10','VIP Pool',  'active'),
  ('DHK-6623','Isuzu',     'Elf',         2019,'Truck',   'Government','White',  'Diesel','IZ006623','EN006623',82000,'2026-05-15','2019-09-20',3600000,'2025-11-10','Logistics', 'inactive');

-- ─────────────────────────────────────────────────────────────
--  2. DRIVERS  (supplement)
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO drivers
  (name,license_no,phone,nid,dob,blood_group,experience,join_date,address,ownership,status,last_trip,total_trips) VALUES
  ('Selim Hossain', 'DL-006-2019','01700-000006','6789012345','1982-07-14','B-', 10,'2019-06-01','Comilla',       'Government','active',  '2026-05-17',289),
  ('Rubel Mia',     'DL-007-2020','01700-000007','7890123456','1989-12-03','O-', 6, '2020-03-15','Savar, Dhaka',  'Private',   'active',  '2026-05-16',201),
  ('Nur Islam',     'DL-008-2021','01700-000008','8901234567','1995-04-22','A+', 4, '2021-09-01','Keraniganj',    'Private',   'active',  '2026-05-15',134),
  ('Motahar Ali',   'DL-009-2018','01700-000009','9012345678','1975-01-30','AB-',14,'2012-01-20','Manikganj',     'Government','active',  '2026-05-18',678),
  ('Zahir Uddin',   'DL-010-2023','01700-000010','0123456789','1997-08-11','B+', 2, '2023-07-01','Wari, Dhaka',   'Private',   'active',  '2026-05-14', 48),
  ('Karim Mia',     'DL-011-2017','01700-000011','1234509876','1970-05-25','A+', 16,'2009-04-10','Narayanganj',   'Government','inactive','2026-04-30',925),
  ('Habib Ullah',   'DL-012-2022','01700-000012','2345609876','1991-09-19','O+', 4, '2022-11-01','Tongi, Gazipur','Private',   'active',  '2026-05-17',110);

-- ─────────────────────────────────────────────────────────────
--  3. DRIVER LEAVE BALANCE  (2026 for new drivers)
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO driver_leave_balance (driver_id,leave_type,total_days,used_days,year)
SELECT id,'Annual',14,3,2026 FROM drivers WHERE license_no='DL-006-2019' UNION ALL
SELECT id,'Sick',  10,1,2026 FROM drivers WHERE license_no='DL-006-2019' UNION ALL
SELECT id,'Casual', 7,0,2026 FROM drivers WHERE license_no='DL-006-2019' UNION ALL
SELECT id,'Annual',14,0,2026 FROM drivers WHERE license_no='DL-007-2020' UNION ALL
SELECT id,'Sick',  10,2,2026 FROM drivers WHERE license_no='DL-007-2020' UNION ALL
SELECT id,'Annual',14,5,2026 FROM drivers WHERE license_no='DL-008-2021' UNION ALL
SELECT id,'Annual',14,2,2026 FROM drivers WHERE license_no='DL-009-2018' UNION ALL
SELECT id,'Sick',  10,0,2026 FROM drivers WHERE license_no='DL-009-2018' UNION ALL
SELECT id,'Annual',14,0,2026 FROM drivers WHERE license_no='DL-010-2023' UNION ALL
SELECT id,'Annual',14,1,2026 FROM drivers WHERE license_no='DL-012-2022';

-- ─────────────────────────────────────────────────────────────
--  4. VEHICLE REQUISITION / DISPATCH  (this week + recent May)
--     Dispatch entity maps to vehicle_requisition table
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO vehicle_requisition
  (dispatch_no,vehicle_reg,driver_name,origin,destination,distance,date,start_time,end_time,purpose,approved_by,fuel_used,status) VALUES
-- ── May 12, Tuesday ──────────────────────────────────────────
('DSP-100','DHK-1234','Rahim Uddin',   'Dhaka HQ',       'Chittagong Port',    250,'2026-05-12','2026-05-12 07:00:00','2026-05-12 17:30:00','Cargo delivery',        'Admin',     18.0,'completed'),
('DSP-101','SYL-3322','Jalal Mia',     'Dhaka HQ',       'Sylhet Office',      240,'2026-05-12','2026-05-12 08:30:00','2026-05-12 15:00:00','VIP transport',         'Fleet Mgr',  NULL,'completed'),
('DSP-102','DHK-3301','Selim Hossain', 'Dhaka HQ',       'Gazipur Factory',     45,'2026-05-12','2026-05-12 09:00:00','2026-05-12 13:30:00','Parts delivery',        'Admin',      3.5,'completed'),
-- ── May 13, Wednesday ────────────────────────────────────────
('DSP-103','DHK-5678','Karim Ali',     'Dhaka HQ',       'Narayanganj',         30,'2026-05-13','2026-05-13 08:00:00','2026-05-13 12:00:00','Document delivery',     'Admin',      2.8,'completed'),
('DSP-104','CTG-7788','Rubel Mia',     'Chittagong HQ',  'Cox Bazar',          150,'2026-05-13','2026-05-13 07:30:00','2026-05-13 14:00:00','Inspection trip',       'Fleet Mgr', 11.5,'completed'),
('DSP-105','SYL-0044','Motahar Ali',   'Dhaka HQ',       'Airport',             25,'2026-05-13','2026-05-13 10:00:00','2026-05-13 12:00:00','Airport pickup',        'Admin',      NULL,'completed'),
-- ── May 14, Thursday ─────────────────────────────────────────
('DSP-106','DHK-4412','Farid Ahmed',   'Dhaka HQ',       'Savar EPZ',           40,'2026-05-14','2026-05-14 09:00:00','2026-05-14 14:00:00','Factory visit',         'Admin',      3.8,'completed'),
('DSP-107','DHK-1234','Rahim Uddin',   'Chittagong Port','Dhaka HQ',           250,'2026-05-14','2026-05-14 06:00:00','2026-05-14 16:30:00','Return trip',           'Admin',     19.0,'completed'),
-- ── May 15, Friday ───────────────────────────────────────────
('DSP-108','DHK-5678','Karim Ali',     'Dhaka HQ',       'Rajshahi',           260,'2026-05-15','2026-05-15 07:00:00','2026-05-15 18:00:00','Branch visit',          'Fleet Mgr',  NULL,'in_progress'),
('DSP-109','DHK-3301','Selim Hossain', 'Dhaka HQ',       'Tangail',             90,'2026-05-15','2026-05-15 08:30:00','2026-05-15 13:30:00','Goods delivery',        'Admin',      7.2,'completed'),
('DSP-110','DHK-9900','Nur Islam',     'Dhaka HQ',       'Manikganj',           65,'2026-05-15','2026-05-15 10:00:00','2026-05-15 14:00:00','Staff transport',       'Admin',      5.0,'completed'),
-- ── May 16, Saturday ─────────────────────────────────────────
('DSP-111','CTG-4455','Rubel Mia',     'Chittagong HQ',  'Comilla',             90,'2026-05-16','2026-05-16 08:00:00','2026-05-16 13:00:00','Client meeting',        'Fleet Mgr',  6.5,'completed'),
('DSP-112','SYL-0044','Motahar Ali',   'Dhaka HQ',       'Sylhet',             240,'2026-05-16','2026-05-16 07:00:00','2026-05-16 15:30:00','Executive transport',   'Director',   NULL,'completed'),
-- ── May 17, Sunday ───────────────────────────────────────────
('DSP-113','DHK-4412','Farid Ahmed',   'Dhaka HQ',       'Narsingdi',           60,'2026-05-17','2026-05-17 09:00:00','2026-05-17 13:00:00','Document courier',      'Admin',      4.5,'completed'),
('DSP-114','DHK-1234','Rahim Uddin',   'Dhaka HQ',       'Mymensingh',         120,'2026-05-17','2026-05-17 07:30:00','2026-05-17 14:00:00','Parts collection',      'Fleet Mgr',  9.0,'completed'),
('DSP-115','DHK-5678','Karim Ali',     'Rajshahi',       'Dhaka HQ',           260,'2026-05-17','2026-05-17 18:00:00', NULL,                'Return trip',           'Fleet Mgr',  NULL,'in_progress'),
-- ── May 18, Monday (Today) ───────────────────────────────────
('DSP-116','DHK-3301','Selim Hossain', 'Dhaka HQ',       'Chittagong',         250,'2026-05-18','2026-05-18 06:30:00', NULL,                'Urgent cargo delivery', 'Admin',      NULL,'in_progress'),
('DSP-117','SYL-3322','Nasir Hossain', 'Dhaka HQ',       'Gazipur',             45,'2026-05-18','2026-05-18 09:00:00', NULL,                'Staff pickup',          'Admin',      NULL,'approved'),
('DSP-118','DHK-9900','Zahir Uddin',   'Dhaka HQ',       'Mirpur DOHS',         15,'2026-05-18','2026-05-18 10:30:00', NULL,                'Document delivery',     'Fleet Mgr',  NULL,'pending'),
('DSP-119','DHK-4412','Motahar Ali',   'Dhaka HQ',       'Airport',             25,'2026-05-18','2026-05-18 14:00:00', NULL,                'VIP airport transfer',  'Director',   NULL,'pending'),
-- ── Earlier May (May 1–11) ───────────────────────────────────
('DSP-050','DHK-1234','Rahim Uddin',   'Dhaka HQ',       'Chittagong',         250,'2026-05-02','2026-05-02 07:00:00','2026-05-02 17:30:00','Monthly cargo run',     'Admin',     18.5,'completed'),
('DSP-051','DHK-5678','Karim Ali',     'Dhaka HQ',       'Sylhet',             240,'2026-05-04','2026-05-04 08:00:00','2026-05-04 15:30:00','Branch coordination',   'Fleet Mgr', 13.2,'completed'),
('DSP-052','CTG-4455','Rubel Mia',     'Chittagong HQ',  'Cox Bazar',          150,'2026-05-06','2026-05-06 07:30:00','2026-05-06 13:30:00','Site inspection',       'Fleet Mgr', 11.0,'completed'),
('DSP-053','DHK-3301','Selim Hossain', 'Dhaka HQ',       'Gazipur',             45,'2026-05-07','2026-05-07 09:00:00','2026-05-07 13:30:00','Equipment delivery',    'Admin',      3.2,'completed'),
('DSP-054','SYL-0044','Motahar Ali',   'Dhaka HQ',       'Sylhet',             240,'2026-05-08','2026-05-08 07:00:00','2026-05-08 15:00:00','VIP transport',         'Director',   NULL,'completed'),
('DSP-055','DHK-9900','Nur Islam',     'Dhaka HQ',       'Narayanganj',         30,'2026-05-09','2026-05-09 10:00:00','2026-05-09 12:30:00','Document delivery',     'Admin',      2.2,'completed'),
('DSP-056','DHK-4412','Farid Ahmed',   'Dhaka HQ',       'Savar',               40,'2026-05-11','2026-05-11 09:00:00','2026-05-11 13:00:00','Staff transport',       'Admin',      3.5,'completed');

-- ─────────────────────────────────────────────────────────────
--  5. FUEL RECORDS  (May 2026 + backfill Dec 2025–Feb 2026)
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO fuel_records
  (slip_no,vehicle_reg,driver_name,fuel_type,liters,price_per_liter,total,date,station,odo_before,odo_after,approved_by) VALUES
-- December 2025
('SLP-D01','DHK-1234','Rahim Uddin',   'Diesel',45.0,107.00,4815.00,'2025-12-05','Padma Filling Station',  38500,39050,'Admin'),
('SLP-D02','DHK-5678','Karim Ali',     'Diesel',40.0,107.00,4280.00,'2025-12-10','Eastern Fuel',           27800,28300,'Fleet Mgr'),
('SLP-D03','CTG-4455','Selim Hossain', 'Diesel',50.0,107.00,5350.00,'2025-12-15','Port Filling Station',   58000,58700,'Admin'),
('SLP-D04','SYL-3322','Nasir Hossain', 'Petrol',35.0,123.00,4305.00,'2025-12-18','Eastern Fuel',           14200,14600,'Fleet Mgr'),
('SLP-D05','DHK-1234','Rahim Uddin',   'Diesel',42.0,107.00,4494.00,'2025-12-25','Motijheel Filling',      39050,39590,'Admin'),
('SLP-D06','DHK-9900','Habib Ullah',   'Diesel',38.0,107.00,4066.00,'2025-12-28','Padma Filling Station',  19800,20350,'Fleet Mgr'),
-- January 2026
('SLP-J01','DHK-1234','Rahim Uddin',   'Diesel',45.0,108.00,4860.00,'2026-01-03','Padma Filling Station',  39590,40130,'Admin'),
('SLP-J02','DHK-5678','Karim Ali',     'Diesel',40.0,108.00,4320.00,'2026-01-07','Eastern Fuel',           28300,28800,'Fleet Mgr'),
('SLP-J03','DHK-3301','Selim Hossain', 'Diesel',38.0,108.00,4104.00,'2026-01-10','City Petrol Pump',        4200, 4650,'Admin'),
('SLP-J04','CTG-4455','Rubel Mia',     'Diesel',50.0,108.00,5400.00,'2026-01-15','Port Filling Station',   58700,59400,'Admin'),
('SLP-J05','SYL-0044','Motahar Ali',   'Diesel',30.0,108.00,3240.00,'2026-01-18','Sylhet Pump',             1200, 1600,'Director'),
('SLP-J06','DHK-9900','Nur Islam',     'Diesel',35.0,108.00,3780.00,'2026-01-22','Padma Filling Station',  20350,20850,'Admin'),
('SLP-J07','DHK-4412','Farid Ahmed',   'Diesel',32.0,108.00,3456.00,'2026-01-27','Motijheel Filling',       2500, 2900,'Fleet Mgr'),
-- February 2026
('SLP-F01','DHK-1234','Rahim Uddin',   'Diesel',46.0,108.00,4968.00,'2026-02-04','Padma Filling Station',  40130,40700,'Admin'),
('SLP-F02','DHK-5678','Karim Ali',     'Diesel',42.0,108.00,4536.00,'2026-02-08','Eastern Fuel',           28800,29340,'Fleet Mgr'),
('SLP-F03','DHK-3301','Selim Hossain', 'Diesel',40.0,108.00,4320.00,'2026-02-12','City Petrol Pump',        4650, 5170,'Admin'),
('SLP-F04','CTG-7788','Rubel Mia',     'Diesel',48.0,108.00,5184.00,'2026-02-15','Chittagong Pump',        44000,44600,'Fleet Mgr'),
('SLP-F05','SYL-3322','Nasir Hossain', 'Petrol',36.0,124.00,4464.00,'2026-02-20','Eastern Fuel',           14600,15000,'Admin'),
('SLP-F06','DHK-9900','Zahir Uddin',   'Diesel',30.0,108.00,3240.00,'2026-02-25','Padma Filling Station',  20850,21280,'Fleet Mgr'),
-- March 2026 (supplement existing)
('SLP-M01','DHK-3301','Selim Hossain', 'Diesel',38.0,109.00,4142.00,'2026-03-05','City Petrol Pump',        5170, 5640,'Admin'),
('SLP-M02','SYL-0044','Motahar Ali',   'Diesel',32.0,109.00,3488.00,'2026-03-12','Sylhet Pump',             1600, 2000,'Director'),
('SLP-M03','DHK-4412','Farid Ahmed',   'Diesel',35.0,109.00,3815.00,'2026-03-18','Motijheel Filling',       2900, 3380,'Fleet Mgr'),
('SLP-M04','CTG-7788','Rubel Mia',     'Diesel',48.0,109.00,5232.00,'2026-03-24','Chittagong Pump',        44600,45200,'Admin'),
-- April 2026 (supplement existing SLP-001 to SLP-008)
('SLP-A01','DHK-3301','Selim Hossain', 'Diesel',40.0,109.00,4360.00,'2026-04-05','City Petrol Pump',        5640, 6120,'Admin'),
('SLP-A02','SYL-0044','Motahar Ali',   'Diesel',33.0,109.00,3597.00,'2026-04-08','Sylhet Pump',             2000, 2420,'Director'),
('SLP-A03','DHK-4412','Farid Ahmed',   'Diesel',36.0,109.00,3924.00,'2026-04-12','Motijheel Filling',       3380, 3860,'Fleet Mgr'),
('SLP-A04','DHK-9900','Habib Ullah',   'Diesel',34.0,109.00,3706.00,'2026-04-16','Padma Filling Station',  21280,21750,'Fleet Mgr'),
('SLP-A05','CTG-7788','Rubel Mia',     'Diesel',50.0,109.00,5450.00,'2026-04-20','Chittagong Pump',        45200,45900,'Admin'),
-- May 2026
('SLP-E01','DHK-1234','Rahim Uddin',   'Diesel',46.0,109.00,5014.00,'2026-05-03','Padma Filling Station',  40700,41280,'Admin'),
('SLP-E02','DHK-5678','Karim Ali',     'Diesel',42.0,109.00,4578.00,'2026-05-06','Eastern Fuel',           29340,29900,'Fleet Mgr'),
('SLP-E03','DHK-3301','Selim Hossain', 'Diesel',40.0,109.00,4360.00,'2026-05-08','City Petrol Pump',        6120, 6620,'Admin'),
('SLP-E04','CTG-4455','Rubel Mia',     'Diesel',52.0,109.00,5668.00,'2026-05-10','Port Filling Station',   59400,60100,'Admin'),
('SLP-E05','SYL-0044','Motahar Ali',   'Diesel',35.0,109.00,3815.00,'2026-05-12','Sylhet Pump',             2420, 2860,'Director'),
('SLP-E06','DHK-4412','Farid Ahmed',   'Diesel',38.0,109.00,4142.00,'2026-05-14','Motijheel Filling',       3860, 4360,'Fleet Mgr'),
('SLP-E07','DHK-9900','Zahir Uddin',   'Diesel',36.0,109.00,3924.00,'2026-05-15','Padma Filling Station',  21750,22250,'Admin'),
('SLP-E08','DHK-1234','Rahim Uddin',   'Diesel',48.0,109.00,5232.00,'2026-05-16','Eastern Fuel',           41280,41880,'Admin'),
('SLP-E09','DHK-5678','Karim Ali',     'Diesel',44.0,109.00,4796.00,'2026-05-17','City Petrol Pump',       29900,30490,'Fleet Mgr'),
('SLP-E10','CTG-7788','Habib Ullah',   'Diesel',50.0,109.00,5450.00,'2026-05-18','Chittagong Pump',        45900,46600,'Admin');

-- ─────────────────────────────────────────────────────────────
--  6. MAINTENANCE  (all months)
-- ─────────────────────────────────────────────────────────────
INSERT INTO maintenance
  (vehicle_reg,type,description,cost,date,odometer,vendor,parts_used,completed_by,next_due,status) VALUES
-- December 2025
('DHK-5678','Oil Change',      'Regular engine oil and filter change',                         3800,'2025-12-10',27800,'AutoCare BD',       'Synthetic 5W-30, Filter',   'Rafiq Miah', '2026-03-10','completed'),
('CTG-4455','Tyre Rotation',   'Rotate and balance all four tyres',                            2000,'2025-12-18',58000,'City Auto Parts',   'N/A',                       'Workshop',   '2026-06-18','completed'),
-- January 2026
('DHK-1234','Full Service',    '30,000 km full service — filters, fluids, belt check',         7500,'2026-01-15',39590,'AutoCare BD',       'Air filter, cabin filter, belts','Rafiq Miah','2026-07-15','completed'),
('DHK-3301','Oil Change',      'First oil change after break-in period',                       4000,'2026-01-20', 4200,'Toyota Service',    'Toyota Genuine 0W-20',      'Dealer',     '2026-04-20','completed'),
-- February 2026
('DHK-5678','Brake Service',   'Front brake pad and disc inspection, pad replacement',         9500,'2026-02-08',28800,'AutoCare BD',       'Front brake pads',          'Rafiq Miah', '2026-08-08','completed'),
('CTG-7788','AC Service',      'AC compressor oil top-up and refrigerant recharge',            6500,'2026-02-15',44000,'CoolCar BD',        'Refrigerant R134a',         'External',   '2027-02-15','completed'),
-- March 2026  (supplement)
('SYL-3322','Oil Change',      'Engine oil change and fuel filter replacement',                4500,'2026-03-05',14200,'Toyota Service',    'Synthetic 0W-20, Fuel Filter','Dealer',    '2026-06-05','completed'),
('DHK-9900','Electrical',      'Dashboard warning light diagnosis — sensor replacement',       5200,'2026-03-20',20350,'City Auto Parts',   'O2 sensor',                 'Workshop',   '2026-09-20','completed'),
-- April 2026  (supplement)
('DHK-4412','Full Service',    '15,000 km full service',                                       8000,'2026-04-05', 3380,'Mitsubishi Service','Filters, brake fluid',       'Dealer',     '2026-10-05','completed'),
('CTG-4455','Tyre Replacement','Replace two front tyres due to wear',                         16000,'2026-04-22',59400,'Jamuna Tyres',      '2x Bridgestone 185/65R15',  'External',   '2027-04-22','completed'),
-- May 2026
('DHK-1234','Oil Change',      'Scheduled oil and filter change',                              3800,'2026-05-05',41000,'AutoCare BD',       'Synthetic 5W-30, Oil Filter','Rafiq Miah', '2026-08-05','completed'),
('DHK-5678','Suspension',      'Front suspension inspection — replace worn bushings',         12500,'2026-05-08',29340,'AutoCare BD',       'Front control arm bushings', 'Rafiq Miah','2026-11-08','completed'),
('DHK-3301','Brake Service',   'Rear brake pad replacement',                                   7800,'2026-05-12', 6120,'AutoCare BD',       'Rear brake pads',           'Workshop',   '2026-11-12','completed'),
('SYL-0044','Full Service',    '10,000 km first major service',                               12000,'2026-05-14', 2420,'Toyota Service',    'Filters, spark plugs, fluids','Dealer',   '2026-11-14','completed'),
('CTG-7788','Electrical',      'Alternator belt replacement and battery check',                5500,'2026-05-15',45200,'City Auto Parts',   'Alternator belt',           'Workshop',   '2026-11-15','pending'),
('DHK-4412','Oil Change',      'Scheduled 5,000 km oil change',                               4200,'2026-05-16', 4360,'Mitsubishi Service','Genuine 5W-30',             'Dealer',     '2026-08-16','pending'),
('DHK-9900','Tyre',            'Replace two rear tyres and wheel alignment',                  18000,'2026-05-18',22250,'Jamuna Tyres',      '2x Bridgestone 195/65R15', 'External',   '2027-05-18','pending');

-- ─────────────────────────────────────────────────────────────
--  7. EXPENSES  (all months)
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO expenses
  (expense_no,category,description,amount,tax,date,vehicle_reg,vendor,payment_mode,bill_no,approved_by) VALUES
-- December 2025
('EXP-D01','Fuel',        'Fleet fuel Dec 2025 — Dhaka zone',          52000,   0,'2025-12-31',NULL,       'Multiple Stations',       'Bank Transfer','INV-D-001','Admin'),
('EXP-D02','Maintenance', 'Oil change fleet Dec 2025',                   5800,   0,'2025-12-15','DHK-5678', 'AutoCare BD',             'Cash',         'BILL-D-001','Admin'),
('EXP-D03','Insurance',   'Annual insurance renewal CTG-4455',          42000,   0,'2025-12-20','CTG-4455', 'Sadharan Bima Corp',      'Bank Transfer','POL-D-001','Admin'),
-- January 2026
('EXP-J01','Fuel',        'Fleet fuel Jan 2026 — all zones',            64000,   0,'2026-01-31',NULL,       'Multiple Stations',       'Bank Transfer','INV-J-001','Admin'),
('EXP-J02','Maintenance', '30k service DHK-1234',                        7500,   0,'2026-01-15','DHK-1234', 'AutoCare BD',             'Cheque',       'BILL-J-001','Admin'),
('EXP-J03','Toll',        'Monthly highway toll — Dhaka-CTG route',      9600,   0,'2026-01-31',NULL,       'BRTC',                    'Cash',         'RCPT-J-001','Fleet Mgr'),
('EXP-J04','Parking',     'Monthly parking Jan 2026',                    6000,   0,'2026-01-01',NULL,       'Motijheel Parking',       'Bank Transfer','INV-JP-001','Admin'),
('EXP-J05','Salary',      'Driver salaries January 2026',               85000,   0,'2026-01-31',NULL,       NULL,                      'Bank Transfer','SAL-J-001','HR'),
-- February 2026
('EXP-F01','Fuel',        'Fleet fuel Feb 2026 — all zones',            62000,   0,'2026-02-28',NULL,       'Multiple Stations',       'Bank Transfer','INV-F-001','Admin'),
('EXP-F02','Maintenance', 'Brake service DHK-5678',                      9500, 950,'2026-02-08','DHK-5678', 'AutoCare BD',             'Cheque',       'BILL-F-001','Admin'),
('EXP-F03','Maintenance', 'AC service CTG-7788',                         6500, 650,'2026-02-15','CTG-7788', 'CoolCar BD',              'Cash',         'BILL-F-002','Fleet Mgr'),
('EXP-F04','Parking',     'Monthly parking Feb 2026',                    6000,   0,'2026-02-01',NULL,       'Motijheel Parking',       'Bank Transfer','INV-FP-001','Admin'),
('EXP-F05','Salary',      'Driver salaries February 2026',              88000,   0,'2026-02-28',NULL,       NULL,                      'Bank Transfer','SAL-F-001','HR'),
('EXP-F06','Toll',        'Monthly highway toll Feb 2026',               9600,   0,'2026-02-28',NULL,       'BRTC',                    'Cash',         'RCPT-F-001','Fleet Mgr'),
-- March 2026  (supplement)
('EXP-M01','Fuel',        'Fleet fuel Mar 2026 — supplement',           38000,   0,'2026-03-31',NULL,       'Multiple Stations',       'Bank Transfer','INV-M-001','Admin'),
('EXP-M02','Salary',      'Driver salaries March 2026',                 88000,   0,'2026-03-31',NULL,       NULL,                      'Bank Transfer','SAL-M-001','HR'),
('EXP-M03','Maintenance', 'SYL-3322 service',                            4500,   0,'2026-03-05','SYL-3322', 'Toyota Service',          'Cheque',       'BILL-M-001','Admin'),
-- April 2026  (supplement)
('EXP-A01','Fuel',        'Fleet fuel Apr 2026 — supplement',           34000,   0,'2026-04-30',NULL,       'Multiple Stations',       'Bank Transfer','INV-A-001','Admin'),
('EXP-A02','Salary',      'Driver salaries April 2026',                 90000,   0,'2026-04-30',NULL,       NULL,                      'Bank Transfer','SAL-A-001','HR'),
('EXP-A03','Toll',        'Monthly highway toll Apr 2026',               9600,   0,'2026-04-30',NULL,       'BRTC',                    'Cash',         'RCPT-A-001','Fleet Mgr'),
-- May 2026
('EXP-E01','Fuel',        'Fleet fuel May 2026 — week 1',               42000,   0,'2026-05-07',NULL,       'Multiple Stations',       'Bank Transfer','INV-E-001','Admin'),
('EXP-E02','Maintenance', 'DHK-1234 oil change May',                     3800,   0,'2026-05-05','DHK-1234', 'AutoCare BD',             'Cash',         'BILL-E-001','Admin'),
('EXP-E03','Maintenance', 'DHK-5678 suspension May',                    12500,1250,'2026-05-08','DHK-5678', 'AutoCare BD',             'Cheque',       'BILL-E-002','Admin'),
('EXP-E04','Parking',     'Monthly parking May 2026',                    6000,   0,'2026-05-01',NULL,       'Motijheel Parking',       'Bank Transfer','INV-EP-001','Admin'),
('EXP-E05','Salary',      'Driver salaries May 2026 (advance)',         45000,   0,'2026-05-10',NULL,       NULL,                      'Bank Transfer','SAL-E-001','HR'),
('EXP-E06','Toll',        'Monthly highway toll May 2026 (1st half)',    5200,   0,'2026-05-15',NULL,       'BRTC',                    'Cash',         'RCPT-E-001','Fleet Mgr'),
('EXP-E07','Maintenance', 'DHK-3301 brake service',                      7800, 780,'2026-05-12','DHK-3301', 'AutoCare BD',             'Cheque',       'BILL-E-003','Fleet Mgr'),
('EXP-E08','Fuel',        'Fleet fuel May 2026 — week 2-3',             51000,   0,'2026-05-18',NULL,       'Multiple Stations',       'Bank Transfer','INV-E-002','Admin'),
('EXP-E09','Maintenance', 'SYL-0044 first major service',               12000,1200,'2026-05-14','SYL-0044', 'Toyota Service',          'Cheque',       'BILL-E-004','Admin'),
('EXP-E10','Office',      'GPS tracker subscription May 2026',           8500,   0,'2026-05-01',NULL,       'TrackIT Bangladesh',      'Bank Transfer','INV-GPS-001','IT');

-- ─────────────────────────────────────────────────────────────
--  8. ACCIDENTS
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO accidents
  (case_no,vehicle_reg,driver_name,date,type,severity,location,description,casualties,damage,status,police_case,reported_by,action) VALUES
('ACC-2026-001','DHK-5678','Karim Ali',     '2026-02-14','Collision','Minor',
 'Elephant Road, Dhaka','Minor collision with a private car at traffic signal. No injuries.',
 0, 45000.00,'closed','GD-2026/114','Karim Ali','Claim filed with insurance. Repair completed.'),
('ACC-2026-002','CTG-4455','Rubel Mia',     '2026-03-22','Accident','Moderate',
 'Dhaka-CTG Highway, Km 95','Tyre blowout caused swerve; hit road barrier. Driver safe.',
 0, 120000.00,'closed','GD-2026/287','Rubel Mia','Barrier repair claimed. Vehicle repaired at workshop.'),
('ACC-2026-003','DHK-1234','Rahim Uddin',   '2026-04-18','Hit and Run','Minor',
 'Mirpur Road, Dhaka','Unknown vehicle rear-ended VMS truck at traffic stop. Minor bumper damage.',
 0, 18000.00,'open', 'GD-2026/412','Rahim Uddin','Police complaint filed. Insurance claim pending.'),
('ACC-2026-004','DHK-9900','Zahir Uddin',   '2026-05-03','Collision','Minor',
 'Progati Sarani, Dhaka','Side mirror damage from lane-change incident. No injuries.',
 0, 8500.00, 'open', NULL,           'Zahir Uddin','Repair estimate submitted. Pending approval.'),
('ACC-2026-005','DHK-3301','Selim Hossain', '2026-05-10','Accident','Moderate',
 'Dhaka-Mawa Road, Km 28','Slippery road due to rain — minor skid, front bumper damage.',
 0, 35000.00,'open', 'GD-2026/589','Selim Hossain','Workshop assessment in progress.'),
('ACC-2026-006','SYL-3322','Nasir Hossain', '2026-05-16','Collision','Minor',
 'Airport Road, Dhaka','Low-speed parking lot collision. Minimal damage to both vehicles.',
 0, 12000.00,'open', NULL,           'Nasir Hossain','Awaiting repair estimate.');

-- ─────────────────────────────────────────────────────────────
--  9. DRIVER LEAVE APPLICATIONS  (May 2026)
-- ─────────────────────────────────────────────────────────────
INSERT INTO driver_leave
  (driver_name,leave_type,from_date,to_date,days,reason,applied_on,approved_by,replaced_by,status) VALUES
('Selim Hossain','Annual',  '2026-05-20','2026-05-22',3,'Family function',            '2026-05-14','Admin',     'Rubel Mia',    'approved'),
('Rubel Mia',    'Sick',    '2026-05-08','2026-05-09',2,'Food poisoning',             '2026-05-08','Fleet Mgr', 'Nur Islam',    'approved'),
('Nur Islam',    'Casual',  '2026-05-25','2026-05-25',1,'Personal errand',            '2026-05-20',NULL,        NULL,           'pending'),
('Motahar Ali',  'Annual',  '2026-06-01','2026-06-07',7,'Eid-ul-Adha vacation',       '2026-05-18','Admin',     'Zahir Uddin',  'pending'),
('Zahir Uddin',  'Sick',    '2026-05-19','2026-05-19',1,'Medical appointment',        '2026-05-18',NULL,        NULL,           'pending'),
('Habib Ullah',  'Annual',  '2026-06-15','2026-06-19',5,'Hometown visit after Eid',   '2026-05-17','Admin',     'Karim Mia',    'approved');

-- ─────────────────────────────────────────────────────────────
-- 10. REQUISITIONS  (more pending for dashboard count)
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO requisitions
  (req_no,requested_by,department,purpose,vehicle_reg,from_date,to_date,from_location,to_location,passengers,priority,date,approved_by,status) VALUES
('REQ-007','Md. Tanvir Ahmed',    'IT',          'Server hardware delivery to DC',       'DHK-3301','2026-05-18','2026-05-18','Dhaka HQ',  'Data Center Uttara',4,'high',  '2026-05-17','Admin',     'pending'),
('REQ-008','Ms. Sabrina Khatun',  'HR',          'Staff training at BRAC centre',        NULL,      '2026-05-20','2026-05-20','Dhaka HQ',  'BRAC Training HQ', 8,'normal','2026-05-17',NULL,        'pending'),
('REQ-009','Md. Anisur Rahman',   'Finance',     'Audit team site visit Narayanganj',    NULL,      '2026-05-21','2026-05-21','Dhaka HQ',  'Narayanganj',      4,'normal','2026-05-17',NULL,        'pending'),
('REQ-010','Rafiq Miah',          'Maintenance', 'Spare parts pickup from distributor',  'DHK-9900','2026-05-19','2026-05-19','Workshop',  'Parts Market',     2,'high',  '2026-05-18','Admin',     'approved'),
('REQ-011','Operations Manager',  'Operations',  'Monthly site inspection — Gazipur',    'CTG-4455','2026-05-22','2026-05-22','Dhaka HQ',  'Gazipur Zone',     3,'normal','2026-05-18',NULL,        'pending'),
('REQ-012','Ms. Priya Akter',     'Admin',       'Documents delivery to court',          NULL,      '2026-05-19','2026-05-19','Head Office','Dhaka Court',      1,'urgent','2026-05-18',NULL,        'pending');

-- ─────────────────────────────────────────────────────────────
-- 11. ROUTES  (supplement)
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO routes
  (route_code,name,distance,estimated_time,stops,highway,toll_cost,assigned_vehicles,last_used,status) VALUES
('RT-006','Dhaka - Tangail',      90,'2h',   1,'N3 Highway',       250, 2,'2026-05-15','active'),
('RT-007','Dhaka - Comilla',     100,'2.5h', 2,'Dhaka-CTG Hwy',   350, 3,'2026-05-13','active'),
('RT-008','Chittagong - Comilla', 100,'2.5h', 2,'N1 Highway',       300, 2,'2026-05-11','active'),
('RT-009','Dhaka - Gazipur',      40,'1.5h', 1,'Tongi Highway',    100, 4,'2026-05-18','active'),
('RT-010','Dhaka - Manikganj',    65,'2h',   1,'N2 Highway',       200, 1,'2026-05-15','active');

-- ─────────────────────────────────────────────────────────────
-- 12. PARKING SLOTS  (supplement)
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO parking_slots
  (slot_no,vehicle_reg,type,zone,monthly_fee,parked_since,status) VALUES
('P-07','SYL-3322','Covered','Zone A',3000,'2026-05-01','occupied'),
('P-08','DHK-3301','Covered','Zone A',3000,'2026-05-01','occupied'),
('P-09','DHK-4412','Covered','Zone A',4500,'2026-01-01','occupied'),
('P-10','SYL-0044','Covered','Zone A',4500,'2026-03-15','occupied'),
('P-11',NULL,      'Open',   'Zone B',1500, NULL,       'available'),
('P-12',NULL,      'Open',   'Zone C',1200, NULL,       'available');

-- ─────────────────────────────────────────────────────────────
-- 13. VENDORS  (supplement)
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO vendors
  (name,contact,phone,email,category,city,address,tax_id,credit_limit,status) VALUES
('AutoCare BD',         'Rafiq Miah',    '01811-100001','autocare@bd.com',     'Parts',    'Dhaka',      '18 Rayer Bazar',    'TIN-101',350000,'active'),
('Toyota Service BD',   'Service Desk',  '01811-100002','toyota@service.com',  'Parts',    'Dhaka',      '1 Toyota Avenue',   'TIN-102',200000,'active'),
('Mitsubishi Service',  'Service Desk',  '01811-100003','mitsu@service.com',   'Parts',    'Dhaka',      '5 Authorized Rd',   'TIN-103',150000,'active'),
('CoolCar BD',          'Salim Ahmed',   '01811-100004','coolcar@bd.com',      'Other',    'Dhaka',      '32 Panthapath',     'TIN-104',100000,'active'),
('TrackIT Bangladesh',  'IT Support',    '01811-100005','info@trackit.com.bd', 'Other',    'Dhaka',      '10 Gulshan-1',      'TIN-105',  5000,'active');

-- ─────────────────────────────────────────────────────────────
-- 14. COORDINATORS  (supplement)
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO coordinators
  (emp_id,name,phone,email,zone,assigned_vehicles,join_date,status) VALUES
('EMP-006','Md. Alamgir Hossain','01611-600001','alamgir@nexdecade.com','Sylhet Zone',    2,'2023-07-01','active'),
('EMP-007','Ms. Roksana Begum',  '01711-700002','roksana@nexdecade.com','Chittagong Zone',3,'2021-11-15','active'),
('EMP-008','Md. Sohel Rana',     '01811-800003','sohel@nexdecade.com',  'Rajshahi Zone',  1,'2024-01-10','active');

-- ─────────────────────────────────────────────────────────────
-- 15. INVENTORY  (supplement + update low-stock items)
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO inventory
  (item_code,name,category,qty,unit,unit_price,location,min_qty,last_restocked,supplier,status) VALUES
('INV-011','Transmission Fluid','Fluid',     10,'Litre', 480, 'Shelf A2', 4,'2026-05-01','City Lubricants',   'in_stock'),
('INV-012','Timing Belt',        'Brake Parts', 3,'Pcs',  2800,'Shelf C3', 2,'2026-04-10','Padma Auto Parts',  'in_stock'),
('INV-013','Radiator Coolant',   'Fluid',      5,'Litre', 340, 'Shelf A4', 6,'2026-05-05','City Lubricants',   'low_stock'),
('INV-014','Power Steering Fluid','Fluid',    12,'Litre', 380, 'Shelf A5', 4,'2026-05-10','City Lubricants',   'in_stock'),
('INV-015','HID Headlight Bulb', 'Electrical', 2,'Pcs', 1800, 'Shelf D1', 4,'2026-03-20','ElectroParts BD',   'low_stock'),
('INV-016','Differential Oil',  'Lubricant',   8,'Litre', 520, 'Shelf A6', 3,'2026-04-25','City Lubricants',   'in_stock'),
('INV-017','Tyre Pressure Gauge','Accessories', 6,'Pcs',  450, 'Toolbox 2',2,'2026-02-15','Padma Auto Parts',  'in_stock'),
('INV-018','First Aid Kit',      'Accessories', 4,'Set', 1200, 'Store B',  5,'2026-05-01','SafetyGear BD',     'low_stock'),
('INV-019','Fire Extinguisher',  'Accessories', 8,'Pcs', 2500, 'Store B',  4,'2026-04-01','SafetyGear BD',     'in_stock'),
('INV-020','Battery 80Ah',       'Electrical',  1,'Pcs', 9500, 'Shelf D3', 2,'2026-03-10','ElectroParts BD',   'low_stock');

-- Restock item that was out of stock
UPDATE inventory SET qty=15, last_restocked='2026-05-10', status='in_stock' WHERE item_code='INV-004';

-- ─────────────────────────────────────────────────────────────
-- 16. NOTICES  (recent May 2026)
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO notices
  (title,body,priority,category,posted_by,date) VALUES
('Eid Holiday Schedule 2026',
 'All operations will be suspended from June 5–8 for Eid-ul-Adha. Emergency vehicles on standby. Coordinators to submit coverage plans by May 28.',
 'high','Operations','Admin','2026-05-18'),
('Monthly Fuel Efficiency Report',
 'Fleet average fuel efficiency for April 2026: 8.2 km/L (up from 7.9 km/L in March). Top performer: DHK-1234 at 9.1 km/L. Details in the Finance module.',
 'medium','Finance','Fleet Manager','2026-05-16'),
('Driver Safety Refresher — Mandatory',
 'All active drivers must complete the online road safety module by May 31. Access via the BRTC portal. Completion certificates to be submitted to HR.',
 'high','HR','HR','2026-05-14'),
('Maintenance Bay Shift Change',
 'The workshop will operate extended hours (7 AM – 8 PM) from May 20 to June 5 to handle pre-Eid service backlog.',
 'medium','Operations','Workshop Manager','2026-05-12'),
('GPS Tracker Upgrade Complete',
 'GPS tracking devices on all 13 active vehicles have been upgraded to TrackIT v2.1. Real-time updates now refresh every 30 seconds.',
 'low','IT','IT Team','2026-05-10');

-- ─────────────────────────────────────────────────────────────
-- 17. AUDIT LOG  (recent activity)
-- ─────────────────────────────────────────────────────────────
INSERT INTO audit_log (username,role,module,action,detail,ip_address,status,timestamp) VALUES
('admin',   'admin',   'Vehicle',    'CREATE', 'Added vehicle SYL-0044 (Toyota Prado 2023)',         '127.0.0.1','success','2026-05-18 09:15:00'),
('admin',   'admin',   'Dispatch',   'CREATE', 'New dispatch DSP-116 Dhaka→Chittagong',              '127.0.0.1','success','2026-05-18 06:30:00'),
('fleet_mgr','manager','Maintenance','UPDATE', 'Updated maintenance status for DHK-3301',            '127.0.0.1','success','2026-05-18 08:45:00'),
('ops_1',   'operator','Fuel',       'CREATE', 'Fuel record SLP-E10 for CTG-7788 added',             '127.0.0.1','success','2026-05-18 07:20:00'),
('admin',   'admin',   'Expense',    'CREATE', 'Expense EXP-E08 — fuel week 2-3 approved',           '127.0.0.1','success','2026-05-17 17:30:00'),
('admin',   'admin',   'Accident',   'CREATE', 'Accident report ACC-2026-006 filed for SYL-3322',    '127.0.0.1','success','2026-05-16 14:22:00'),
('fleet_mgr','manager','Driver',     'UPDATE', 'Leave approved for Selim Hossain (May 20-22)',       '127.0.0.1','success','2026-05-15 11:10:00'),
('admin',   'admin',   'Notice',     'CREATE', 'Notice posted: Eid Holiday Schedule 2026',           '127.0.0.1','success','2026-05-18 10:00:00');

-- ─────────────────────────────────────────────────────────────
-- 18. SETTINGS  (update org name)
-- ─────────────────────────────────────────────────────────────
UPDATE settings SET value='Nexdecade Technologies Ltd.' WHERE setting_key='org_name';
UPDATE settings SET value='BDT' WHERE setting_key='currency';

SELECT CONCAT('VMS sample data loaded — ', NOW()) AS result;
