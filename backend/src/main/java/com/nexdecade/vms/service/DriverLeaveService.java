package com.nexdecade.vms.service;

import com.nexdecade.vms.entity.DriverLeave;
import com.nexdecade.vms.exception.ResourceNotFoundException;
import com.nexdecade.vms.repository.DriverLeaveRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service @RequiredArgsConstructor
public class DriverLeaveService {
    private final DriverLeaveRepository repo;

    public List<DriverLeave> findAll() { return repo.findAll(); }

    public DriverLeave findById(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Leave not found: " + id));
    }

    public DriverLeave save(DriverLeave l) {
        if (l.getStatus() == null) l.setStatus("pending");
        if (l.getAppliedOn() == null) l.setAppliedOn(LocalDate.now());
        return repo.save(l);
    }

    public DriverLeave update(Long id, DriverLeave l) {
        DriverLeave existing = findById(id);
        l.setId(existing.getId());
        l.setCreatedAt(existing.getCreatedAt());
        return repo.save(l);
    }

    public DriverLeave setStatus(Long id, String status, String approvedBy) {
        DriverLeave l = findById(id);
        l.setStatus(status);
        if (approvedBy != null) l.setApprovedBy(approvedBy);
        return repo.save(l);
    }

    public void delete(Long id) { findById(id); repo.deleteById(id); }
}
