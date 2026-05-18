USE vms_db;

-- Dispatch records
INSERT INTO dispatch (dispatch_no, vehicle_reg, driver_name, origin, destination, distance, date, start_time, end_time, purpose, approved_by, fuel_used, status) VALUES
('DSP-001','DHK-1234','Rahim Uddin','Dhaka HQ','Chittagong Port',250,'2026-04-01','2026-04-01 08:00:00','2026-04-01 18:00:00','Cargo delivery','Admin',18.5,'completed'),
('DSP-002','DHK-5678','Karim Ahmed','Dhaka HQ','Sylhet Office',175,'2026-04-03','2026-04-03 07:30:00',NULL,'Staff transport','Fleet Mgr',NULL,'in_progress'),
('DSP-003','DHK-9012','Hasan Ali','Dhaka HQ','Gazipur Factory',45,'2026-04-05','2026-04-05 09:00:00','2026-04-05 13:00:00','Parts pickup','Admin',4.2,'completed'),
('DSP-004','CTG-3456','Mostofa Hossain','Chittagong Port','Dhaka HQ',250,'2026-04-07','2026-04-07 06:00:00','2026-04-07 16:00:00','Return trip','Admin',19.1,'completed'),
('DSP-005','DHK-7890','Nazrul Islam','Dhaka HQ','Narayanganj',30,'2026-04-10','2026-04-10 10:00:00',NULL,'Document delivery','Fleet Mgr',NULL,'pending'),
('DSP-006','DHK-1234','Rahim Uddin','Dhaka HQ','Mymensingh',120,'2026-04-12','2026-04-12 08:00:00','2026-04-12 15:00:00','VIP transport','Admin',9.5,'completed'),
('DSP-007','DHK-5678','Karim Ahmed','Sylhet Office','Dhaka HQ',175,'2026-04-14','2026-04-14 07:00:00','2026-04-14 15:30:00','Return trip','Fleet Mgr',13.2,'completed'),
('DSP-008','DHK-9012','Hasan Ali','Dhaka HQ','Savar EPZ',40,'2026-04-16','2026-04-16 11:00:00',NULL,'Inspection','Admin',NULL,'approved');

-- Fuel records
INSERT INTO fuel_records (slip_no, vehicle_reg, driver_name, fuel_type, liters, price_per_liter, total, date, station, odo_before, odo_after, approved_by) VALUES
('SLP-001','DHK-1234','Rahim Uddin','Diesel',40.5,109.00,4414.50,'2026-04-01','Padma Filling Station',42000,42500,'Admin'),
('SLP-002','DHK-5678','Karim Ahmed','Petrol',35.0,125.00,4375.00,'2026-04-03','Eastern Fuel',31500,31850,'Fleet Mgr'),
('SLP-003','DHK-9012','Hasan Ali','Diesel',30.0,109.00,3270.00,'2026-04-05','City Petrol Pump',20100,20450,'Admin'),
('SLP-004','CTG-3456','Mostofa Hossain','Diesel',50.0,109.00,5450.00,'2026-04-07','Port Filling Station',63000,63600,'Admin'),
('SLP-005','DHK-7890','Nazrul Islam','CNG',20.0,42.00,840.00,'2026-04-10','Motijheel CNG Station',15100,15400,'Fleet Mgr'),
('SLP-006','DHK-1234','Rahim Uddin','Diesel',45.0,109.00,4905.00,'2026-04-12','Padma Filling Station',42500,43050,'Admin'),
('SLP-007','DHK-5678','Karim Ahmed','Petrol',38.5,125.00,4812.50,'2026-04-14','Eastern Fuel',31850,32300,'Fleet Mgr'),
('SLP-008','GOV-1122','Rahim Uddin','Diesel',60.0,109.00,6540.00,'2026-04-17','Motijheel Filling',78100,78800,'Admin');

