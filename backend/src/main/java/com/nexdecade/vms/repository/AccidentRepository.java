package com.nexdecade.vms.repository;

import com.nexdecade.vms.entity.Accident;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccidentRepository extends JpaRepository<Accident, Long> {
}
