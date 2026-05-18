package com.nexdecade.vms.repository;

import com.nexdecade.vms.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    Optional<Vehicle> findByRegNo(String regNo);
    List<Vehicle> findByStatus(String status);
    List<Vehicle> findByOwnership(String ownership);
}
