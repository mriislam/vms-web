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
@Entity @Table(name = "expenses")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Expense implements TenantAware {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id")
    private Long tenantId;

    @Column(nullable = false, unique = true, length = 20)
    private String expenseNo;

    @Column(nullable = false, length = 40)
    private String category;

    @Column(nullable = false, length = 255)
    private String description;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(precision = 10, scale = 2)
    @Builder.Default private BigDecimal tax = BigDecimal.ZERO;

    private LocalDate date;

    @Column(length = 20)
    private String vehicleReg;

    @Column(length = 100)
    private String vendor;

    @Column(length = 30)
    private String paymentMode;

    @Column(length = 50)
    private String billNo;

    @Column(length = 80)
    private String approvedBy;

    @CreationTimestamp @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
