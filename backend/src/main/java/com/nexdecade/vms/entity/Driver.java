package com.nexdecade.vms.entity;

import com.nexdecade.vms.listener.TenantEntityListener;
import jakarta.persistence.*;
import jakarta.persistence.EntityListeners;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@EntityListeners(TenantEntityListener.class)
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
@Entity @Table(name = "drivers")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Driver implements TenantAware {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id")
    private Long tenantId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 40)
    private String licenseNo;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(length = 20)
    private String nid;

    private LocalDate dob;

    @Column(length = 5)
    private String bloodGroup;

    @Builder.Default private Integer experience = 0;
    private LocalDate joinDate;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(length = 15, columnDefinition = "VARCHAR(15) DEFAULT 'Private'")
    private String ownership;

    @Column(nullable = false, length = 10, columnDefinition = "VARCHAR(10) DEFAULT 'active'")
    private String status;

    private LocalDate lastTrip;
    @Builder.Default private Integer totalTrips = 0;

    // Linked user account for driver portal login
    private Long userId;

    @CreationTimestamp @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
