package com.nexdecade.vms.service;

import com.nexdecade.vms.entity.ParkingSlot;
import com.nexdecade.vms.exception.ResourceNotFoundException;
import com.nexdecade.vms.repository.ParkingSlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service @RequiredArgsConstructor
public class ParkingSlotService {
    private final ParkingSlotRepository repo;

    public List<ParkingSlot> findAll() { return repo.findAll(); }

    public ParkingSlot findById(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Slot not found: " + id));
    }

    public ParkingSlot save(ParkingSlot s) { return repo.save(s); }

    public ParkingSlot update(Long id, ParkingSlot s) {
        ParkingSlot existing = findById(id);
        s.setId(existing.getId());
        s.setCreatedAt(existing.getCreatedAt());
        return repo.save(s);
    }

    public void delete(Long id) { findById(id); repo.deleteById(id); }
}
