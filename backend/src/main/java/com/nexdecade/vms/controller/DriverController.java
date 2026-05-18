package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.entity.Driver;
import com.nexdecade.vms.entity.DriverLeaveBalance;
import com.nexdecade.vms.repository.DriverLeaveBalanceRepository;
import com.nexdecade.vms.service.AuditLogService;
import com.nexdecade.vms.service.DriverService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.Year;
import java.util.List;

@RestController
@RequestMapping("/api/drivers")
@RequiredArgsConstructor
public class DriverController {

    private final DriverService service;
    private final AuditLogService audit;
    private final DriverLeaveBalanceRepository leaveBalanceRepo;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Driver>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Driver>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id)));
    }

    @GetMapping("/{id}/leave-balance")
    public ResponseEntity<ApiResponse<List<DriverLeaveBalance>>> getLeaveBalance(@PathVariable Long id) {
        int year = Year.now().getValue();
        return ResponseEntity.ok(ApiResponse.ok(leaveBalanceRepo.findByDriverIdAndYear((long) id, year)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Driver>> create(@RequestBody Driver d, HttpServletRequest req) {
        Driver saved = service.save(d);
        audit.log(user(), null, "Drivers", "Add Driver", "Added driver " + saved.getName(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Driver added", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Driver>> update(@PathVariable Long id, @RequestBody Driver d, HttpServletRequest req) {
        Driver updated = service.update(id, d);
        audit.log(user(), null, "Drivers", "Edit Driver", "Updated driver " + updated.getName(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Driver updated", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id, HttpServletRequest req) {
        Driver d = service.findById(id);
        service.delete(id);
        audit.log(user(), null, "Drivers", "Delete Driver", "Deleted driver " + d.getName(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Driver deleted", null));
    }

    private String user() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}
