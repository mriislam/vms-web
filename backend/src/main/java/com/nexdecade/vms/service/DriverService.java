package com.nexdecade.vms.service;

import com.nexdecade.vms.entity.Driver;
import com.nexdecade.vms.exception.ResourceNotFoundException;
import com.nexdecade.vms.repository.DriverRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service @RequiredArgsConstructor
public class DriverService {
    private final DriverRepository repo;

    public List<Driver> findAll() { return repo.findAll(); }

    public Driver findById(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Driver not found: " + id));
    }

    public Driver save(Driver d) { return repo.save(d); }

    public Driver update(Long id, Driver d) {
        Driver existing = findById(id);
        d.setId(existing.getId());
        d.setCreatedAt(existing.getCreatedAt());
        return repo.save(d);
    }

    public void delete(Long id) { findById(id); repo.deleteById(id); }
}
