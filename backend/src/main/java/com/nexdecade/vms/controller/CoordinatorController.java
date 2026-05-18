package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.entity.Coordinator;
import com.nexdecade.vms.service.AuditLogService;
import com.nexdecade.vms.service.CoordinatorService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/coordinators")
@RequiredArgsConstructor
public class CoordinatorController {

    private final CoordinatorService service;
    private final AuditLogService audit;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Coordinator>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Coordinator>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Coordinator>> create(@RequestBody Coordinator c, HttpServletRequest req) {
        Coordinator saved = service.save(c);
        audit.log(user(), null, "Coordinators", "Add Coordinator", "Added " + saved.getName(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Coordinator added", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Coordinator>> update(@PathVariable Long id, @RequestBody Coordinator c, HttpServletRequest req) {
        Coordinator updated = service.update(id, c);
        return ResponseEntity.ok(ApiResponse.ok("Coordinator updated", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id, HttpServletRequest req) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Coordinator deleted", null));
    }

    private String user() { return SecurityContextHolder.getContext().getAuthentication().getName(); }
}
