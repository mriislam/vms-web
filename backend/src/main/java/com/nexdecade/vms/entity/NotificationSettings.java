package com.nexdecade.vms.entity;

import com.nexdecade.vms.listener.TenantEntityListener;
import jakarta.persistence.*;
import jakarta.persistence.EntityListeners;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@EntityListeners(TenantEntityListener.class)
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
@Entity
@Table(name = "notification_settings")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class NotificationSettings implements TenantAware {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id")
    private Long tenantId;

    /** One of: fcm | sms | email | whatsapp */
    @Column(nullable = false, unique = true, length = 20)
    private String channel;

    @Builder.Default
    @Column(nullable = false)
    private Boolean enabled = false;

    /** Channel-specific JSON config (keys, endpoints, credentials) */
    @Column(columnDefinition = "TEXT")
    private String configJson;

    @CreationTimestamp @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
