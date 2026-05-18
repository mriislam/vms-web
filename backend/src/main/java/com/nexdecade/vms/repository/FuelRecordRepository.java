package com.nexdecade.vms.repository;

import com.nexdecade.vms.entity.FuelRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FuelRecordRepository extends JpaRepository<FuelRecord, Long> {
    List<FuelRecord> findByVehicleReg(String vehicleReg);
    List<FuelRecord> findByDriverName(String driverName);
}
