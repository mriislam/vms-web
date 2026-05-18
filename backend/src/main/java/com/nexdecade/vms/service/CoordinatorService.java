package com.nexdecade.vms.service;

import com.nexdecade.vms.entity.Coordinator;
import com.nexdecade.vms.exception.ResourceNotFoundException;
import com.nexdecade.vms.repository.CoordinatorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service @RequiredArgsConstructor
public class CoordinatorService {
    private final CoordinatorRepository repo;

    public List<Coordinator> findAll() { return repo.findAll(); }

    public Coordinator findById(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Coordinator not found: " + id));
    }

    public Coordinator save(Coordinator c) { return repo.save(c); }

    public Coordinator update(Long id, Coordinator c) {
        Coordinator existing = findById(id);
        c.setId(existing.getId());
        c.setCreatedAt(existing.getCreatedAt());
        return repo.save(c);
    }

    public void delete(Long id) { findById(id); repo.deleteById(id); }
}
