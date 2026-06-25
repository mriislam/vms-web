package com.nexdecade.vms.repository;

import com.nexdecade.vms.entity.Requisition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface RequisitionRepository extends JpaRepository<Requisition, Long> {
    List<Requisition> findByStatus(String status);
    List<Requisition> findByDepartment(String department);
    List<Requisition> findByDriverId(Integer driverId);
    List<Requisition> findByStatusIn(List<String> statuses);
    List<Requisition> findByStatusAndFromDatetimeIsNotNull(String status);

    @Query(value = "SELECT MAX(CAST(SUBSTRING(req_no, 5) AS UNSIGNED)) FROM requisitions WHERE req_no REGEXP '^REQ-[0-9]+$'", nativeQuery = true)
    Optional<Integer> findMaxReqNumber();
}
