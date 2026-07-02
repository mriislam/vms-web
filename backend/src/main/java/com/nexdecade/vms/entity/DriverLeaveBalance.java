package com.nexdecade.vms.entity;

import com.nexdecade.vms.listener.TenantEntityListener;
import jakarta.persistence.*;
import jakarta.persistence.EntityListeners;
import lombok.*;
import org.hibernate.annotations.Filter;

@EntityListeners(TenantEntityListener.class)
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
@Entity @Table(name = "driver_leave_balance")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class DriverLeaveBalance implements TenantAware {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id")
    private Long tenantId;

    private Long driverId;

    @Column(nullable = false, length = 10)
    private String leaveType;

    @Builder.Default private Integer totalDays = 0;
    @Builder.Default private Integer usedDays = 0;
    private Integer year;
}
