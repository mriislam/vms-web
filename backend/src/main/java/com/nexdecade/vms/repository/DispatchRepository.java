package com.nexdecade.vms.repository;

import com.nexdecade.vms.entity.Dispatch;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DispatchRepository extends JpaRepository<Dispatch, Long> {
    List<Dispatch> findByStatus(String status);
    List<Dispatch> findByStatusIn(List<String> statuses);
    List<Dispatch> findByVehicleReg(String vehicleReg);
    List<Dispatch> findByDriverName(String driverName);
    List<Dispatch> findByDriverNameAndStatus(String driverName, String status);
    List<Dispatch> findByDriverNameAndStatusIn(String driverName, List<String> statuses);
    boolean existsByDispatchNo(String dispatchNo);
}
