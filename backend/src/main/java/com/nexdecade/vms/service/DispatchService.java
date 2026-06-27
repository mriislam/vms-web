package com.nexdecade.vms.service;

import com.nexdecade.vms.entity.Dispatch;
import com.nexdecade.vms.exception.ResourceNotFoundException;
import com.nexdecade.vms.repository.DispatchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import java.util.Map;

@Service @RequiredArgsConstructor
public class DispatchService {
    private final DispatchRepository repo;

    private static final Map<String,String> NEXT_STATUS = Map.of(
        "pending","approved","approved","in_progress","in_progress","completed"
    );

    public List<Dispatch> findAll() { return repo.findAll(); }

    public Dispatch findById(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Dispatch not found: " + id));
    }

    public Dispatch save(Dispatch d) {
        if (d.getDispatchNo() == null || d.getDispatchNo().isBlank()) {
            // Generate a year-prefixed, collision-safe dispatch number
            String year = String.valueOf(Year.now().getValue());
            String prefix = "DSP-" + year + "-";
            long seq = 1;
            String candidate;
            do {
                candidate = prefix + String.format("%04d", seq++);
            } while (repo.existsByDispatchNo(candidate));
            d.setDispatchNo(candidate);
        }
        if (d.getStatus() == null) d.setStatus("pending");
        return repo.save(d);
    }

    public Dispatch update(Long id, Dispatch d) {
        Dispatch existing = findById(id);
        d.setId(existing.getId());
        d.setCreatedAt(existing.getCreatedAt());
        return repo.save(d);
    }

    public Dispatch advanceStatus(Long id) {
        Dispatch d = findById(id);
        String next = NEXT_STATUS.get(d.getStatus());
        if (next == null) throw new IllegalStateException("Cannot advance from status: " + d.getStatus());
        d.setStatus(next);
        if ("in_progress".equals(next)) d.setStartTime(LocalDateTime.now());
        if ("completed".equals(next)) d.setEndTime(LocalDateTime.now());
        return repo.save(d);
    }

    public void delete(Long id) { findById(id); repo.deleteById(id); }
}
