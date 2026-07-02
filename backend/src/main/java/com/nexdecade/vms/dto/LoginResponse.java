package com.nexdecade.vms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @AllArgsConstructor @NoArgsConstructor
public class LoginResponse {
    private String token;
    private String username;
    private String fullName;
    private String role;
    private Long   tenantId;
    private String tenantSlug;
    private String tenantName;
}
