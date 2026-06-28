package com.nexdecade.vms.repository;

import com.nexdecade.vms.entity.FuelPrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface FuelPriceRepository extends JpaRepository<FuelPrice, Long> {
    Optional<FuelPrice> findByFuelType(String fuelType);
    List<FuelPrice> findAllByOrderByFuelTypeAsc();
}
