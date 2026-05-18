package com.nexdecade.vms.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "driver_leave_balance")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class DriverLeaveBalance {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long driverId;

    @Column(nullable = false, length = 10)
    private String leaveType;

    @Builder.Default private Integer totalDays = 0;
    @Builder.Default private Integer usedDays = 0;
    private Integer year;
}
