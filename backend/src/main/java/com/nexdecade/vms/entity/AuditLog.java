package com.nexdecade.vms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity @Table(name = "audit_log")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

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
