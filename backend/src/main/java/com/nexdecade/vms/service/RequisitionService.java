package com.nexdecade.vms.service;

import com.nexdecade.vms.entity.Requisition;
import com.nexdecade.vms.exception.ResourceNotFoundException;
import com.nexdecade.vms.repository.RequisitionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RequisitionService {
    private final RequisitionRepository repo;
    private final TripNotificationService notif;

    public RequisitionService(RequisitionRepository repo, @Lazy TripNotificationService notif) {
        this.repo = repo;
        this.notif = notif;
    }

    public List<Requisition> findAll() { return repo.findAll(); }

    public Requisition findById(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Requisition not found: " + id));
    }

    public Requisition save(Requisition r) {
        if (r.getReqNo() == null || r.getReqNo().isBlank()) {
            int next = repo.findMaxReqNumber().orElse(0) + 1;
            r.setReqNo("REQ-" + String.format("%03d", next));
        }
        if (r.getStatus() == null)          r.setStatus("pending");
        if (r.getPriority() == null)        r.setPriority("normal");
        if (r.getPassengers() == null)      r.setPassengers(1);
        if (r.getGeofenceRadiusM() == null) r.setGeofenceRadiusM(500);
        return repo.save(r);
    }

    public Requisition update(Long id, Requisition r) {
        Requisition existing = findById(id);
        r.setId(existing.getId());
        r.setReqNo(existing.getReqNo());
        r.setCreatedAt(existing.getCreatedAt());
        if (r.getGeofenceRadiusM() == null)
            r.setGeofenceRadiusM(existing.getGeofenceRadiusM() != null ? existing.getGeofenceRadiusM() : 500);
        if (r.getPassengers() == null)
            r.setPassengers(existing.getPassengers() != null ? existing.getPassengers() : 1);
        if (r.getStatus() == null)
            r.setStatus(existing.getStatus() != null ? existing.getStatus() : "pending");
        return repo.save(r);
    }

    public Requisition setStatus(Long id, String status, String approvedBy) {
        Requisition r = findById(id);
        String prevStatus = r.getStatus();
        r.setStatus(status);
        if (approvedBy != null) r.setApprovedBy(approvedBy);
        Requisition saved = repo.save(r);

        // Fire notifications on key transitions
        if ("approved".equals(status) && !"approved".equals(prevStatus)) {
            notif.notifyApproved(saved);
        }

        return saved;
    }

    public void delete(Long id) { findById(id); repo.deleteById(id); }
}
