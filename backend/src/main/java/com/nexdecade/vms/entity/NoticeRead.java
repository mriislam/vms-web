package com.nexdecade.vms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "notice_reads", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"notice_id", "username"})
})
@Data
@NoArgsConstructor
public class NoticeRead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "notice_id", nullable = false)
    private Long noticeId;

    @Column(nullable = false, length = 60)
    private String username;

    @Column(name = "full_name", length = 100)
    private String fullName;

    @Column(name = "read_at", nullable = false, updatable = false)
    @CreationTimestamp
    private LocalDateTime readAt;

    public NoticeRead(Long noticeId, String username, String fullName) {
        this.noticeId = noticeId;
        this.username = username;
        this.fullName = fullName;
    }
}
