package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.entity.Requisition;
import com.nexdecade.vms.service.AuditLogService;
import com.nexdecade.vms.service.RequisitionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/requisitions")
@RequiredArgsConstructor
public class RequisitionController {

    private final RequisitionService service;
    private final AuditLogService audit;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Requisition>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Requisition>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Requisition>> create(@RequestBody Requisition r, HttpServletRequest req) {
        Requisition saved = service.save(r);
        audit.log(user(), null, "Requisitions", "Create Requisition", "Created " + saved.getReqNo(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Requisition created", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Requisition>> update(@PathVariable Long id, @RequestBody Requisition r, HttpServletRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("Requisition updated", service.update(id, r)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Requisition>> setStatus(
            @PathVariable Long id, @RequestBody Map<String, String> body, HttpServletRequest req) {
        Requisition r = service.setStatus(id, body.get("status"), body.get("approvedBy"));
        audit.log(user(), null, "Requisitions", body.get("status").equals("approved") ? "Approve Requisition" : "Reject Requisition",
                r.getReqNo() + " → " + r.getStatus(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Status updated", r));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id, HttpServletRequest req) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Requisition deleted", null));
    }

    private String user() { return SecurityContextHolder.getContext().getAuthentication().getName(); }
}
