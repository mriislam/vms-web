package com.nexdecade.vms.service;

import com.nexdecade.vms.entity.Route;
import com.nexdecade.vms.exception.ResourceNotFoundException;
import com.nexdecade.vms.repository.RouteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service @RequiredArgsConstructor
public class RouteService {
    private final RouteRepository repo;

    public List<Route> findAll() { return repo.findAll(); }

    public Route findById(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Route not found: " + id));
    }

    public Route save(Route r) {
        if (r.getRouteCode() == null || r.getRouteCode().isBlank()) {
            r.setRouteCode("RT-" + String.format("%03d", repo.count() + 1));
        }
        return repo.save(r);
    }

    public Route update(Long id, Route r) {
        Route existing = findById(id);
        r.setId(existing.getId());
        r.setCreatedAt(existing.getCreatedAt());
        return repo.save(r);
    }

    public void delete(Long id) { findById(id); repo.deleteById(id); }
}
