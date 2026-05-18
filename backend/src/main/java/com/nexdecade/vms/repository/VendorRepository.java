package com.nexdecade.vms.repository;

import com.nexdecade.vms.entity.Vendor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VendorRepository extends JpaRepository<Vendor, Long> {
    List<Vendor> findByStatus(String status);
    List<Vendor> findByCategory(String category);
}
