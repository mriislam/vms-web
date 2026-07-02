package com.nexdecade.vms.entity;

import com.nexdecade.vms.listener.TenantEntityListener;
import jakarta.persistence.*;
import jakarta.persistence.EntityListeners;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;

import java.time.LocalDateTime;

@EntityListeners(TenantEntityListener.class)
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
@Entity @Table(name = "audit_log")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditLog implements TenantAware {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id")
    private Long tenantId;

    @CreationTimestamp
    private LocalDateTime timestamp;

    @Column(nullable = false, length = 50)
    private String username;

    @Column(length = 10)
    private String role;

    @Column(nullable = false, length = 40)
    private String module;

    @Column(nullable = false, length = 100)
    private String action;

    @Column(columnDefinition = "TEXT")
    private String detail;

    @Column(length = 45)
    private String ipAddress;

    @Column(nullable = false, length = 10, columnDefinition = "VARCHAR(10) DEFAULT 'success'")
    private String status;
}
