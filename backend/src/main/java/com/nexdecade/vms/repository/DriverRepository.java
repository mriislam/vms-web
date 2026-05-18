package com.nexdecade.vms.repository;

import com.nexdecade.vms.entity.Driver;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DriverRepository extends JpaRepository<Driver, Long> {
    List<Driver> findByStatus(String status);
    List<Driver> findByOwnership(String ownership);
    boolean existsByLicenseNo(String licenseNo);
}
