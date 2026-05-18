package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.dto.LoginRequest;
import com.nexdecade.vms.dto.LoginResponse;
import com.nexdecade.vms.entity.User;
import com.nexdecade.vms.repository.UserRepository;
import com.nexdecade.vms.security.JwtUtil;
import com.nexdecade.vms.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authManager;
    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest req,
            HttpServletRequest httpReq) {

        String ip = httpReq.getRemoteAddr();
        try {
            authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword())
            );
        } catch (BadCredentialsException e) {
            auditLogService.log(req.getUsername(), null, "Auth", "Login", "Failed login — invalid password", ip, "failed");
            return ResponseEntity.status(401).body(ApiResponse.error("Invalid username or password"));
        }

        UserDetails userDetails = userDetailsService.loadUserByUsername(req.getUsername());
        String token = jwtUtil.generate(userDetails);

        User user = userRepository.findByUsername(req.getUsername()).orElseThrow();
        user.setLastLogin(LocalDateTime.now());
        user.setLoginCount(user.getLoginCount() + 1);
        userRepository.save(user);

        auditLogService.log(user.getUsername(), user.getRole(), "Auth", "Login", "Successful login", ip, "success");

        return ResponseEntity.ok(ApiResponse.ok(
            new LoginResponse(token, user.getUsername(), user.getFullName(), user.getRole())
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout() {
        return ResponseEntity.ok(ApiResponse.ok("Logged out", null));
    }
}
