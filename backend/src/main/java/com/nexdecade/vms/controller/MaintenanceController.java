package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.entity.Maintenance;
import com.nexdecade.vms.service.AuditLogService;
import com.nexdecade.vms.service.MaintenanceService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/maintenance")
@RequiredArgsConstructor
public class MaintenanceController {

    private final MaintenanceService service;
    private final AuditLogService audit;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Maintenance>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Maintenance>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Maintenance>> create(@RequestBody Maintenance m, HttpServletRequest req) {
        Maintenance saved = service.save(m);
        audit.log(user(), null, "Maintenance", "Add Maintenance Record", saved.getType() + " for " + saved.getVehicleReg(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Maintenance logged", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Maintenance>> update(@PathVariable Long id, @RequestBody Maintenance m, HttpServletRequest req) {
        Maintenance updated = service.update(id, m);
        audit.log(user(), null, "Maintenance", "Edit Maintenance Record", "Updated record #" + id, req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Maintenance updated", updated));
    }

    @PatchMapping("/{id}/advance")
    public ResponseEntity<ApiResponse<Maintenance>> advance(@PathVariable Long id, HttpServletRequest req) {
        Maintenance m = service.advanceStatus(id);
        audit.log(user(), null, "Maintenance", "Advance Maintenance", "Status → " + m.getStatus(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Status updated", m));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id, HttpServletRequest req) {
        service.delete(id);
        audit.log(user(), null, "Maintenance", "Delete Maintenance Record", "Deleted record #" + id, req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Record deleted", null));
    }

    private String user() { return SecurityContextHolder.getContext().getAuthentication().getName(); }
}
