package com.nexdecade.vms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Table(name = "vendors")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Vendor {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 100)
    private String contact;

    @Column(length = 20)
    private String phone;

    @Column(length = 120)
    private String email;

    @Column(length = 40)
    private String category;

    @Column(length = 60)
    private String city;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(length = 40)
    private String taxId;

    @Column(length = 60)
    private String bankAccount;

    @Column(precision = 12, scale = 2)
    @Builder.Default private BigDecimal creditLimit = BigDecimal.ZERO;

    @Column(nullable = false, length = 10, columnDefinition = "VARCHAR(10) DEFAULT 'active'")
    private String status;

    @CreationTimestamp @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
