package com.nexdecade.vms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity @Table(name = "service_centers")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ServiceCenter {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 80)
    private String contactPerson;

    @Column(length = 20)
    private String phone;

    @Column(length = 100)
    private String email;

    @Column(columnDefinition = "TEXT")
    private String address;

    /** Comma-separated specializations: Engine,Brakes,Electrical */
    @Column(length = 200)
    private String specialization;

    @Column(length = 30)
    private String taxId;

    @Column(nullable = false, length = 10, columnDefinition = "VARCHAR(10) DEFAULT 'active'")
    @Builder.Default
    private String status = "active";

    @CreationTimestamp @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
