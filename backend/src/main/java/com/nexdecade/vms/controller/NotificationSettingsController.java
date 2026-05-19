package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.entity.NotificationSettings;
import com.nexdecade.vms.service.NotificationSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notification-settings")
@RequiredArgsConstructor
public class NotificationSettingsController {

    private final NotificationSettingsService svc;

    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationSettings>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(svc.getAll()));
    }

    @PutMapping("/{channel}")
    public ResponseEntity<ApiResponse<NotificationSettings>> save(
            @PathVariable String channel,
            @RequestBody Map<String, Object> body) {
        boolean enabled    = Boolean.TRUE.equals(body.get("enabled"));
        String  configJson = body.getOrDefault("configJson", "{}").toString();
        return ResponseEntity.ok(ApiResponse.ok(svc.save(channel, enabled, configJson)));
    }

    @PostMapping("/{channel}/test")
    public ResponseEntity<ApiResponse<String>> test(
            @PathVariable String channel,
            @RequestBody(required = false) Map<String, String> body) {
        String target = body != null ? body.getOrDefault("target", "") : "";
        String result = svc.test(channel, target);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
