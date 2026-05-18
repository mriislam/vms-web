package com.nexdecade.vms.service;

import com.nexdecade.vms.entity.Maintenance;
import com.nexdecade.vms.exception.ResourceNotFoundException;
import com.nexdecade.vms.repository.MaintenanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service @RequiredArgsConstructor
public class MaintenanceService {
    private final MaintenanceRepository repo;
    private static final Map<String,String> NEXT = Map.of("pending","in_progress","in_progress","completed");

    public List<Maintenance> findAll() { return repo.findAll(); }

    public Maintenance findById(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Maintenance not found: " + id));
    }

    public Maintenance save(Maintenance m) {
        if (m.getStatus() == null) m.setStatus("pending");
        return repo.save(m);
    }

    public Maintenance update(Long id, Maintenance m) {
        Maintenance existing = findById(id);
        m.setId(existing.getId());
        m.setCreatedAt(existing.getCreatedAt());
        return repo.save(m);
    }

    public Maintenance advanceStatus(Long id) {
        Maintenance m = findById(id);
        String next = NEXT.get(m.getStatus());
        if (next == null) throw new IllegalStateException("Cannot advance from: " + m.getStatus());
        m.setStatus(next);
        return repo.save(m);
    }

    public void delete(Long id) { findById(id); repo.deleteById(id); }
}
