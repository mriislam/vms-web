-- Add vehicle_icon column to vehicles table
-- Run once against vms_db

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS vehicle_icon VARCHAR(40) NOT NULL DEFAULT 'car';
