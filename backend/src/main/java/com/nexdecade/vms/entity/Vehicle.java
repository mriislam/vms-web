package com.nexdecade.vms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity @Table(name = "vehicles")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Vehicle {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

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

    @CreationTimestamp @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
