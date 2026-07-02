package com.nexdecade.vms.repository;

import com.nexdecade.vms.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    List<Department> findAllByOrderByNameAsc();
    List<Department> findByStatusOrderByNameAsc(String status);
    Optional<Department> findByName(String name);
    boolean existsByName(String name);
    boolean existsByCode(String code);
}
