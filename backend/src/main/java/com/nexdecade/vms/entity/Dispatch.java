package com.nexdecade.vms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity @Table(name = "vehicle_requisition")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Dispatch {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String dispatchNo;

    @Column(nullable = false, length = 20)
    private String vehicleReg;

    @Column(nullable = false, length = 100)
    private String driverName;

    @Column(nullable = false, length = 100)
    private String origin;

    @Column(nullable = false, length = 100)
    private String destination;

    private Integer distance;
    private LocalDate date;
    private LocalDateTime startTime;
    private LocalDateTime endTime;

    @Column(columnDefinition = "TEXT")
    private String purpose;

    @Column(length = 80)
    private String approvedBy;

    @Column(precision = 6, scale = 2)
    private BigDecimal fuelUsed;

    @Column(nullable = false, length = 20, columnDefinition = "VARCHAR(20) DEFAULT 'pending'")
    private String status;

    @CreationTimestamp @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
