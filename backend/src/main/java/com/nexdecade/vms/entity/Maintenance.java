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

    @Column(precision = 10, scale = 2)
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
    @Builder.Default
    private String status = "pending";

    // ── Service Center workflow fields ────────────────────────────────────
    private Long serviceCenterId;

    /**
     * Workflow: draft → pending_estimate → estimated → pending_approval
     *           → approved | rejected → in_progress → completed
     */
    @Column(nullable = false, length = 30, columnDefinition = "VARCHAR(30) DEFAULT 'draft'")
    @Builder.Default
    private String workflowStatus = "draft";

    @Column(columnDefinition = "TEXT")
    private String requesterNotes;

    /** Approximate cost submitted by service center */
    @Column(precision = 12, scale = 2)
    private BigDecimal estimatedCost;

    /** Final cost after approver adjustments */
    @Column(precision = 12, scale = 2)
    private BigDecimal approvedCost;

    /** Invoice number from service center */
    @Column(length = 50)
    private String invoiceNo;

    private LocalDate invoiceDate;

    @Column(columnDefinition = "TEXT")
    private String approverNotes;

    @Column(length = 80)
    private String submittedBy;

    private LocalDateTime submittedAt;

    /** True = PM maintenance (uses inventory parts) */
    @Column(nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    @Builder.Default
    private Boolean isPmMaintenance = false;

    @CreationTimestamp @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
