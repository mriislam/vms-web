-- =============================================================
--  VMS — Vehicle Management System
--  MySQL Database Schema
--  Generated from frontend data models
-- =============================================================

CREATE DATABASE IF NOT EXISTS vms_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE vms_db;

-- =============================================================
--  VEHICLES
-- =============================================================
CREATE TABLE vehicles (
  id               INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  reg_no           VARCHAR(20)   NOT NULL UNIQUE,
  make             VARCHAR(60)   NOT NULL,
  model            VARCHAR(80)   NOT NULL,
  year             SMALLINT      NOT NULL,
  type             VARCHAR(30)   NOT NULL COMMENT 'Pickup|Truck|SUV|Van|Bus|Microbus',
  ownership        ENUM('Private','Government','Special') NOT NULL DEFAULT 'Private',
  color            VARCHAR(30)   NULL,
  fuel_type        ENUM('Diesel','Petrol','CNG','Electric') NOT NULL DEFAULT 'Diesel',
  chassis_no       VARCHAR(50)   NULL,
  engine_no        VARCHAR(50)   NULL,
  odometer         INT           NOT NULL DEFAULT 0 COMMENT 'km',
  insurance_expiry DATE          NULL,
  purchase_date    DATE          NULL,
  purchase_price   DECIMAL(12,2) NULL,
  last_service     DATE          NULL,
  owner            VARCHAR(80)   NULL COMMENT 'Branch / owner label',
  status           ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status  (status),
  INDEX idx_ownership (ownership)
) ENGINE=InnoDB;

-- =============================================================
--  DRIVERS
-- =============================================================
CREATE TABLE drivers (
  id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  license_no   VARCHAR(40)  NOT NULL UNIQUE,
  phone        VARCHAR(20)  NOT NULL,
  nid          VARCHAR(20)  NULL,
  dob          DATE         NULL,
  blood_group  VARCHAR(5)   NULL COMMENT 'A+|A-|B+|B-|O+|O-|AB+|AB-',
  experience   TINYINT      NOT NULL DEFAULT 0 COMMENT 'years',
  join_date    DATE         NULL,
  address      TEXT         NULL,
  ownership    ENUM('Private','Government','Special') NOT NULL DEFAULT 'Private',
  status       ENUM('active','inactive') NOT NULL DEFAULT 'active',
  last_trip    DATE         NULL,
  total_trips  INT          NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status    (status),
  INDEX idx_ownership (ownership)
) ENGINE=InnoDB;

