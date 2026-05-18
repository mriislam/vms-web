package com.nexdecade.vms.service;

import com.nexdecade.vms.entity.Accident;
import com.nexdecade.vms.exception.ResourceNotFoundException;
import com.nexdecade.vms.repository.AccidentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service @RequiredArgsConstructor
public class AccidentService {

    private final AccidentRepository repo;

    public List<Accident> findAll() { return repo.findAll(); }

    public Accident findById(Long id) {
        return repo.findById(id).orElseThrow(() ->
                new ResourceNotFoundException("Accident record not found: " + id));
    }

    public Accident save(Accident a) {
        if (a.getStatus() == null || a.getStatus().isBlank()) a.setStatus("open");
        if (a.getCasualties() == null) a.setCasualties(0);
        return repo.save(a);
    }

    public Accident update(Long id, Accident a) {
        Accident existing = findById(id);
        a.setId(existing.getId());
        a.setCreatedAt(existing.getCreatedAt());
        if (a.getStatus() == null || a.getStatus().isBlank()) a.setStatus("open");
        if (a.getCasualties() == null) a.setCasualties(0);
        return repo.save(a);
    }

    public void delete(Long id) {
        findById(id);
        repo.deleteById(id);
    }
}
