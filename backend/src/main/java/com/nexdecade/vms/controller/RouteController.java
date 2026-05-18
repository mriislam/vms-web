package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.entity.Route;
import com.nexdecade.vms.service.AuditLogService;
import com.nexdecade.vms.service.RouteService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/routes")
@RequiredArgsConstructor
public class RouteController {

    private final RouteService service;
    private final AuditLogService audit;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Route>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Route>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Route>> create(@RequestBody Route r, HttpServletRequest req) {
        Route saved = service.save(r);
        audit.log(user(), null, "Routes", "Add Route", "Added " + saved.getName(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Route added", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Route>> update(@PathVariable Long id, @RequestBody Route r, HttpServletRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("Route updated", service.update(id, r)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id, HttpServletRequest req) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Route deleted", null));
    }

    private String user() { return SecurityContextHolder.getContext().getAuthentication().getName(); }
}
