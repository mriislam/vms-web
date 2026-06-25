package com.nexdecade.vms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity @Table(name = "requisitions")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Requisition {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String reqNo;

    @Column(nullable = false, length = 100)
    private String requestedBy;

    @Column(length = 50)
    private String department;

    @Column(nullable = false, length = 200)
    private String purpose;

    @Column(length = 20)
    private String vehicleReg;

    private LocalDate fromDate;
    private LocalDate toDate;

    @Column(length = 255)
    private String fromLocation;

    @Column(length = 255)
    private String toLocation;

    @Builder.Default private Integer passengers = 1;

    @Column(nullable = false, length = 10, columnDefinition = "VARCHAR(10) DEFAULT 'normal'")
    private String priority;

    private LocalDate date;

    @Column(length = 80)
    private String approvedBy;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @Column(nullable = false, length = 10, columnDefinition = "VARCHAR(10) DEFAULT 'pending'")
    private String status;

    // Geo-coordinates populated by Google Maps Places picker
    private Double fromLat;
    private Double fromLng;
    private Double toLat;
    private Double toLng;

    private Integer distanceKm;

    // Full datetime for trip scheduling (replaces date-only fromDate/toDate)
    private LocalDateTime fromDatetime;
    private LocalDateTime toDatetime;

    @Builder.Default
    @Column(name = "geofence_radius_m", nullable = false, columnDefinition = "INT DEFAULT 500")
    private Integer geofenceRadiusM = 500;

    // Assigned driver (FK to drivers.id)
    private Integer driverId;

    @CreationTimestamp @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
