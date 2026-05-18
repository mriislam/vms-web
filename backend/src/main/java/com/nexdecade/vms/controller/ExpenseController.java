package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.entity.Expense;
import com.nexdecade.vms.service.AuditLogService;
import com.nexdecade.vms.service.ExpenseService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService service;
    private final AuditLogService audit;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Expense>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Expense>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Expense>> create(@RequestBody Expense e, HttpServletRequest req) {
        Expense saved = service.save(e);
        audit.log(user(), null, "Expenses", "Add Expense", "Added " + saved.getExpenseNo() + " — " + saved.getCategory(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Expense added", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Expense>> update(@PathVariable Long id, @RequestBody Expense e, HttpServletRequest req) {
        Expense updated = service.update(id, e);
        audit.log(user(), null, "Expenses", "Edit Expense", "Updated " + updated.getExpenseNo(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Expense updated", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id, HttpServletRequest req) {
        service.delete(id);
        audit.log(user(), null, "Expenses", "Delete Expense", "Deleted expense #" + id, req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Expense deleted", null));
    }

    private String user() { return SecurityContextHolder.getContext().getAuthentication().getName(); }
}
