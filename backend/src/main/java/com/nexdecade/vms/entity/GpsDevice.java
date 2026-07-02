package com.nexdecade.vms.entity;

import com.nexdecade.vms.listener.TenantEntityListener;
import jakarta.persistence.*;
import jakarta.persistence.EntityListeners;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;

import java.time.LocalDateTime;

@EntityListeners(TenantEntityListener.class)
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
@Entity
@Table(name = "gps_devices")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GpsDevice implements TenantAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id")
    private Long tenantId;

    @Column(name = "vehicle_reg", length = 20, nullable = false)
    private String vehicleReg;

    @Column(name = "imei", length = 20, unique = true, nullable = false)
    private String imei;

    @Column(name = "msisdn", length = 20, nullable = false)
    private String msisdn; // SIM number

    @Column(name = "client_mobile", length = 20, nullable = true)
    private String clientMobile;

    @Column(name = "client_id", length = 20, unique = true, nullable = false)
    private String clientId;

    @Column(name = "device_model", length = 40)
    @Builder.Default
    private String deviceModel = "GT06N";

    @Column(name = "status", length = 10)
    @Builder.Default
    private String status = "active";

    @Column(name = "last_seen")
    private LocalDateTime lastSeen;

    @Column(name = "last_lat")
    private Double lastLat;

    @Column(name = "last_lng")
    private Double lastLng;

    @Column(name = "last_speed")
    private Double lastSpeed;

    @Column(name = "engine_status", length = 10)
    @Builder.Default
    private String engineStatus = "off"; // "on" or "off"

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
