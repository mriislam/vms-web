package com.nexdecade.vms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity @Table(name = "driver_leave")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class DriverLeave {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String driverName;

    @Column(nullable = false, length = 10)
    private String leaveType;

    private LocalDate fromDate;
    private LocalDate toDate;
    private Integer days;

    @Column(columnDefinition = "TEXT")
    private String reason;

    private LocalDate appliedOn;

    @Column(length = 80)
    private String approvedBy;

    @Column(length = 100)
    private String replacedBy;

    @Column(nullable = false, length = 10, columnDefinition = "VARCHAR(10) DEFAULT 'pending'")
    private String status;

    @CreationTimestamp @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
