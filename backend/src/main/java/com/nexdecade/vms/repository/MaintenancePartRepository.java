package com.nexdecade.vms.repository;

import com.nexdecade.vms.entity.MaintenancePart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MaintenancePartRepository extends JpaRepository<MaintenancePart, Long> {
    List<MaintenancePart> findByMaintenanceIdOrderByCreatedAtAsc(Long maintenanceId);
    void deleteByMaintenanceId(Long maintenanceId);
}
