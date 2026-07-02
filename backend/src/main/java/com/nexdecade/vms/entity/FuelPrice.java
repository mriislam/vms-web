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
@Entity @Table(name = "fuel_prices")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class FuelPrice implements TenantAware {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id")
    private Long tenantId;

    /** Diesel | Petrol | CNG | Octane | Electric */
    @Column(nullable = false, unique = true, length = 20)
    private String fuelType;

    /** Price per unit (liters, kWh, or kg) */
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal pricePerUnit;

    /** Liter | kWh | kg */
    @Column(nullable = false, length = 10, columnDefinition = "VARCHAR(10) DEFAULT 'Liter'")
    @Builder.Default
    private String unit = "Liter";

    private LocalDate effectiveDate;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(length = 80)
    private String updatedBy;

    @CreationTimestamp @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
