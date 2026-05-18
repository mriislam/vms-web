package com.nexdecade.vms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity @Table(name = "maintenance")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Maintenance {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String vehicleReg;

    @Column(nullable = false, length = 60)
    private String type;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal cost;

    private LocalDate date;
    private Integer odometer;

    @Column(length = 100)
    private String vendor;

    @Column(columnDefinition = "TEXT")
    private String partsUsed;

    @Column(length = 80)
    private String completedBy;

    private LocalDate nextDue;

    @Column(nullable = false, length = 15, columnDefinition = "VARCHAR(15) DEFAULT 'pending'")
    private String status;

    @CreationTimestamp @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
