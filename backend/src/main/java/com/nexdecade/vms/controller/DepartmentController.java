package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.entity.Department;
import com.nexdecade.vms.exception.ResourceNotFoundException;
import com.nexdecade.vms.repository.DepartmentRepository;
import com.nexdecade.vms.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentRepository repo;
    private final AuditLogService      audit;

    private String user() {
        try { return SecurityContextHolder.getContext().getAuthentication().getName(); }
        catch (Exception e) { return "system"; }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Department>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(repo.findAllByOrderByNameAsc()));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<Department>>> getActive() {
        return ResponseEntity.ok(ApiResponse.ok(repo.findByStatusOrderByNameAsc("active")));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Department>> getById(@PathVariable Long id) {
        Department d = repo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + id));
        return ResponseEntity.ok(ApiResponse.ok(d));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Department>> create(
            @RequestBody Department dept, HttpServletRequest req) {
        dept.setId(null);
        if (dept.getStatus() == null) dept.setStatus("active");
        Department saved = repo.save(dept);
        audit.log(user(), null, "Department", "Create", saved.getName(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Department created", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Department>> update(
            @PathVariable Long id, @RequestBody Department dept, HttpServletRequest req) {
        Department existing = repo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + id));
        existing.setName(dept.getName());
        existing.setCode(dept.getCode());
        existing.setDescription(dept.getDescription());
        existing.setHeadOfDept(dept.getHeadOfDept());
        existing.setLocation(dept.getLocation());
        if (dept.getStatus() != null) existing.setStatus(dept.getStatus());
        Department saved = repo.save(existing);
        audit.log(user(), null, "Department", "Update", saved.getName(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Department updated", saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id, HttpServletRequest req) {
        Department dept = repo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + id));
        repo.delete(dept);
        audit.log(user(), null, "Department", "Delete", dept.getName(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Department deleted", null));
    }

    /** Seed default departments — safe to call multiple times (skips existing names) */
    @PostMapping("/seed")
    public ResponseEntity<ApiResponse<List<Department>>> seed(HttpServletRequest req) {
        record DeptSeed(String name, String code, String description, String location) {}

        List<DeptSeed> seeds = List.of(
            new DeptSeed("Headquarters",          "HQ",      "Executive and corporate governance",           "Head Office"),
            new DeptSeed("Human Resources",        "HR",      "Recruitment, payroll, and employee welfare",   "Head Office"),
            new DeptSeed("Finance & Accounts",     "FIN",     "Budgeting, accounting, and financial control", "Head Office"),
            new DeptSeed("Operations",             "OPS",     "Day-to-day fleet and logistics operations",    "Field Office"),
            new DeptSeed("Information Technology", "IT",      "Systems, software, and infrastructure",        "Head Office"),
            new DeptSeed("Administration",         "ADMIN",   "Office administration and support services",   "Head Office"),
            new DeptSeed("Logistics",              "LOG",     "Supply chain, warehousing, and distribution",  "Warehouse"),
            new DeptSeed("Maintenance",            "MAINT",   "Vehicle and equipment maintenance",            "Workshop"),
            new DeptSeed("Procurement",            "PROC",    "Vendor management and purchasing",             "Head Office"),
            new DeptSeed("Security",               "SEC",     "Physical and asset security",                  "All Sites")
        );

        List<Department> created = seeds.stream()
            .filter(s -> !repo.existsByName(s.name()))
            .map(s -> repo.save(Department.builder()
                .name(s.name()).code(s.code())
                .description(s.description()).location(s.location())
                .status("active").build()))
            .toList();

        audit.log(user(), null, "Department", "Seed", created.size() + " departments seeded", req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Seeded " + created.size() + " departments", repo.findAllByOrderByNameAsc()));
    }
}
