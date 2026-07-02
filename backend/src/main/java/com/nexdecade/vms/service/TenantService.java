package com.nexdecade.vms.service;

import com.nexdecade.vms.entity.Tenant;
import com.nexdecade.vms.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository repo;

    public List<Tenant> findAll()                  { return repo.findAll(); }
    public List<Tenant> findActive()               { return repo.findByStatusOrderByNameAsc("active"); }
    public Tenant       findById(Long id)          { return repo.findById(id).orElseThrow(() -> new RuntimeException("Tenant not found: " + id)); }
    public Tenant       findBySlug(String slug)    { return repo.findBySlug(slug).orElseThrow(() -> new RuntimeException("Organization not found: " + slug)); }
    public boolean      existsBySlug(String slug)  { return repo.existsBySlug(slug); }

    public Tenant create(Tenant t) {
        if (repo.existsBySlug(t.getSlug()))
            throw new RuntimeException("Slug already taken: " + t.getSlug());
        return repo.save(t);
    }

    public Tenant update(Long id, Tenant body) {
        Tenant t = findById(id);
        if (body.getName()        != null) t.setName(body.getName());
        if (body.getLogoUrl()     != null) t.setLogoUrl(body.getLogoUrl());
        if (body.getPlan()        != null) t.setPlan(body.getPlan());
        if (body.getStatus()      != null) t.setStatus(body.getStatus());
        if (body.getContactEmail()!= null) t.setContactEmail(body.getContactEmail());
        if (body.getContactPhone()!= null) t.setContactPhone(body.getContactPhone());
        if (body.getAddress()     != null) t.setAddress(body.getAddress());
        if (body.getMaxUsers()    != null) t.setMaxUsers(body.getMaxUsers());
        if (body.getMaxVehicles() != null) t.setMaxVehicles(body.getMaxVehicles());
        if (body.getTrialEndsAt() != null) t.setTrialEndsAt(body.getTrialEndsAt());
        return repo.save(t);
    }

    public void delete(Long id) { repo.deleteById(id); }
}
