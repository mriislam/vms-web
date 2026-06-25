package com.nexdecade.vms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexdecade.vms.entity.Driver;
import com.nexdecade.vms.entity.NotificationSettings;
import com.nexdecade.vms.entity.Requisition;
import com.nexdecade.vms.entity.User;
import com.nexdecade.vms.repository.DriverRepository;
import com.nexdecade.vms.repository.NotificationSettingsRepository;
import com.nexdecade.vms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class TripNotificationService {

    private final NotificationSettingsRepository notifRepo;
    private final UserRepository userRepo;
    private final DriverRepository driverRepo;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm");

    // ── Called on approval ────────────────────────────────────────

    @Async
    public void notifyApproved(Requisition req) {
        String route  = req.getFromLocation() + " → " + req.getToLocation();
        String timeInfo = req.getFromDatetime() != null
            ? " at " + req.getFromDatetime().format(DT_FMT) : "";

        // Notify requester (find user by name match or all admins)
        String requesterMsg = "✅ Booking " + req.getReqNo() + " approved.\n" + route + timeInfo;
        notifyUsersByRole(List.of("admin", "manager"), "Trip Approved — " + req.getReqNo(), requesterMsg);

        // Notify assigned driver
        if (req.getDriverId() != null) {
            driverRepo.findById(req.getDriverId().longValue()).ifPresent(driver -> {
                String driverMsg = "🚗 New trip assigned: " + route + timeInfo
                    + "\nPassengers: " + req.getPassengers()
                    + "\nBooking: " + req.getReqNo();
                sendToDriver(driver, "New Trip Assigned", driverMsg);
                sendSmsToDriver(driver, "VMS: New trip " + req.getReqNo() + ". Route: " + route
                    + (req.getFromDatetime() != null ? ". Depart: " + req.getFromDatetime().format(DT_FMT) : "")
                    + ". Passengers: " + req.getPassengers() + ". Contact ops for details.");
            });
        }
    }

    @Async
    public void notifyStartReminder(Requisition req) {
        String route = req.getFromLocation() + " → " + req.getToLocation();
        notifyUsersByRole(List.of("admin", "manager", "operator"),
            "Trip Starting Soon — " + req.getReqNo(),
            "⏰ Trip " + req.getReqNo() + " starts in 30 minutes.\n" + route);

        if (req.getDriverId() != null) {
            driverRepo.findById(req.getDriverId().longValue()).ifPresent(driver -> {
                sendToDriver(driver, "Trip Starting in 30 Minutes",
                    "⏰ Your trip starts soon.\n" + route + "\nPlease proceed to: " + req.getFromLocation());
                sendSmsToDriver(driver, "VMS: Your trip " + req.getReqNo() + " starts in 30 mins. Route: " + route);
            });
        }
    }

    @Async
    public void notifyTripStarted(Requisition req, String triggeredBy) {
        String route = req.getFromLocation() + " → " + req.getToLocation();
        notifyUsersByRole(List.of("admin", "manager", "operator"),
            "Trip Started — " + req.getReqNo(),
            "🚦 Trip " + req.getReqNo() + " has started (" + triggeredBy + ").\n" + route);
    }

    @Async
    public void notifyTripEnded(Requisition req, String triggeredBy) {
        String route = req.getFromLocation() + " → " + req.getToLocation();
        notifyUsersByRole(List.of("admin", "manager", "operator"),
            "Trip Completed — " + req.getReqNo(),
            "🏁 Trip " + req.getReqNo() + " completed (" + triggeredBy + ").\n" + route);

        if (req.getDriverId() != null) {
            driverRepo.findById(req.getDriverId().longValue()).ifPresent(driver ->
                sendSmsToDriver(driver, "VMS: Trip " + req.getReqNo() + " marked complete. Thank you."));
        }
    }

    @Async
    public void notifyAutoStarted(Requisition req) {
        if (req.getDriverId() != null) {
            driverRepo.findById(req.getDriverId().longValue()).ifPresent(driver -> {
                String msg = "VMS: Trip " + req.getReqNo() + " auto-started (departure time reached). "
                    + "Route: " + req.getFromLocation() + " → " + req.getToLocation()
                    + ". Please update status in the VMS app.";
                sendSmsToDriver(driver, msg);
            });
        }
        notifyTripStarted(req, "auto-scheduled");
    }

    @Async
    public void notifyApproachingDestination(Requisition req) {
        if (req.getDriverId() != null) {
            driverRepo.findById(req.getDriverId().longValue()).ifPresent(driver ->
                sendToDriver(driver, "Approaching Destination",
                    "📍 You are near your destination: " + req.getToLocation()
                    + "\nTrip: " + req.getReqNo() + " — please confirm arrival."));
        }
    }

    // ── FCM helpers ───────────────────────────────────────────────

    private void notifyUsersByRole(List<String> roles, String title, String body) {
        for (String role : roles) {
            userRepo.findByRole(role).forEach(user -> {
                if (user.getFcmToken() != null && !user.getFcmToken().isBlank()) {
                    sendFcm(user.getFcmToken(), title, body);
                }
            });
        }
    }

    private void sendToDriver(Driver driver, String title, String body) {
        if (driver.getUserId() == null) return;
        userRepo.findById(driver.getUserId()).ifPresent(user -> {
            if (user.getFcmToken() != null && !user.getFcmToken().isBlank()) {
                sendFcm(user.getFcmToken(), title, body);
            }
        });
    }

    private void sendFcm(String deviceToken, String title, String body) {
        Optional<NotificationSettings> settingsOpt = notifRepo.findByChannel("fcm");
        if (settingsOpt.isEmpty() || !settingsOpt.get().getEnabled()) return;
        try {
            Map<?, ?> cfg = objectMapper.readValue(settingsOpt.get().getConfigJson(), Map.class);
            String serverKey = (String) cfg.get("serverKey");
            if (serverKey == null || serverKey.isBlank()) return;

            Map<String, Object> payload = Map.of(
                "to", deviceToken,
                "notification", Map.of("title", title, "body", body),
                "data", Map.of("reqNo", body.contains("REQ-") ? body.split("REQ-")[1].split("[^\\w-]")[0] : "")
            );
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "key=" + serverKey);
            headers.set("Content-Type", "application/json");
            restTemplate.postForEntity("https://fcm.googleapis.com/fcm/send",
                new HttpEntity<>(payload, headers), Map.class);
        } catch (Exception e) {
            log.warn("FCM send failed: {}", e.getMessage());
        }
    }

    // ── SMS helper ────────────────────────────────────────────────

    private void sendSmsToDriver(Driver driver, String message) {
        if (driver.getPhone() == null || driver.getPhone().isBlank()) return;
        Optional<NotificationSettings> settingsOpt = notifRepo.findByChannel("sms");
        if (settingsOpt.isEmpty() || !settingsOpt.get().getEnabled()) return;
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> cfg = objectMapper.readValue(settingsOpt.get().getConfigJson(), Map.class);
            String provider  = (String) cfg.getOrDefault("provider", "twilio");
            String apiKey    = (String) cfg.getOrDefault("apiKey", "");
            String apiSecret = (String) cfg.getOrDefault("apiSecret", "");
            String from      = (String) cfg.getOrDefault("fromNumber", "");
            if (apiKey.isBlank()) return;

            if ("twilio".equalsIgnoreCase(provider)) {
                String url = "https://api.twilio.com/2010-04-01/Accounts/" + apiKey + "/Messages.json";
                HttpHeaders headers = new HttpHeaders();
                headers.setBasicAuth(apiKey, apiSecret);
                headers.setContentType(org.springframework.http.MediaType.APPLICATION_FORM_URLENCODED);
                String body = "From=" + from + "&To=" + driver.getPhone() + "&Body=" + message;
                restTemplate.postForEntity(url, new HttpEntity<>(body, headers), Map.class);
            } else {
                String url = (String) cfg.getOrDefault("apiUrl", "");
                if (!url.isBlank()) {
                    HttpHeaders headers = new HttpHeaders();
                    headers.set("Authorization", "Bearer " + apiKey);
                    headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
                    Map<String, Object> payload = Map.of("to", driver.getPhone(), "message", message);
                    restTemplate.postForEntity(url, new HttpEntity<>(payload, headers), Map.class);
                }
            }
            log.info("SMS sent to driver {} ({})", driver.getName(), driver.getPhone());
        } catch (Exception e) {
            log.warn("SMS send failed: {}", e.getMessage());
        }
    }
}
