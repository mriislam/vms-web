package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.entity.AuditLog;
import com.nexdecade.vms.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit-log")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AuditLog>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll()));
    }

    @GetMapping("/recent")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getRecent(@RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(ApiResponse.ok(service.findRecent(limit)));
    }
}
