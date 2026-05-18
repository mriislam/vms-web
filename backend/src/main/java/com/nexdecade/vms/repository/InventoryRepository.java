package com.nexdecade.vms.repository;

import com.nexdecade.vms.entity.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InventoryRepository extends JpaRepository<Inventory, Long> {
    List<Inventory> findByStatus(String status);
    List<Inventory> findByCategory(String category);
}