-- Maintenance records
INSERT INTO maintenance (vehicle_reg, type, description, cost, date, odometer, vendor, parts_used, completed_by, next_due, status) VALUES
('DHK-1234','oil_change','Regular engine oil change and filter replacement',3500,'2026-03-15',42000,'AutoCare BD','Engine Oil 5W-30, Oil Filter','Rafiq Miah','2026-06-15','completed'),
('DHK-5678','tyre','Replace all four tyres due to wear',28000,'2026-03-20',31200,'Tyre World BD','4x Bridgestone 195/65R15','External Vendor','2027-03-20','completed'),
('DHK-9012','brake','Brake pad replacement front and rear',8500,'2026-03-25',19800,'AutoCare BD','Front and Rear Brake Pads','Rafiq Miah','2026-09-25','completed'),
('CTG-3456','service','60000 km full service',15000,'2026-04-01',62800,'Port Auto Workshop','Air filter, spark plugs, coolant flush','External Vendor','2026-10-01','completed'),
('DHK-7890','electrical','Battery replacement',6500,'2026-04-05',14900,'City Auto Parts','12V 75Ah Battery','Workshop Team','2027-04-05','completed'),
('GOV-1122','oil_change','Oil change and inspection',4200,'2026-04-10',78000,'AutoCare BD','Synthetic Oil, Filter','Rafiq Miah','2026-07-10','in_progress'),
('DHK-1234','service','30000 km service check',5000,'2026-04-18',43000,'AutoCare BD','Air filter, wiper blades','Rafiq Miah','2026-10-18','pending'),
('DHK-5678','ac','AC compressor service',12000,'2026-04-19',32000,'CoolCar BD','Refrigerant, compressor oil','External Vendor','2027-04-19','pending');

-- Expenses
INSERT INTO expenses (expense_no, category, description, amount, tax, date, vehicle_reg, vendor, payment_mode, bill_no, approved_by) VALUES
('EXP-001','fuel','Monthly fuel expense April',45500,0,'2026-04-01','DHK-1234','Padma Filling Station','bank_transfer','BILL-2026-001','Admin'),
('EXP-002','maintenance','Tyre replacement DHK-5678',28000,2800,'2026-03-20','DHK-5678','Tyre World BD','cheque','BILL-2026-002','Admin'),
('EXP-003','toll','Highway toll charges Dhaka-CTG',1200,0,'2026-04-01','DHK-1234','BRTC','cash','RCPT-001','Fleet Mgr'),
('EXP-004','parking','Monthly parking fee April',5000,0,'2026-04-01',NULL,'Motijheel Parking','bank_transfer','INV-P-001','Admin'),
('EXP-005','insurance','Comprehensive insurance renewal DHK-9012',35000,0,'2026-04-05','DHK-9012','Sadharan Bima Corp','bank_transfer','POL-2026-003','Admin'),
('EXP-006','maintenance','Battery replacement DHK-7890',6500,650,'2026-04-05','DHK-7890','City Auto Parts','cash','BILL-2026-003','Fleet Mgr'),
('EXP-007','fuel','Fuel expenses Chittagong fleet',38200,0,'2026-04-07','CTG-3456','Port Filling Station','bank_transfer','BILL-2026-004','Admin'),
('EXP-008','misc','Vehicle cleaning and detailing',3000,0,'2026-04-10',NULL,'Clean Auto BD','cash','RCPT-002','Fleet Mgr');

-- Driver leave
INSERT INTO driver_leave (driver_name, leave_type, from_date, to_date, days, reason, applied_on, approved_by, replaced_by, status) VALUES
('Rahim Uddin','annual','2026-03-10','2026-03-14',5,'Family visit to village','2026-03-05','Admin','Hasan Ali','approved'),
('Karim Ahmed','sick','2026-03-22','2026-03-23',2,'Fever and cold','2026-03-22','Fleet Mgr','Mostofa Hossain','approved'),
('Hasan Ali','casual','2026-04-02','2026-04-02',1,'Personal work','2026-04-01','Admin',NULL,'approved'),
('Mostofa Hossain','annual','2026-05-01','2026-05-07',7,'Eid vacation','2026-04-25','Admin','Nazrul Islam','pending'),
('Nazrul Islam','sick','2026-04-19','2026-04-20',2,'Medical checkup','2026-04-19',NULL,NULL,'pending');

