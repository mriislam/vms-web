package com.nexdecade.vms.service;

import com.nexdecade.vms.entity.Vehicle;
import com.nexdecade.vms.exception.ResourceNotFoundException;
import com.nexdecade.vms.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service @RequiredArgsConstructor
public class VehicleService {
    private final VehicleRepository repo;

    public List<Vehicle> findAll() { return repo.findAll(); }

    public Vehicle findById(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Vehicle not found: " + id));
    }

    public Vehicle save(Vehicle v) {
        applyDefaults(v);
        return repo.save(v);
    }

    public Vehicle update(Long id, Vehicle v) {
        Vehicle existing = findById(id);
        v.setId(existing.getId());
        v.setCreatedAt(existing.getCreatedAt());
        applyDefaults(v);
        return repo.save(v);
    }

    private void applyDefaults(Vehicle v) {
        if (v.getOdometer()   == null) v.setOdometer(0);
        if (v.getStatus()     == null || v.getStatus().isBlank())    v.setStatus("active");
        if (v.getOwnership()  == null || v.getOwnership().isBlank()) v.setOwnership("Private");
        if (v.getFuelType()   == null || v.getFuelType().isBlank())  v.setFuelType("Diesel");
    }

    public void delete(Long id) {
        findById(id);
        repo.deleteById(id);
    }
}
