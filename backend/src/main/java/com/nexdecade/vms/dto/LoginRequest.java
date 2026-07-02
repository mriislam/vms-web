package com.nexdecade.vms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank private String username;
    @NotBlank private String password;
    /** Tenant slug from the URL path, e.g. "acme". Null/blank = super-admin login. */
    private String tenantSlug;
}
