package com.nexdecade.vms.service;

import com.nexdecade.vms.entity.Inventory;
import com.nexdecade.vms.exception.ResourceNotFoundException;
import com.nexdecade.vms.repository.InventoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service @RequiredArgsConstructor
public class InventoryService {
    private final InventoryRepository repo;

    public List<Inventory> findAll() { return repo.findAll(); }

    public Inventory findById(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Item not found: " + id));
    }

    public Inventory save(Inventory i) {
        if (i.getItemCode() == null || i.getItemCode().isBlank()) {
            i.setItemCode("INV-" + String.format("%03d", repo.count() + 1));
        }
        i.setStatus(computeStatus(i.getQty(), i.getMinQty()));
        return repo.save(i);
    }

    public Inventory update(Long id, Inventory i) {
        Inventory existing = findById(id);
        i.setId(existing.getId());
        i.setCreatedAt(existing.getCreatedAt());
        i.setStatus(computeStatus(i.getQty(), i.getMinQty()));
        return repo.save(i);
    }

    public void delete(Long id) { findById(id); repo.deleteById(id); }

    private String computeStatus(int qty, int minQty) {
        if (qty <= 0) return "out_of_stock";
        if (qty <= minQty) return "low_stock";
        return "in_stock";
    }
}
