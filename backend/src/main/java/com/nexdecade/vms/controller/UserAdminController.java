package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.entity.User;
import com.nexdecade.vms.service.AuditLogService;
import com.nexdecade.vms.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserAdminController {

    private final UserService service;
    private final AuditLogService audit;

    @GetMapping
    public ResponseEntity<ApiResponse<List<User>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<User>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<User>> create(@RequestBody Map<String, Object> body, HttpServletRequest req) {
        User u = new User();
        u.setUsername((String) body.get("username"));
        u.setFullName((String) body.get("fullName"));
        u.setEmail((String) body.get("email"));
        u.setRole((String) body.get("role"));
        u.setPhone((String) body.get("phone"));
        u.setDepartment((String) body.get("department"));
        u.setStatus("active");
        String password = (String) body.getOrDefault("password", "Welcome@123");
        User saved = service.create(u, password);
        audit.log(user(), null, "Users", "Create User", "Created user " + saved.getUsername(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("User created", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<User>> update(@PathVariable Long id, @RequestBody User u, HttpServletRequest req) {
        User updated = service.update(id, u);
        audit.log(user(), null, "Users", "Edit User", "Updated user " + updated.getUsername(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("User updated", updated));
    }

    @PatchMapping("/{id}/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@PathVariable Long id, @RequestBody Map<String, String> body, HttpServletRequest req) {
        service.resetPassword(id, body.get("password"));
        audit.log(user(), null, "Users", "Password Reset", "Reset password for user #" + id, req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Password reset", null));
    }

    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<ApiResponse<User>> toggleStatus(@PathVariable Long id, HttpServletRequest req) {
        User u = service.toggleStatus(id);
        audit.log(user(), null, "Users", u.getStatus().equals("active") ? "Enable User" : "Disable User",
                "Set user " + u.getUsername() + " → " + u.getStatus(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Status updated", u));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id, HttpServletRequest req) {
        User u = service.findById(id);
        service.delete(id);
        audit.log(user(), null, "Users", "Delete User", "Deleted user " + u.getUsername(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("User deleted", null));
    }

    private String user() { return SecurityContextHolder.getContext().getAuthentication().getName(); }
}
