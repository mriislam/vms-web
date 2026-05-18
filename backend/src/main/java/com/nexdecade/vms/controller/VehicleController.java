package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.entity.Vehicle;
import com.nexdecade.vms.service.AuditLogService;
import com.nexdecade.vms.service.VehicleService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
public class VehicleController {

    private final VehicleService service;
    private final AuditLogService audit;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Vehicle>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Vehicle>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Vehicle>> create(@RequestBody Vehicle v, HttpServletRequest req) {
        Vehicle saved = service.save(v);
        audit.log(user(), null, "Vehicles", "Add Vehicle", "Added vehicle " + saved.getRegNo(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Vehicle added", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Vehicle>> update(@PathVariable Long id, @RequestBody Vehicle v, HttpServletRequest req) {
        Vehicle updated = service.update(id, v);
        audit.log(user(), null, "Vehicles", "Edit Vehicle", "Updated vehicle " + updated.getRegNo(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Vehicle updated", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id, HttpServletRequest req) {
        Vehicle v = service.findById(id);
        service.delete(id);
        audit.log(user(), null, "Vehicles", "Delete Vehicle", "Deleted vehicle " + v.getRegNo(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Vehicle deleted", null));
    }

    private String user() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}
