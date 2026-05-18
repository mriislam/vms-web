package com.nexdecade.vms.service;

import com.nexdecade.vms.entity.User;
import com.nexdecade.vms.exception.ResourceNotFoundException;
import com.nexdecade.vms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service @RequiredArgsConstructor
public class UserService {
    private final UserRepository repo;
    private final PasswordEncoder encoder;

    public List<User> findAll() { return repo.findAll(); }

    public User findById(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
    }

    public User create(User u, String rawPassword) {
        u.setPasswordHash(encoder.encode(rawPassword));
        if (u.getStatus() == null) u.setStatus("active");
        return repo.save(u);
    }

    public User update(Long id, User u) {
        User existing = findById(id);
        u.setId(existing.getId());
        u.setPasswordHash(existing.getPasswordHash());
        u.setCreatedAt(existing.getCreatedAt());
        return repo.save(u);
    }

    public void resetPassword(Long id, String rawPassword) {
        User u = findById(id);
        u.setPasswordHash(encoder.encode(rawPassword));
        repo.save(u);
    }

    public User toggleStatus(Long id) {
        User u = findById(id);
        u.setStatus("active".equals(u.getStatus()) ? "inactive" : "active");
        return repo.save(u);
    }

    public void delete(Long id) { findById(id); repo.deleteById(id); }
}
