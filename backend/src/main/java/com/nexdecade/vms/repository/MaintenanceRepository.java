package com.nexdecade.vms.repository;

import com.nexdecade.vms.entity.Maintenance;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MaintenanceRepository extends JpaRepository<Maintenance, Long> {
    List<Maintenance> findByStatus(String status);
    List<Maintenance> findByVehicleReg(String vehicleReg);
}
