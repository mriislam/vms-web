package com.nexdecade.vms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity @Table(name = "accidents")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Accident {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String caseNo;

    @Column(nullable = false, length = 20)
    private String vehicleReg;

    @Column(nullable = false, length = 100)
    private String driverName;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(nullable = false, length = 10)
    private String severity;

    @Column(nullable = false, length = 200)
    private String location;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Integer casualties;

    @Column(precision = 14, scale = 2)
    private BigDecimal damage;

    @Column(nullable = false, length = 20, columnDefinition = "VARCHAR(20) DEFAULT 'open'")
    private String status;

    @Column(length = 50)
    private String policeCase;

    @Column(length = 100)
    private String reportedBy;

    @Column(columnDefinition = "TEXT")
    private String action;

    @CreationTimestamp @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
