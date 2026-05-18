package com.nexdecade.vms.service;

import com.nexdecade.vms.entity.Expense;
import com.nexdecade.vms.exception.ResourceNotFoundException;
import com.nexdecade.vms.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service @RequiredArgsConstructor
public class ExpenseService {
    private final ExpenseRepository repo;

    public List<Expense> findAll() { return repo.findAll(); }

    public Expense findById(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Expense not found: " + id));
    }

    public Expense save(Expense e) {
        if (e.getExpenseNo() == null || e.getExpenseNo().isBlank()) {
            e.setExpenseNo("EXP-" + String.format("%03d", repo.count() + 1));
        }
        return repo.save(e);
    }

    public Expense update(Long id, Expense e) {
        Expense existing = findById(id);
        e.setId(existing.getId());
        e.setCreatedAt(existing.getCreatedAt());
        return repo.save(e);
    }

    public void delete(Long id) { findById(id); repo.deleteById(id); }
}
