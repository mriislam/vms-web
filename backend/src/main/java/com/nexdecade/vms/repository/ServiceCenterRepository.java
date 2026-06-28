package com.nexdecade.vms.repository;

import com.nexdecade.vms.entity.ServiceCenter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceCenterRepository extends JpaRepository<ServiceCenter, Long> {
    List<ServiceCenter> findByStatus(String status);
    List<ServiceCenter> findAllByOrderByNameAsc();
}
