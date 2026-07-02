package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.entity.Tenant;
import com.nexdecade.vms.entity.User;
import com.nexdecade.vms.repository.TenantRepository;
import com.nexdecade.vms.repository.UserRepository;
import com.nexdecade.vms.service.TenantService;
import com.nexdecade.vms.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tenants")
@RequiredArgsConstructor
public class TenantController {

    private final TenantService    tenantService;
    private final TenantRepository tenantRepo;
    private final UserService      userService;
    private final UserRepository   userRepo;

    // ── Public ────────────────────────────────────────────────────────────────

    /** Resolve a tenant by slug before login (public, no auth required). */
    @GetMapping("/resolve/{slug}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> resolve(@PathVariable String slug) {
        Tenant t = tenantService.findBySlug(slug);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "id",      t.getId(),
            "name",    t.getName(),
            "slug",    t.getSlug(),
            "logoUrl", t.getLogoUrl() != null ? t.getLogoUrl() : "",
            "plan",    t.getPlan()    != null ? t.getPlan()    : "starter",
            "status",  t.getStatus()
        )));
    }

    // ── Super-admin CRUD (require auth) ───────────────────────────────────────

    @GetMapping
    public ResponseEntity<ApiResponse<List<Tenant>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(tenantService.findAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Tenant>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(tenantService.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Tenant>> create(@RequestBody Tenant body) {
        return ResponseEntity.ok(ApiResponse.ok("Tenant created", tenantService.create(body)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Tenant>> update(@PathVariable Long id, @RequestBody Tenant body) {
        return ResponseEntity.ok(ApiResponse.ok("Tenant updated", tenantService.update(id, body)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        tenantService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Tenant deleted", null));
    }

    /** Create the first admin user for a new tenant. */
    @PostMapping("/{id}/provision")
    public ResponseEntity<ApiResponse<User>> provision(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        Tenant t = tenantService.findById(id);
        User u = new User();
        u.setTenantId(t.getId());
        u.setUsername(body.getOrDefault("username", t.getSlug() + "_admin"));
        u.setFullName(body.getOrDefault("fullName", t.getName() + " Admin"));
        u.setEmail(body.getOrDefault("email", "admin@" + t.getSlug() + ".com"));
        u.setRole("admin");
        u.setStatus("active");
        u.setDepartment("Administration");
        u.setLoginCount(0);
        u.setMfaEnabled(false);
        User saved = userService.create(u, body.getOrDefault("password", "Welcome@123"));
        return ResponseEntity.ok(ApiResponse.ok("Admin provisioned", saved));
    }

    /** Basic usage stats for one tenant. */
    @GetMapping("/{id}/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> stats(@PathVariable Long id) {
        tenantService.findById(id); // validate exists
        long users    = userRepo.countByTenantId(id);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "tenantId", id,
            "users",    users
        )));
    }
}
