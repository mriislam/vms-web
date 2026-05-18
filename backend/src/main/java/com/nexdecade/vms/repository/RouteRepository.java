package com.nexdecade.vms.repository;

import com.nexdecade.vms.entity.Route;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RouteRepository extends JpaRepository<Route, Long> {
    List<Route> findByStatus(String status);
}
