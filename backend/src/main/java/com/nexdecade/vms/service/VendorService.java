package com.nexdecade.vms.service;

import com.nexdecade.vms.entity.Vendor;
import com.nexdecade.vms.exception.ResourceNotFoundException;
import com.nexdecade.vms.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service @RequiredArgsConstructor
public class VendorService {
    private final VendorRepository repo;

    public List<Vendor> findAll() { return repo.findAll(); }

    public Vendor findById(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Vendor not found: " + id));
    }

    public Vendor save(Vendor v) { return repo.save(v); }

    public Vendor update(Long id, Vendor v) {
        Vendor existing = findById(id);
        v.setId(existing.getId());
        v.setCreatedAt(existing.getCreatedAt());
        return repo.save(v);
    }

    public void delete(Long id) { findById(id); repo.deleteById(id); }
}
