package com.nexdecade.vms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity @Table(name = "fuel_records")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class FuelRecord {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String slipNo;

    @Column(nullable = false, length = 20)
    private String vehicleReg;

    @Column(nullable = false, length = 100)
    private String driverName;

    @Column(length = 10, columnDefinition = "VARCHAR(10) DEFAULT 'Diesel'")
    private String fuelType;

    @Column(nullable = false, precision = 7, scale = 2)
    private BigDecimal liters;

    @Column(nullable = false, precision = 7, scale = 2)
    private BigDecimal pricePerLiter;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal total;

    private LocalDate date;

    @Column(length = 100)
    private String station;

    private Integer odoBefore;
    private Integer odoAfter;

    @Column(length = 80)
    private String approvedBy;

    @CreationTimestamp @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
