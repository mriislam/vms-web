package com.nexdecade.vms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity @Table(name = "notices")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Notice {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(nullable = false, length = 10, columnDefinition = "VARCHAR(10) DEFAULT 'medium'")
    private String priority;

    @Column(nullable = false, length = 40)
    private String category;

    @Column(nullable = false, length = 80)
    private String postedBy;

    private LocalDate date;

    @Column(length = 255)
    private String attachmentName;

    @Column(length = 500)
    private String attachmentPath;

    @CreationTimestamp @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
