package com.nexdecade.vms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexdecade.vms.entity.NotificationSettings;
import com.nexdecade.vms.repository.NotificationSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
@RequiredArgsConstructor
public class NotificationSettingsService {

    private final NotificationSettingsRepository repo;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    private static final List<String> CHANNELS = List.of("fcm", "sms", "email", "whatsapp");

    public List<NotificationSettings> getAll() {
        List<NotificationSettings> all = new ArrayList<>();
        for (String ch : CHANNELS) {
            all.add(repo.findByChannel(ch).orElseGet(() -> {
                NotificationSettings s = NotificationSettings.builder()
                    .channel(ch).enabled(false).configJson("{}").build();
                return Objects.requireNonNull(repo.save(s));
            }));
        }
        return all;
    }

    public NotificationSettings save(String channel, boolean enabled, String configJson) {
        NotificationSettings s = repo.findByChannel(channel)
            .orElse(NotificationSettings.builder().channel(channel).build());
        s.setEnabled(enabled);
        s.setConfigJson(configJson);
        return repo.save(s);
    }

    /** Test the specified channel — returns result message */
    public String test(String channel, String testTarget) {
        NotificationSettings s = repo.findByChannel(channel)
            .orElseThrow(() -> new RuntimeException("Channel not configured: " + channel));
        if (!s.getEnabled()) return "Channel is disabled";

        try {
            Map<?, ?> cfg = objectMapper.readValue(s.getConfigJson(), Map.class);
            return switch (channel) {
                case "email"    -> testEmail(cfg, testTarget);
                case "fcm"      -> testFcm(cfg, testTarget);
                case "sms"      -> testSms(cfg, testTarget);
                case "whatsapp" -> testWhatsApp(cfg, testTarget);
                default         -> "Unknown channel";
            };
        } catch (Exception e) {
            return "Test failed: " + e.getMessage();
        }
    }

    /* ── Email (SMTP) ────────────────────────────────────────────── */
    private String testEmail(Map<?, ?> cfg, String to) throws Exception {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(str(cfg, "host", "smtp.gmail.com"));
        sender.setPort(intVal(cfg, "port", 587));
        sender.setUsername(str(cfg, "username", ""));
        sender.setPassword(str(cfg, "password", ""));

        Properties props = sender.getJavaMailProperties();
        boolean tls = boolVal(cfg, "useTls", true);
        props.put("mail.smtp.auth", "true");
        if (tls) {
            props.put("mail.smtp.starttls.enable", "true");
        } else {
            props.put("mail.smtp.ssl.enable", "true");
        }

        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(str(cfg, "fromEmail", sender.getUsername()) + " <" + str(cfg, "fromName", "VMS System") + ">");
        msg.setTo(to != null && !to.isBlank() ? to : str(cfg, "username", ""));
        msg.setSubject("VMS — Test Notification");
        msg.setText("This is a test notification from VMS. If you received this, email notifications are configured correctly.");
        sender.send(msg);
        return "Test email sent to " + msg.getTo()[0];
    }

    /* ── FCM (Legacy HTTP API) ───────────────────────────────────── */
    private String testFcm(Map<?, ?> cfg, String deviceToken) {
        String serverKey = str(cfg, "serverKey", "");
        if (serverKey.isBlank()) return "FCM Server Key not configured";
        String token = deviceToken != null && !deviceToken.isBlank() ? deviceToken : str(cfg, "testToken", "");
        if (token.isBlank()) return "No device token provided for test";

        Map<String, Object> payload = Map.of(
            "to", token,
            "notification", Map.of(
                "title", "VMS — Test Notification",
                "body", "Push notification from VMS is working correctly."
            )
        );
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.set("Authorization", "key=" + serverKey);
        headers.set("Content-Type", "application/json");

        var entity = new org.springframework.http.HttpEntity<>(payload, headers);
        var resp = restTemplate.postForEntity("https://fcm.googleapis.com/fcm/send", entity, Map.class);
        return "FCM response: " + resp.getStatusCode() + " — " + resp.getBody();
    }

