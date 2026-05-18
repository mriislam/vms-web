package com.nexdecade.vms.service;

import com.nexdecade.vms.entity.Requisition;
import com.nexdecade.vms.exception.ResourceNotFoundException;
import com.nexdecade.vms.repository.RequisitionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service @RequiredArgsConstructor
public class RequisitionService {
    private final RequisitionRepository repo;

    public List<Requisition> findAll() { return repo.findAll(); }

    public Requisition findById(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Requisition not found: " + id));
    }

    public Requisition save(Requisition r) {
        if (r.getReqNo() == null || r.getReqNo().isBlank()) {
            r.setReqNo("REQ-" + String.format("%03d", repo.count() + 1));
        }
        if (r.getStatus() == null) r.setStatus("pending");
        return repo.save(r);
    }

    public Requisition update(Long id, Requisition r) {
        Requisition existing = findById(id);
        r.setId(existing.getId());
        r.setCreatedAt(existing.getCreatedAt());
        return repo.save(r);
    }

    public Requisition setStatus(Long id, String status, String approvedBy) {
        Requisition r = findById(id);
        r.setStatus(status);
        if (approvedBy != null) r.setApprovedBy(approvedBy);
        return repo.save(r);
    }

    public void delete(Long id) { findById(id); repo.deleteById(id); }
}
