package com.nexdecade.vms.repository;

import com.nexdecade.vms.entity.Coordinator;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CoordinatorRepository extends JpaRepository<Coordinator, Long> {
    List<Coordinator> findByStatus(String status);
    List<Coordinator> findByZone(String zone);
}
