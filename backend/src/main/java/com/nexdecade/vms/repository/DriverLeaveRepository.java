package com.nexdecade.vms.repository;

import com.nexdecade.vms.entity.DriverLeave;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DriverLeaveRepository extends JpaRepository<DriverLeave, Long> {
    List<DriverLeave> findByStatus(String status);
    List<DriverLeave> findByDriverName(String driverName);
}
