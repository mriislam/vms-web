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
@Entity @Table(name = "vehicles")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Vehicle implements TenantAware {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id")
    private Long tenantId;

    @Column(nullable = false, unique = true, length = 20)
    private String regNo;

    @Column(nullable = false, length = 60)
    private String make;

    @Column(nullable = false, length = 80)
    private String model;

    @Column(nullable = false)
    private Integer year;

    @Column(nullable = false, length = 30)
    private String type;

    @Column(nullable = false, length = 15, columnDefinition = "VARCHAR(15) DEFAULT 'Private'")
    private String ownership;

    @Column(length = 30)
    private String color;

    @Column(length = 10, columnDefinition = "VARCHAR(10) DEFAULT 'Diesel'")
    private String fuelType;

    @Column(length = 50)
    private String chassisNo;

    @Column(length = 50)
    private String engineNo;

    @Column(nullable = false)
    @Builder.Default private Integer odometer = 0;

    private LocalDate insuranceExpiry;
    private LocalDate purchaseDate;

    @Column(precision = 12, scale = 2)
    private BigDecimal purchasePrice;

    private LocalDate lastService;

    @Column(length = 80)
    private String owner;

    @Column(nullable = false, length = 10, columnDefinition = "VARCHAR(10) DEFAULT 'active'")
    private String status;

    /** JSON array of fuel types e.g. [Diesel,Electric] — supports hybrid */
    @Column(length = 200)
    private String fuelTypes;

    /** Liters (or kWh/kg) consumed per 100 km */
    @Column(precision = 6, scale = 2)
    private BigDecimal consumptionRate;

    @Column(nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    @Builder.Default
    private Boolean isHybrid = false;

    @Column(length = 40, columnDefinition = "VARCHAR(40) DEFAULT 'car'")
    private String vehicleIcon;

    @CreationTimestamp @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
