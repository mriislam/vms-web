package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.entity.Dispatch;
import com.nexdecade.vms.service.AuditLogService;
import com.nexdecade.vms.service.DispatchService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicle-requisition")
@RequiredArgsConstructor
public class DispatchController {

    private final DispatchService service;
    private final AuditLogService audit;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Dispatch>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Dispatch>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Dispatch>> create(@RequestBody Dispatch d, HttpServletRequest req) {
        Dispatch saved = service.save(d);
        audit.log(user(), null, "Vehicle Requisition", "Create Vehicle Requisition", "Created " + saved.getDispatchNo(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Dispatch created", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Dispatch>> update(@PathVariable Long id, @RequestBody Dispatch d, HttpServletRequest req) {
        Dispatch updated = service.update(id, d);
        audit.log(user(), null, "Vehicle Requisition", "Edit Vehicle Requisition", "Updated " + updated.getDispatchNo(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Dispatch updated", updated));
    }

    @PatchMapping("/{id}/advance")
    public ResponseEntity<ApiResponse<Dispatch>> advance(@PathVariable Long id, HttpServletRequest req) {
        Dispatch d = service.advanceStatus(id);
        audit.log(user(), null, "Vehicle Requisition", "Advance Vehicle Requisition", d.getDispatchNo() + " → " + d.getStatus(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Status updated", d));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id, HttpServletRequest req) {
        Dispatch d = service.findById(id);
        service.delete(id);
        audit.log(user(), null, "Vehicle Requisition", "Delete Vehicle Requisition", "Deleted " + d.getDispatchNo(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Dispatch deleted", null));
    }

    private String user() { return SecurityContextHolder.getContext().getAuthentication().getName(); }
}
