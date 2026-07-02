package com.nexdecade.vms.entity;

import com.nexdecade.vms.listener.TenantEntityListener;
import jakarta.persistence.*;
import jakarta.persistence.EntityListeners;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;

import java.time.LocalDateTime;

@EntityListeners(TenantEntityListener.class)
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
@Entity
@Table(name = "notice_reads", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"notice_id", "username"})
})
@Data
@NoArgsConstructor
public class NoticeRead implements TenantAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id")
    private Long tenantId;

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
