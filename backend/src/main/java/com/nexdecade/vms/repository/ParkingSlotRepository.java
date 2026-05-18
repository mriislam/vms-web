package com.nexdecade.vms.repository;

import com.nexdecade.vms.entity.ParkingSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ParkingSlotRepository extends JpaRepository<ParkingSlot, Long> {
    List<ParkingSlot> findByStatus(String status);
    List<ParkingSlot> findByZone(String zone);
}
