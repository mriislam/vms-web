package com.nexdecade.vms.repository;

import com.nexdecade.vms.entity.DriverLeaveBalance;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DriverLeaveBalanceRepository extends JpaRepository<DriverLeaveBalance, Long> {
    List<DriverLeaveBalance> findByDriverIdAndYear(Long driverId, Integer year);
}
