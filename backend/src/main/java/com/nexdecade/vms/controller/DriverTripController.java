package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.entity.Driver;
import com.nexdecade.vms.entity.Requisition;
import com.nexdecade.vms.entity.User;
import com.nexdecade.vms.repository.DriverRepository;
import com.nexdecade.vms.repository.RequisitionRepository;
import com.nexdecade.vms.repository.UserRepository;
import com.nexdecade.vms.service.RequisitionService;
import com.nexdecade.vms.service.TripNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/driver")
@RequiredArgsConstructor
public class DriverTripController {

    private final UserRepository userRepo;
    private final DriverRepository driverRepo;
    private final RequisitionRepository reqRepo;
    private final RequisitionService reqService;
    private final TripNotificationService notif;

    /** GET /api/driver/trips — trips assigned to the logged-in driver */
    @GetMapping("/trips")
    public ResponseEntity<ApiResponse<List<Requisition>>> myTrips() {
        Driver driver = resolveDriver();
        if (driver == null) return ResponseEntity.ok(ApiResponse.ok(List.of()));
        List<Requisition> trips = reqRepo.findByDriverId(driver.getId().intValue());
        return ResponseEntity.ok(ApiResponse.ok(trips));
    }

    /** POST /api/driver/trips/{id}/start */
    @PostMapping("/trips/{id}/start")
    public ResponseEntity<ApiResponse<Requisition>> startTrip(@PathVariable Long id) {
        Requisition r = reqService.findById(id);
        ensureDriverOwns(r);
        Requisition updated = reqService.setStatus(id, "in_progress", currentUsername());
        notif.notifyTripStarted(updated, "driver");
        return ResponseEntity.ok(ApiResponse.ok("Trip started", updated));
    }

    /** POST /api/driver/trips/{id}/end */
    @PostMapping("/trips/{id}/end")
    public ResponseEntity<ApiResponse<Requisition>> endTrip(@PathVariable Long id) {
        Requisition r = reqService.findById(id);
        ensureDriverOwns(r);
        Requisition updated = reqService.setStatus(id, "completed", currentUsername());
        notif.notifyTripEnded(updated, "driver");
        return ResponseEntity.ok(ApiResponse.ok("Trip completed", updated));
    }

    /** POST /api/driver/fcm-token — register FCM device token for the logged-in user */
    @PostMapping("/fcm-token")
    public ResponseEntity<ApiResponse<Void>> registerFcmToken(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        if (token == null || token.isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("Token required"));
        userRepo.findByUsername(currentUsername()).ifPresent(u -> {
            u.setFcmToken(token);
            userRepo.save(u);
        });
        return ResponseEntity.ok(ApiResponse.ok("FCM token registered", null));
    }

    /** POST /api/users/me/fcm-token — alias usable by any logged-in user */
    @PostMapping("/users/me/fcm-token")
    public ResponseEntity<ApiResponse<Void>> registerFcmTokenAlias(@RequestBody Map<String, String> body) {
        return registerFcmToken(body);
    }

    // ── helpers ───────────────────────────────────────────────────────

    private Driver resolveDriver() {
        String username = currentUsername();
        Optional<User> userOpt = userRepo.findByUsername(username);
        if (userOpt.isEmpty()) return null;
        Long userId = userOpt.get().getId();
        return driverRepo.findAll().stream()
            .filter(d -> userId.equals(d.getUserId()))
            .findFirst().orElse(null);
    }

    private void ensureDriverOwns(Requisition r) {
        Driver driver = resolveDriver();
        if (driver == null || !(driver.getId().intValue() == (r.getDriverId() != null ? r.getDriverId() : -1))) {
            throw new IllegalStateException("Not authorized to update this trip");
        }
    }

    private String currentUsername() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}