-- =============================================================
--  DRIVER LEAVE BALANCE
-- =============================================================
CREATE TABLE driver_leave_balance (
  id         INT     NOT NULL AUTO_INCREMENT PRIMARY KEY,
  driver_id  INT     NOT NULL,
  leave_type ENUM('Annual','Sick','Casual') NOT NULL,
  total_days TINYINT NOT NULL DEFAULT 0,
  used_days  TINYINT NOT NULL DEFAULT 0,
  year       YEAR    NOT NULL DEFAULT (YEAR(CURDATE())),
  UNIQUE KEY uq_driver_type_year (driver_id, leave_type, year),
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================
--  DISPATCH
-- =============================================================
CREATE TABLE dispatch (
  id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  dispatch_no  VARCHAR(20)  NOT NULL UNIQUE,
  vehicle_reg  VARCHAR(20)  NOT NULL,
  driver_name  VARCHAR(100) NOT NULL,
  origin       VARCHAR(100) NOT NULL,
  destination  VARCHAR(100) NOT NULL,
  distance     SMALLINT     NULL COMMENT 'km',
  date         DATE         NOT NULL,
  start_time   DATETIME     NULL,
  end_time     DATETIME     NULL,
  purpose      TEXT         NULL,
  approved_by  VARCHAR(80)  NULL,
  fuel_used    DECIMAL(6,2) NULL COMMENT 'litres',
  status       ENUM('pending','approved','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status     (status),
  INDEX idx_date       (date),
  INDEX idx_vehicle    (vehicle_reg)
) ENGINE=InnoDB;

-- =============================================================
--  FUEL RECORDS
-- =============================================================
CREATE TABLE fuel_records (
  id              INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  slip_no         VARCHAR(20)   NOT NULL UNIQUE,
  vehicle_reg     VARCHAR(20)   NOT NULL,
  driver_name     VARCHAR(100)  NOT NULL,
  fuel_type       ENUM('Diesel','Petrol','CNG') NOT NULL DEFAULT 'Diesel',
  liters          DECIMAL(7,2)  NOT NULL,
  price_per_liter DECIMAL(7,2)  NOT NULL,
  total           DECIMAL(10,2) NOT NULL,
  date            DATE          NOT NULL,
  station         VARCHAR(100)  NULL,
  odo_before      INT           NULL COMMENT 'km',
  odo_after       INT           NULL COMMENT 'km',
  approved_by     VARCHAR(80)   NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date    (date),
  INDEX idx_vehicle (vehicle_reg)
) ENGINE=InnoDB;

-- =============================================================
--  MAINTENANCE
-- =============================================================
CREATE TABLE maintenance (
  id            INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  vehicle_reg   VARCHAR(20)   NOT NULL,
  type          VARCHAR(60)   NOT NULL COMMENT 'Oil Change|Tyre Replacement|Brake Service|...',
  description   TEXT          NULL,
  cost          DECIMAL(10,2) NOT NULL,
  date          DATE          NOT NULL,
  odometer      INT           NULL COMMENT 'km at service time',
  vendor        VARCHAR(100)  NULL,
  parts_used    TEXT          NULL,
  completed_by  VARCHAR(80)   NULL,
  next_due      DATE          NULL,
  status        ENUM('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status  (status),
  INDEX idx_vehicle (vehicle_reg),
  INDEX idx_date    (date)
) ENGINE=InnoDB;

-- =============================================================
--  EXPENSES
-- =============================================================
CREATE TABLE expenses (
  id           INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  expense_no   VARCHAR(20)   NOT NULL UNIQUE,
  category     VARCHAR(40)   NOT NULL COMMENT 'Fuel|Maintenance|Insurance|Parking|Toll|Salary|Office|Other',
  description  VARCHAR(255)  NOT NULL,
  amount       DECIMAL(12,2) NOT NULL,
  tax          DECIMAL(10,2) NOT NULL DEFAULT 0,
  date         DATE          NOT NULL,
  vehicle_reg  VARCHAR(20)   NULL COMMENT 'NULL = applies to all',
  vendor       VARCHAR(100)  NULL,
  payment_mode VARCHAR(30)   NULL COMMENT 'Cash|Cheque|Bank Transfer|Mobile Banking',
  bill_no      VARCHAR(50)   NULL,
  approved_by  VARCHAR(80)   NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_date     (date)
) ENGINE=InnoDB;

-- =============================================================
--  DRIVER LEAVE APPLICATIONS
-- =============================================================
CREATE TABLE driver_leave (
  id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  driver_name  VARCHAR(100) NOT NULL,
  leave_type   ENUM('Annual','Sick','Casual') NOT NULL,
  from_date    DATE         NOT NULL,
  to_date      DATE         NOT NULL,
  days         TINYINT      NOT NULL,
  reason       TEXT         NULL,
  applied_on   DATE         NOT NULL DEFAULT (CURDATE()),
  approved_by  VARCHAR(80)  NULL,
  replaced_by  VARCHAR(100) NULL,
  status       ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status      (status),
  INDEX idx_driver      (driver_name),
  INDEX idx_from_date   (from_date)
) ENGINE=InnoDB;

-- =============================================================
--  INVENTORY
-- =============================================================
CREATE TABLE inventory (
  id              INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  item_code       VARCHAR(20)   NOT NULL UNIQUE,
  name            VARCHAR(120)  NOT NULL,
  category        VARCHAR(40)   NOT NULL COMMENT 'Lubricant|Filter|Brake Parts|Fluid|Accessories|Electrical|Tyres|Body Parts',
  qty             INT           NOT NULL DEFAULT 0,
  unit            VARCHAR(10)   NOT NULL DEFAULT 'Pcs',
  unit_price      DECIMAL(10,2) NOT NULL,
  location        VARCHAR(50)   NULL,
  min_qty         INT           NOT NULL DEFAULT 0,
  last_restocked  DATE          NULL,
  supplier        VARCHAR(100)  NULL,
  status          ENUM('in_stock','low_stock','out_of_stock') NOT NULL DEFAULT 'in_stock',
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status   (status),
  INDEX idx_category (category)
) ENGINE=InnoDB;

-- =============================================================
--  NOTICES
-- =============================================================
CREATE TABLE notices (
  id         INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(120) NOT NULL,
  body       TEXT         NOT NULL,
  priority   ENUM('high','medium','low') NOT NULL DEFAULT 'medium',
  category   VARCHAR(40)  NOT NULL DEFAULT 'General' COMMENT 'General|Operations|Finance|HR|Safety|IT',
  posted_by  VARCHAR(80)  NOT NULL DEFAULT 'Admin',
  date       DATE         NOT NULL DEFAULT (CURDATE()),
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_priority (priority),
  INDEX idx_date     (date)
) ENGINE=InnoDB;

-- =============================================================
--  USERS
-- =============================================================
CREATE TABLE users (
  id             INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username       VARCHAR(50)  NOT NULL UNIQUE,
  full_name      VARCHAR(100) NOT NULL,
  email          VARCHAR(120) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  role           ENUM('admin','manager','operator','viewer') NOT NULL DEFAULT 'operator',
  phone          VARCHAR(20)  NULL,
  department     VARCHAR(50)  NULL COMMENT 'IT|Operations|Finance|HR|Admin|Logistics',
  status         ENUM('active','inactive') NOT NULL DEFAULT 'active',
  last_login     DATETIME     NULL,
  login_count    INT          NOT NULL DEFAULT 0,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role   (role),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- =============================================================
--  COORDINATORS (Fleet Coordinators / Staff)
-- =============================================================
CREATE TABLE coordinators (
  id                INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  emp_id            VARCHAR(20)  NOT NULL UNIQUE,
  name              VARCHAR(100) NOT NULL,
  phone             VARCHAR(20)  NOT NULL,
  email             VARCHAR(120) NULL,
  zone              VARCHAR(50)  NULL,
  assigned_vehicles TINYINT      NOT NULL DEFAULT 0,
  join_date         DATE         NULL,
  nid               VARCHAR(20)  NULL,
  address           TEXT         NULL,
  status            ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_zone   (zone)
) ENGINE=InnoDB;

-- =============================================================
--  VENDORS
-- =============================================================
CREATE TABLE vendors (
  id            INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120)  NOT NULL,
  contact       VARCHAR(100)  NULL,
  phone         VARCHAR(20)   NULL,
  email         VARCHAR(120)  NULL,
  category      VARCHAR(40)   NULL COMMENT 'Parts|Fuel|Tyres|Insurance|Lubricant|Electrical|Body Work|Other',
  city          VARCHAR(60)   NULL,
  address       TEXT          NULL,
  tax_id        VARCHAR(40)   NULL,
  bank_account  VARCHAR(60)   NULL,
  credit_limit  DECIMAL(12,2) NOT NULL DEFAULT 0,
  status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status   (status),
  INDEX idx_category (category)
) ENGINE=InnoDB;

-- =============================================================
--  REQUISITIONS (Vehicle Requests)
-- =============================================================
CREATE TABLE requisitions (
  id             INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  req_no         VARCHAR(20)  NOT NULL UNIQUE,
  requested_by   VARCHAR(100) NOT NULL,
  department     VARCHAR(50)  NULL,
  purpose        VARCHAR(200) NOT NULL,
  vehicle_reg    VARCHAR(20)  NULL,
  from_date      DATE         NOT NULL,
  to_date        DATE         NOT NULL,
  from_location  VARCHAR(100) NULL,
  to_location    VARCHAR(100) NULL,
  passengers     TINYINT      NOT NULL DEFAULT 1,
  priority       ENUM('normal','high','urgent') NOT NULL DEFAULT 'normal',
  date           DATE         NOT NULL,
  approved_by    VARCHAR(80)  NULL,
  remarks        TEXT         NULL,
  status         ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status   (status),
  INDEX idx_date     (date),
  INDEX idx_priority (priority)
) ENGINE=InnoDB;

-- =============================================================
--  ROUTES
-- =============================================================
CREATE TABLE routes (
  id                INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  route_code        VARCHAR(20)  NOT NULL UNIQUE,
  name              VARCHAR(120) NOT NULL,
  distance          SMALLINT     NULL COMMENT 'km',
  estimated_time    VARCHAR(20)  NULL COMMENT 'e.g. 5h',
  stops             TINYINT      NOT NULL DEFAULT 0,
  highway           VARCHAR(100) NULL,
  toll_cost         DECIMAL(8,2) NOT NULL DEFAULT 0,
  assigned_vehicles TINYINT      NOT NULL DEFAULT 0,
  last_used         DATE         NULL,
  notes             TEXT         NULL,
  status            ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- =============================================================
--  PARKING SLOTS
-- =============================================================
CREATE TABLE parking_slots (
  id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  slot_no      VARCHAR(10)  NOT NULL UNIQUE,
  vehicle_reg  VARCHAR(20)  NULL,
  type         ENUM('Covered','Open') NOT NULL DEFAULT 'Open',
  zone         VARCHAR(20)  NULL,
  monthly_fee  DECIMAL(8,2) NOT NULL DEFAULT 0,
  parked_since DATE         NULL,
  status       ENUM('available','occupied','reserved') NOT NULL DEFAULT 'available',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_zone   (zone)
) ENGINE=InnoDB;

-- =============================================================
--  AUDIT LOG
-- =============================================================
CREATE TABLE audit_log (
  id         BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  timestamp  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  username   VARCHAR(50)  NOT NULL,
  role       ENUM('admin','manager','operator','viewer') NULL,
  module     VARCHAR(40)  NOT NULL,
  action     VARCHAR(100) NOT NULL,
  detail     TEXT         NULL,
  ip_address VARCHAR(45)  NULL COMMENT 'IPv4 or IPv6',
  status     ENUM('success','failed') NOT NULL DEFAULT 'success',
  INDEX idx_timestamp (timestamp),
  INDEX idx_username  (username),
  INDEX idx_module    (module),
  INDEX idx_status    (status)
) ENGINE=InnoDB;

-- =============================================================
--  SETTINGS (key-value store for app configuration)
-- =============================================================
CREATE TABLE settings (
  id          INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(80)  NOT NULL UNIQUE,
  value       TEXT         NULL,
  category    VARCHAR(40)  NOT NULL DEFAULT 'general' COMMENT 'general|map|notifications|system',
  updated_by  VARCHAR(50)  NULL,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =============================================================
--  DEFAULT SETTINGS
-- =============================================================
INSERT INTO settings (setting_key, value, category) VALUES
  ('org_name',         'My Organisation',  'general'),
  ('timezone',         'Asia/Dhaka',       'general'),
  ('currency',         'BDT',              'general'),
  ('date_format',      'DD MMM YYYY',      'general'),
  ('map_provider',     'openstreetmap',    'map'),
  ('google_maps_key',  '',                 'map'),
  ('default_lat',      '23.8103',          'map'),
  ('default_lng',      '90.4125',          'map'),
  ('default_zoom',     '12',               'map'),
  ('email_alerts',     '1',                'notifications'),
  ('sms_alerts',       '0',                'notifications');

-- =============================================================
--  SAMPLE DATA
-- =============================================================

-- Vehicles
INSERT INTO vehicles (reg_no,make,model,year,type,ownership,color,fuel_type,chassis_no,engine_no,odometer,insurance_expiry,purchase_date,purchase_price,last_service,owner,status) VALUES
  ('DHK-1234','Toyota',    'Hilux',        2021,'Pickup','Private',   'White', 'Diesel','TY001234','EN001234',42500,'2026-12-01','2021-03-15',3200000,'2026-03-10','HQ Fleet','active'),
  ('DHK-5678','Mitsubishi','Canter',       2020,'Truck', 'Government','Blue',  'Diesel','MT005678','EN005678',78200,'2026-09-15','2020-07-20',4500000,'2026-02-22','Branch A','active'),
  ('CTG-0091','Tata',      'Prima',        2019,'Truck', 'Government','Red',   'Diesel','TA000091','EN000091',95000,'2026-06-30','2019-01-10',5800000,'2026-01-05','Branch B','inactive'),
  ('SYL-3322','Toyota',    'Land Cruiser', 2022,'SUV',   'Special',   'Silver','Petrol','TY003322','EN003322',18900,'2027-03-01','2022-06-05',8500000,'2026-04-01','HQ Fleet','active'),
  ('DHK-7741','Isuzu',     'NPR',          2020,'Truck', 'Private',   'White', 'Diesel','IZ007741','EN007741',67800,'2026-11-20','2020-04-18',4200000,'2025-12-15','Branch C','inactive');

-- Drivers
INSERT INTO drivers (name,license_no,phone,nid,dob,blood_group,experience,join_date,address,ownership,status,last_trip,total_trips) VALUES
  ('Rahim Uddin',  'DL-001-2020','01700-000001','1234567890','1985-06-12','A+', 8, '2018-03-01','Mirpur, Dhaka', 'Private',   'active',  '2026-04-15',312),
  ('Karim Ali',    'DL-002-2019','01700-000002','2345678901','1978-11-20','B+', 12,'2014-07-15','Uttara, Dhaka', 'Government','active',  '2026-04-14',540),
  ('Nasir Hossain','DL-003-2021','01700-000003','3456789012','1990-02-28','O+', 5, '2021-01-10','Narayanganj',   'Government','active',  '2026-04-14',178),
  ('Jalal Mia',    'DL-004-2018','01700-000004','4567890123','1972-09-05','AB+',15,'2010-05-20','Sylhet Sadar',  'Special',   'inactive','2026-03-01',810),
  ('Farid Ahmed',  'DL-005-2022','01700-000005','5678901234','1993-04-17','A-', 3, '2023-02-01','Gazipur',       'Private',   'active',  '2026-04-12',95);

-- Driver leave balance (2026)
INSERT INTO driver_leave_balance (driver_id,leave_type,total_days,used_days,year) VALUES
  (1,'Annual',14,6,2026),(1,'Sick',10,0,2026),(1,'Casual',7,1,2026),
  (2,'Annual',14,3,2026),(2,'Sick',10,2,2026),(2,'Casual',7,0,2026),
  (3,'Annual',14,5,2026),(3,'Sick',10,0,2026),(3,'Casual',7,2,2026),
  (4,'Annual',14,0,2026),(4,'Sick',10,1,2026),(4,'Casual',7,1,2026),
  (5,'Annual',14,5,2026),(5,'Sick',10,0,2026),(5,'Casual',7,0,2026);

-- Users (passwords are bcrypt placeholders — replace before production)
INSERT INTO users (username,full_name,email,password_hash,role,phone,department,status,login_count,created_at) VALUES
  ('admin',    'System Admin',  'admin@vms.local',   '$2b$10$placeholder_admin_hash',   'admin',   '01900-000001','IT',        'active', 842,'2024-01-01'),
  ('fleet_mgr','Fleet Manager', 'fleet@vms.local',   '$2b$10$placeholder_mgr_hash',     'manager', '01900-000002','Operations','active', 610,'2024-01-05'),
  ('ops_1',    'Operator One',  'ops1@vms.local',    '$2b$10$placeholder_ops1_hash',    'operator','01900-000003','Operations','active', 290,'2024-02-10'),
  ('ops_2',    'Operator Two',  'ops2@vms.local',    '$2b$10$placeholder_ops2_hash',    'operator','01900-000004','Operations','inactive',150,'2024-03-01'),
  ('viewer_1', 'Report Viewer', 'viewer@vms.local',  '$2b$10$placeholder_viewer_hash',  'viewer',  '01900-000005','Finance',   'active',  88,'2024-04-15');

-- Notices
INSERT INTO notices (title,body,priority,category,posted_by,date) VALUES
  ('Fuel Price Update',       'Diesel price has been revised to BDT 109/L effective 15 Apr 2026.',                         'high',  'Finance',   'Admin',        '2026-04-15'),
  ('Vehicle Inspection Schedule','All vehicles must undergo mandatory inspection on 20 Apr 2026.',                         'medium','Operations','Fleet Manager','2026-04-13'),
  ('Driver Training Session', 'Defensive driving training on 22 Apr 2026 at HQ. Attendance is mandatory for all drivers.','medium','HR',        'HR',           '2026-04-12'),
  ('Office Holiday Notice',   'Office closed on 14 Apr 2026 for Pahela Baishakh.',                                        'low',   'General',   'Admin',        '2026-04-10'),
  ('New Route Policy Effective May','Starting 1 May 2026, all inter-district routes require prior approval.',             'high',  'Operations','Operations',   '2026-04-09');

-- Inventory
INSERT INTO inventory (item_code,name,category,qty,unit,unit_price,location,min_qty,last_restocked,supplier,status) VALUES
  ('INV-001','Engine Oil 5W-30','Lubricant',  24,'Litre',450, 'Shelf A1',10,'2026-04-01','City Lubricants',  'in_stock'),
  ('INV-002','Air Filter',       'Filter',     8, 'Pcs',  850, 'Shelf B2', 5,'2026-03-15','Padma Auto Parts', 'in_stock'),
  ('INV-003','Brake Pad Set',    'Brake Parts',2, 'Set',  3500,'Shelf C1', 3,'2026-02-20','Padma Auto Parts', 'low_stock'),
  ('INV-004','Coolant',          'Fluid',      0, 'Litre',320, 'Shelf A3', 8,'2026-01-10','City Lubricants',  'out_of_stock'),
  ('INV-005','Wiper Blade 22"',  'Accessories',12,'Pcs',  650, 'Shelf D2', 4,'2026-04-05','Padma Auto Parts', 'in_stock');

-- Vendors
INSERT INTO vendors (name,contact,phone,email,category,city,address,tax_id,bank_account,credit_limit,status) VALUES
  ('Padma Auto Parts',   'Anwar Hossain','01711-111111','padma@parts.com',    'Parts',    'Dhaka',       '12 Elephant Rd','TIN-001','BRAC-001',200000,'active'),
  ('Meghna Fuel Station','Rafiq Islam',  '01711-222222','meghna@fuel.com',    'Fuel',     'Narayanganj', '5 Fatullah Rd', 'TIN-002','DBL-002', 500000,'active'),
  ('Jamuna Tyres',       'Sumon Mia',    '01711-333333','jamuna@tyres.com',   'Tyres',    'Dhaka',       '88 Mirpur Rd',  'TIN-003','EBL-003', 300000,'active'),
  ('BD Insurance Co.',   'Farida Begum', '01711-444444','bd@insurance.com',   'Insurance','Dhaka',       '3 Motijheel',   'TIN-004','HSBC-004',0,     'active'),
  ('City Lubricants',    'Khalid Hasan', '01711-555555','city@lubricants.com','Lubricant','Chittagong',  '22 Agrabad',    'TIN-005','SBL-005', 150000,'inactive');

-- Routes
INSERT INTO routes (route_code,name,distance,estimated_time,stops,highway,toll_cost,assigned_vehicles,last_used,status) VALUES
  ('RT-001','Dhaka - Chittagong',250,'5h',  3,'Dhaka-Ctg Highway',800, 5,'2026-04-15','active'),
  ('RT-002','Dhaka - Sylhet',    240,'4.5h',2,'Dhaka-Sylhet Hwy', 650, 3,'2026-04-14','active'),
  ('RT-003','Dhaka - Rajshahi',  260,'5.5h',4,'N5 Highway',       700, 2,'2026-04-13','active'),
  ('RT-004','Dhaka - Khulna',    280,'6h',  3,'N8 Highway',       900, 0,'2026-03-20','inactive'),
  ('RT-005','Chittagong - Cox',  150,'3h',  2,'Ctg-Cox Hwy',      400, 2,'2026-04-12','active');

-- Parking slots
INSERT INTO parking_slots (slot_no,vehicle_reg,type,zone,monthly_fee,parked_since,status) VALUES
  ('P-01','DHK-1234','Covered','Zone A',3000,'2026-04-01','occupied'),
  ('P-02','DHK-5678','Covered','Zone A',3000,'2026-04-01','occupied'),
  ('P-03',NULL,      'Open',   'Zone B',1500,NULL,        'available'),
  ('P-04','CTG-0091','Open',   'Zone B',1500,'2026-03-15','occupied'),
  ('P-05',NULL,      'Covered','Zone A',3000,NULL,        'available'),
  ('P-06','DHK-7741','Open',   'Zone C',1500,'2026-04-10','occupied');

-- =============================================================
--  END OF SCHEMA
-- =============================================================