-- Requisitions (vehicle booking requests)
INSERT INTO requisitions (req_no, requested_by, department, purpose, vehicle_reg, from_date, to_date, from_location, to_location, passengers, priority, date, approved_by, status) VALUES
('REQ-001','Md. Farhan Islam','Operations','Client meeting Chittagong','DHK-1234','2026-04-05','2026-04-05','Dhaka HQ','Chittagong',3,'high','2026-04-03','Admin','approved'),
('REQ-002','Ms. Sumaiya Begum','Fleet Management','Site inspection Gazipur',NULL,'2026-04-10','2026-04-10','Dhaka HQ','Gazipur',2,'normal','2026-04-08','Fleet Mgr','approved'),
('REQ-003','Md. Zahir Uddin','Logistics','Airport pickup','DHK-5678','2026-04-12','2026-04-12','Airport','Dhaka HQ',4,'urgent','2026-04-11','Admin','pending'),
('REQ-004','Safety Officer','Administration','Safety audit visit',NULL,'2026-04-20','2026-04-21','Dhaka HQ','Narayanganj',2,'normal','2026-04-18',NULL,'pending'),
('REQ-005','Rafiq Miah','Workshop','Spare parts collection','DHK-9012','2026-04-22','2026-04-22','Workshop','Spare Parts Market',1,'high','2026-04-19',NULL,'pending'),
('REQ-006','Fleet Manager','Fleet','Staff transport to training','DHK-7890','2026-04-25','2026-04-25','Dhaka HQ','BRTC Training Center',6,'normal','2026-04-20',NULL,'pending');

-- More inventory items
INSERT IGNORE INTO inventory (item_code, name, category, qty, unit, unit_price, location, min_qty, supplier, status) VALUES
('INV-006','Brake Fluid DOT-4','lubricants',12,'bottles',320,'Shelf B1',5,'AutoCare BD','in_stock'),
('INV-007','Air Filter Toyota','spare_parts',8,'pieces',850,'Shelf C2',3,'Toyota BD','in_stock'),
('INV-008','Windshield Washer Fluid','lubricants',20,'bottles',150,'Shelf B2',10,'Clean BD','in_stock'),
('INV-009','Jump Cables','tools',2,'pieces',1200,'Toolbox 1',2,'ElectroParts','low_stock'),
('INV-010','Reflective Safety Vest','safety',15,'pieces',250,'Storage A',5,'SafetyGear BD','in_stock');

-- Coordinators
INSERT IGNORE INTO coordinators (emp_id, name, phone, email, zone, assigned_vehicles, join_date, status) VALUES
('EMP-001','Md. Farhan Islam','01711-111222','farhan@nexdecade.com','Dhaka Zone',3,'2022-01-15','active'),
('EMP-002','Ms. Sumaiya Begum','01811-222333','sumaiya@nexdecade.com','Chittagong Zone',2,'2022-06-01','active'),
('EMP-003','Md. Zahir Uddin','01911-333444','zahir@nexdecade.com','Sylhet Zone',1,'2023-03-10','active'),
('EMP-004','Ms. Nadia Rahman','01611-444555','nadia@nexdecade.com','Dhaka Zone',2,'2021-09-01','active'),
('EMP-005','Md. Selim Reza','01511-555666','selim@nexdecade.com','Gazipur Zone',1,'2020-05-20','inactive');

-- Driver leave balance
INSERT IGNORE INTO driver_leave_balance (driver_id, leave_type, total_days, used_days, year)
SELECT d.id, 'annual', 20, 5, 2026 FROM drivers d WHERE d.name = 'Rahim Uddin' UNION ALL
SELECT d.id, 'sick', 10, 2, 2026 FROM drivers d WHERE d.name = 'Rahim Uddin' UNION ALL
SELECT d.id, 'annual', 20, 0, 2026 FROM drivers d WHERE d.name = 'Karim Ahmed' UNION ALL
SELECT d.id, 'sick', 10, 2, 2026 FROM drivers d WHERE d.name = 'Karim Ahmed' UNION ALL
SELECT d.id, 'annual', 20, 1, 2026 FROM drivers d WHERE d.name = 'Hasan Ali' UNION ALL
SELECT d.id, 'sick', 10, 0, 2026 FROM drivers d WHERE d.name = 'Hasan Ali' UNION ALL
SELECT d.id, 'annual', 20, 0, 2026 FROM drivers d WHERE d.name = 'Mostofa Hossain' UNION ALL
SELECT d.id, 'annual', 20, 0, 2026 FROM drivers d WHERE d.name = 'Nazrul Islam';

SELECT 'Sample data inserted successfully' as result;
