package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.entity.ParkingSlot;
import com.nexdecade.vms.service.AuditLogService;
import com.nexdecade.vms.service.ParkingSlotService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/parking")
@RequiredArgsConstructor
public class ParkingController {

    private final ParkingSlotService service;
    private final AuditLogService audit;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ParkingSlot>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ParkingSlot>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ParkingSlot>> create(@RequestBody ParkingSlot s, HttpServletRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("Slot added", service.save(s)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ParkingSlot>> update(@PathVariable Long id, @RequestBody ParkingSlot s, HttpServletRequest req) {
        ParkingSlot updated = service.update(id, s);
        audit.log(user(), null, "Parking", "Update Slot", "Updated slot " + updated.getSlotNo(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Slot updated", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id, HttpServletRequest req) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Slot deleted", null));
    }

    private String user() { return SecurityContextHolder.getContext().getAuthentication().getName(); }
}
