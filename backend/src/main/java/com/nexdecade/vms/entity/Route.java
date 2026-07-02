package com.nexdecade.vms.entity;

import com.nexdecade.vms.listener.TenantEntityListener;
import jakarta.persistence.*;
import jakarta.persistence.EntityListeners;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@EntityListeners(TenantEntityListener.class)
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
@Entity @Table(name = "routes")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Route implements TenantAware {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id")
    private Long tenantId;

    @Column(nullable = false, unique = true, length = 20)
    private String routeCode;

    @Column(nullable = false, length = 120)
    private String name;

    private Integer distance;

    @Column(length = 20)
    private String estimatedTime;

    @Builder.Default private Integer stops = 0;

    @Column(length = 100)
    private String highway;

    @Column(precision = 8, scale = 2)
    @Builder.Default private BigDecimal tollCost = BigDecimal.ZERO;

    @Builder.Default private Integer assignedVehicles = 0;
    private LocalDate lastUsed;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false, length = 10, columnDefinition = "VARCHAR(10) DEFAULT 'active'")
    private String status;

    @CreationTimestamp @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
