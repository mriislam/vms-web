SELECT 'vehicles' t, COUNT(*) c FROM vehicles
UNION ALL SELECT 'drivers', COUNT(*) FROM drivers
UNION ALL SELECT 'dispatch', COUNT(*) FROM dispatch
UNION ALL SELECT 'fuel_records', COUNT(*) FROM fuel_records
UNION ALL SELECT 'maintenance', COUNT(*) FROM maintenance
UNION ALL SELECT 'expenses', COUNT(*) FROM expenses
UNION ALL SELECT 'accidents', COUNT(*) FROM accidents
UNION ALL SELECT 'inventory', COUNT(*) FROM inventory
UNION ALL SELECT 'requisitions', COUNT(*) FROM requisitions
UNION ALL SELECT 'coordinators', COUNT(*) FROM coordinators
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'notices', COUNT(*) FROM notices
UNION ALL SELECT 'routes', COUNT(*) FROM routes
UNION ALL SELECT 'parking_slots', COUNT(*) FROM parking_slots
UNION ALL SELECT 'vendors', COUNT(*) FROM vendors
UNION ALL SELECT 'vehicle_requisition', COUNT(*) FROM vehicle_requisition;

DESCRIBE accidents;
DESCRIBE vehicle_requisition;
