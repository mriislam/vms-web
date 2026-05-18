package com.nexdecade.vms.service;

import com.nexdecade.vms.entity.FuelRecord;
import com.nexdecade.vms.exception.ResourceNotFoundException;
import com.nexdecade.vms.repository.FuelRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service @RequiredArgsConstructor
public class FuelRecordService {
    private final FuelRecordRepository repo;

    public List<FuelRecord> findAll() { return repo.findAll(); }

    public FuelRecord findById(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Fuel record not found: " + id));
    }

    public FuelRecord save(FuelRecord r) {
        if (r.getSlipNo() == null || r.getSlipNo().isBlank()) {
            r.setSlipNo("SLP-" + String.format("%03d", repo.count() + 1));
        }
        return repo.save(r);
    }

    public FuelRecord update(Long id, FuelRecord r) {
        FuelRecord existing = findById(id);
        r.setId(existing.getId());
        r.setCreatedAt(existing.getCreatedAt());
        return repo.save(r);
    }

    public void delete(Long id) { findById(id); repo.deleteById(id); }
}