    /* ── SMS ─────────────────────────────────────────────────────── */
    private String testSms(Map<?, ?> cfg, String toNumber) {
        String provider  = str(cfg, "provider", "twilio");
        String apiKey    = str(cfg, "apiKey", "");
        String apiSecret = str(cfg, "apiSecret", "");
        String from      = str(cfg, "fromNumber", "");
        String to        = toNumber != null && !toNumber.isBlank() ? toNumber : str(cfg, "testNumber", "");

        if (apiKey.isBlank()) return "SMS API Key not configured";
        if (to.isBlank())     return "No target phone number provided";

        if ("twilio".equalsIgnoreCase(provider)) {
            String url = "https://api.twilio.com/2010-04-01/Accounts/" + apiKey + "/Messages.json";
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setBasicAuth(Objects.requireNonNull(apiKey), Objects.requireNonNull(apiSecret));
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_FORM_URLENCODED);
            String body = "To=" + encode(to) + "&From=" + encode(from) + "&Body=" + encode("VMS test SMS notification");
            var entity = new org.springframework.http.HttpEntity<>(body, headers);
            var resp = restTemplate.postForEntity(url, entity, Map.class);
            return "Twilio response: " + resp.getStatusCode();
        }
        // Custom API provider
        String apiUrl = str(cfg, "apiUrl", "");
        if (apiUrl.isBlank()) return "Custom API URL not configured";
        Map<String, String> payload = Map.of("to", to, "from", from, "message", "VMS test SMS", "api_key", apiKey);
        var resp = restTemplate.postForEntity(apiUrl, payload, Map.class);
        return "SMS sent, response: " + resp.getStatusCode();
    }

    /* ── WhatsApp ────────────────────────────────────────────────── */
    private String testWhatsApp(Map<?, ?> cfg, String toNumber) {
        String provider  = str(cfg, "provider", "twilio");
        String apiKey    = str(cfg, "apiKey", "");
        String apiSecret = str(cfg, "apiSecret", "");
        String from      = str(cfg, "fromNumber", "");
        String to        = toNumber != null && !toNumber.isBlank() ? toNumber : str(cfg, "testNumber", "");

        if (apiKey.isBlank()) return "WhatsApp API Key not configured";
        if (to.isBlank())     return "No target number provided";

        if ("twilio".equalsIgnoreCase(provider)) {
            String url = "https://api.twilio.com/2010-04-01/Accounts/" + apiKey + "/Messages.json";
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setBasicAuth(Objects.requireNonNull(apiKey), Objects.requireNonNull(apiSecret));
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_FORM_URLENCODED);
            String body = "To=whatsapp:" + encode(to) + "&From=whatsapp:" + encode(from) + "&Body=" + encode("VMS test WhatsApp notification");
            var entity = new org.springframework.http.HttpEntity<>(body, headers);
            var resp = restTemplate.postForEntity(url, entity, Map.class);
            return "WhatsApp via Twilio: " + resp.getStatusCode();
        }
        // Meta WhatsApp Business API
        String phoneNumberId = str(cfg, "phoneNumberId", "");
        String accessToken   = str(cfg, "accessToken",   "");
        if (phoneNumberId.isBlank() || accessToken.isBlank()) return "Meta Phone Number ID or Access Token not configured";
        String url = "https://graph.facebook.com/v18.0/" + phoneNumberId + "/messages";
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        Map<String, Object> payload = Map.of(
            "messaging_product", "whatsapp",
            "to", to.replace("+", ""),
            "type", "text",
            "text", Map.of("body", "VMS test WhatsApp message from Meta Business API")
        );
        var resp = restTemplate.postForEntity(url, new org.springframework.http.HttpEntity<>(payload, headers), Map.class);
        return "WhatsApp via Meta: " + resp.getStatusCode();
    }

    /* ── Helpers ─────────────────────────────────────────────────── */
    private String str(Map<?, ?> m, String k, String def)  { Object v = m.get(k); return v != null ? v.toString() : def; }
    private int    intVal(Map<?, ?> m, String k, int def)  { Object v = m.get(k); return v instanceof Number n ? n.intValue() : def; }
    private boolean boolVal(Map<?,?> m, String k, boolean d){ Object v = m.get(k); return v instanceof Boolean b ? b : d; }
    private String encode(String s) { try { return java.net.URLEncoder.encode(s, "UTF-8"); } catch (Exception e) { return s; } }
}
