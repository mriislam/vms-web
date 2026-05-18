package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.entity.DriverLeave;
import com.nexdecade.vms.service.AuditLogService;
import com.nexdecade.vms.service.DriverLeaveService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/driver-leave")
@RequiredArgsConstructor
public class DriverLeaveController {

    private final DriverLeaveService service;
    private final AuditLogService audit;

    @GetMapping
    public ResponseEntity<ApiResponse<List<DriverLeave>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DriverLeave>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DriverLeave>> create(@RequestBody DriverLeave l, HttpServletRequest req) {
        DriverLeave saved = service.save(l);
        audit.log(user(), null, "Leave", "Apply Leave", saved.getDriverName() + " — " + saved.getLeaveType(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Leave applied", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DriverLeave>> update(@PathVariable Long id, @RequestBody DriverLeave l, HttpServletRequest req) {
        DriverLeave updated = service.update(id, l);
        return ResponseEntity.ok(ApiResponse.ok("Leave updated", updated));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<DriverLeave>> setStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            HttpServletRequest req) {
        String status = body.get("status");
        String approvedBy = body.getOrDefault("approvedBy", user());
        DriverLeave l = service.setStatus(id, status, approvedBy);
        audit.log(user(), null, "Leave", status.equals("approved") ? "Approve Leave" : "Reject Leave",
                l.getDriverName() + " → " + status, req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Status updated", l));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id, HttpServletRequest req) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Leave deleted", null));
    }

    private String user() { return SecurityContextHolder.getContext().getAuthentication().getName(); }
}
