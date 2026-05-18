package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.entity.FuelRecord;
import com.nexdecade.vms.service.AuditLogService;
import com.nexdecade.vms.service.FuelRecordService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/fuel")
@RequiredArgsConstructor
public class FuelController {

    private final FuelRecordService service;
    private final AuditLogService audit;

    @GetMapping
    public ResponseEntity<ApiResponse<List<FuelRecord>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<FuelRecord>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<FuelRecord>> create(@RequestBody FuelRecord r, HttpServletRequest req) {
        FuelRecord saved = service.save(r);
        audit.log(user(), null, "Fuel", "Add Fuel Record", "Added " + saved.getLiters() + "L for " + saved.getVehicleReg(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Fuel record added", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<FuelRecord>> update(@PathVariable Long id, @RequestBody FuelRecord r, HttpServletRequest req) {
        FuelRecord updated = service.update(id, r);
        audit.log(user(), null, "Fuel", "Edit Fuel Record", "Updated " + updated.getSlipNo(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Fuel record updated", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id, HttpServletRequest req) {
        service.delete(id);
        audit.log(user(), null, "Fuel", "Delete Fuel Record", "Deleted fuel record #" + id, req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Fuel record deleted", null));
    }

    private String user() { return SecurityContextHolder.getContext().getAuthentication().getName(); }
}
