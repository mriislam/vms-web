package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.dto.LoginRequest;
import com.nexdecade.vms.dto.LoginResponse;
import com.nexdecade.vms.entity.User;
import com.nexdecade.vms.repository.UserRepository;
import com.nexdecade.vms.security.JwtUtil;
import com.nexdecade.vms.service.AuditLogService;
import com.nexdecade.vms.service.TotpService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authManager;
    private final JwtUtil               jwtUtil;
    private final UserDetailsService    userDetailsService;
    private final UserRepository        userRepository;
    private final AuditLogService       auditLogService;
    private final TotpService           totpService;

    // Temp store: mfaToken → username (valid 5 min; in production use Redis)
    private final Map<String, String> mfaPending = new ConcurrentHashMap<>();

    // ── Step 1: Credentials ───────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<?>> login(
            @Valid @RequestBody LoginRequest req,
            HttpServletRequest httpReq) {

        String ip = httpReq.getRemoteAddr();
        try {
            authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword()));
        } catch (BadCredentialsException e) {
            auditLogService.log(req.getUsername(), null, "Auth", "Login",
                "Failed login — invalid credentials", ip, "failed");
            return ResponseEntity.status(401).body(ApiResponse.error("Invalid username or password"));
        }

        User user = userRepository.findByUsername(req.getUsername()).orElseThrow();

        // ── If 2FA is enabled → return mfaRequired flag ──────────────────────
        if (Boolean.TRUE.equals(user.getMfaEnabled()) && user.getMfaSecret() != null) {
            // Generate a short-lived MFA token (use username as key)
            String mfaToken = java.util.UUID.randomUUID().toString();
            mfaPending.put(mfaToken, user.getUsername());

            auditLogService.log(user.getUsername(), user.getRole(), "Auth", "Login",
                "Credentials verified — MFA required", ip, "pending");

            return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "mfaRequired", true,
                "mfaToken",    mfaToken,
                "username",    user.getUsername()
            )));
        }

        // ── No 2FA → issue token immediately ─────────────────────────────────
        return issueToken(user, ip);
    }

    // ── Step 2: Verify TOTP code ──────────────────────────────────────────────
    @PostMapping("/verify-mfa")
    public ResponseEntity<ApiResponse<?>> verifyMfa(
            @RequestBody Map<String, String> body,
            HttpServletRequest httpReq) {

        String mfaToken = body.get("mfaToken");
        String code     = body.get("code");
        String ip       = httpReq.getRemoteAddr();

        if (mfaToken == null || code == null)
            return ResponseEntity.badRequest().body(ApiResponse.error("mfaToken and code are required"));

        String username = mfaPending.remove(mfaToken);
        if (username == null)
            return ResponseEntity.status(401).body(ApiResponse.error("Invalid or expired MFA session"));

        User user = userRepository.findByUsername(username).orElseThrow();
        if (!totpService.verify(user.getMfaSecret(), code)) {
            auditLogService.log(username, user.getRole(), "Auth", "MFA",
                "Invalid TOTP code", ip, "failed");
            return ResponseEntity.status(401).body(ApiResponse.error("Invalid authenticator code. Please try again."));
        }

        return issueToken(user, ip);
    }

    // ── Setup 2FA: generate secret + QR URI (authenticated) ──────────────────
    @GetMapping("/setup-mfa")
    public ResponseEntity<ApiResponse<Map<String, String>>> setupMfa() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User   user     = userRepository.findByUsername(username).orElseThrow();

        String secret   = totpService.generateSecret();
        String otpUri   = totpService.buildOtpAuthUri(
            user.getEmail() != null ? user.getEmail() : username, secret);

        // Store secret temporarily (not yet confirmed)
        user.setMfaSecret(secret);
        userRepository.save(user);

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "secret",  secret,
            "otpUri",  otpUri,
            "account", username
        )));
    }

    // ── Enable 2FA: verify the first code from authenticator ─────────────────
    @PostMapping("/enable-mfa")
    public ResponseEntity<ApiResponse<String>> enableMfa(@RequestBody Map<String, String> body) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        String code     = body.get("code");
        User   user     = userRepository.findByUsername(username).orElseThrow();

        if (user.getMfaSecret() == null)
            return ResponseEntity.badRequest().body(ApiResponse.error("Run /setup-mfa first"));

        if (!totpService.verify(user.getMfaSecret(), code))
            return ResponseEntity.status(400).body(ApiResponse.error("Code incorrect — scan the QR code again"));

        user.setMfaEnabled(true);
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.ok("2FA enabled successfully"));
    }

    // ── Disable 2FA ───────────────────────────────────────────────────────────
    @PostMapping("/disable-mfa")
    public ResponseEntity<ApiResponse<String>> disableMfa(@RequestBody Map<String, String> body) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        String code     = body.get("code");
        User   user     = userRepository.findByUsername(username).orElseThrow();

        if (!Boolean.TRUE.equals(user.getMfaEnabled()))
            return ResponseEntity.ok(ApiResponse.ok("2FA was not enabled"));

        if (!totpService.verify(user.getMfaSecret(), code))
            return ResponseEntity.status(400).body(ApiResponse.error("Invalid code"));

        user.setMfaEnabled(false);
        user.setMfaSecret(null);
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.ok("2FA disabled"));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout() {
        return ResponseEntity.ok(ApiResponse.ok("Logged out", null));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private ResponseEntity<ApiResponse<?>> issueToken(User user, String ip) {
        UserDetails ud    = userDetailsService.loadUserByUsername(user.getUsername());
        String      token = jwtUtil.generate(ud);

        user.setLastLogin(LocalDateTime.now());
        user.setLoginCount(user.getLoginCount() + 1);
        userRepository.save(user);

        auditLogService.log(user.getUsername(), user.getRole(), "Auth", "Login",
            "Successful login", ip, "success");

        return ResponseEntity.ok(ApiResponse.ok(
            new LoginResponse(token, user.getUsername(), user.getFullName(), user.getRole())));
    }
}
