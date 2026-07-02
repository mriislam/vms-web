package com.nexdecade.vms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity @Table(name = "departments")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Department {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(unique = true, length = 20)
    private String code;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 100)
    private String headOfDept;

    @Column(length = 100)
    private String location;

    @Column(nullable = false, length = 20, columnDefinition = "VARCHAR(20) DEFAULT 'active'")
    private String status;

    @CreationTimestamp @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
