package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.entity.Accident;
import com.nexdecade.vms.service.AccidentService;
import com.nexdecade.vms.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/accidents")
@RequiredArgsConstructor
public class AccidentController {

    private final AccidentService service;
    private final AuditLogService audit;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Accident>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Accident>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Accident>> create(@RequestBody Accident a, HttpServletRequest req) {
        Accident saved = service.save(a);
        audit.log(user(), null, "Accidents", "Report Incident",
                "Reported " + saved.getCaseNo(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Incident reported", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Accident>> update(@PathVariable Long id,
            @RequestBody Accident a, HttpServletRequest req) {
        Accident updated = service.update(id, a);
        audit.log(user(), null, "Accidents", "Update Incident",
                "Updated " + updated.getCaseNo(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Incident updated", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id, HttpServletRequest req) {
        Accident a = service.findById(id);
        service.delete(id);
        audit.log(user(), null, "Accidents", "Delete Incident",
                "Deleted " + a.getCaseNo(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Record deleted", null));
    }

    private String user() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}
