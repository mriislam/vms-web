package com.nexdecade.vms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity @Table(name = "tenants")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Tenant {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    /** URL-safe identifier: lowercase letters, digits, hyphens. e.g. "acme-corp" */
    @Column(nullable = false, unique = true, length = 50)
    private String slug;

    @Column(length = 500)
    private String logoUrl;

    /** starter | professional | enterprise */
    @Column(length = 20, columnDefinition = "VARCHAR(20) DEFAULT 'starter'")
    @Builder.Default private String plan = "starter";

    /** active | suspended | trial | cancelled */
    @Column(length = 20, columnDefinition = "VARCHAR(20) DEFAULT 'active'")
    @Builder.Default private String status = "active";

    @Column(length = 120)
    private String contactEmail;

    @Column(length = 20)
    private String contactPhone;

    @Column(length = 255)
    private String address;

    @Column(columnDefinition = "INT DEFAULT 50")
    @Builder.Default private Integer maxUsers = 50;

    @Column(columnDefinition = "INT DEFAULT 100")
    @Builder.Default private Integer maxVehicles = 100;

    private LocalDate trialEndsAt;

    @CreationTimestamp @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
