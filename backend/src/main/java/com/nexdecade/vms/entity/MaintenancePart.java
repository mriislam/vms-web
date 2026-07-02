package com.nexdecade.vms.entity;

import com.nexdecade.vms.listener.TenantEntityListener;
import jakarta.persistence.*;
import jakarta.persistence.EntityListeners;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@EntityListeners(TenantEntityListener.class)
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
@Entity @Table(name = "maintenance_parts")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class MaintenancePart implements TenantAware {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id")
    private Long tenantId;

    @Column(nullable = false)
    private Long maintenanceId;

    @Column(nullable = false, length = 200)
    private String partName;

    @Column(nullable = false, precision = 8, scale = 2)
    @Builder.Default
    private BigDecimal quantity = BigDecimal.ONE;

    @Column(nullable = false, length = 20, columnDefinition = "VARCHAR(20) DEFAULT 'Pcs'")
    @Builder.Default
    private String unit = "Pcs";

    /** Filled by service center */
    @Column(precision = 10, scale = 2)
    private BigDecimal unitCost;

    @Column(precision = 12, scale = 2)
    private BigDecimal totalCost;

    /** True = pulled from inventory stock */
    @Column(nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    @Builder.Default
    private Boolean fromInventory = false;

    /** FK to inventory table when fromInventory=true */
    private Long inventoryId;

    @Column(length = 20)
    private String itemCode;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp @Column(updatable = false)
    private LocalDateTime createdAt;
}
