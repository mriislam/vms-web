package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.entity.Inventory;
import com.nexdecade.vms.service.AuditLogService;
import com.nexdecade.vms.service.InventoryService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService service;
    private final AuditLogService audit;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Inventory>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Inventory>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Inventory>> create(@RequestBody Inventory i, HttpServletRequest req) {
        Inventory saved = service.save(i);
        audit.log(user(), null, "Inventory", "Add Item", "Added " + saved.getName(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Item added", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Inventory>> update(@PathVariable Long id, @RequestBody Inventory i, HttpServletRequest req) {
        Inventory updated = service.update(id, i);
        audit.log(user(), null, "Inventory", "Update Stock", "Updated " + updated.getName() + " qty=" + updated.getQty(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Item updated", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id, HttpServletRequest req) {
        service.delete(id);
        audit.log(user(), null, "Inventory", "Delete Item", "Deleted item #" + id, req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Item deleted", null));
    }

    private String user() { return SecurityContextHolder.getContext().getAuthentication().getName(); }
}
