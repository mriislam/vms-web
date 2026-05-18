package com.nexdecade.vms.repository;

import com.nexdecade.vms.entity.Requisition;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RequisitionRepository extends JpaRepository<Requisition, Long> {
    List<Requisition> findByStatus(String status);
    List<Requisition> findByDepartment(String department);
}
