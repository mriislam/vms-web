package com.nexdecade.vms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity @Table(name = "parking_slots")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ParkingSlot {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 10)
    private String slotNo;

    @Column(length = 20)
    private String vehicleReg;

    @Column(length = 10, columnDefinition = "VARCHAR(10) DEFAULT 'Open'")
    private String type;

    @Column(length = 20)
    private String zone;

    @Column(precision = 8, scale = 2)
    @Builder.Default private BigDecimal monthlyFee = BigDecimal.ZERO;

    private LocalDate parkedSince;

    @Column(nullable = false, length = 15, columnDefinition = "VARCHAR(15) DEFAULT 'available'")
    private String status;

    @CreationTimestamp @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
