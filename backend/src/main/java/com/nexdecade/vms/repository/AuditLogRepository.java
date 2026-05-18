package com.nexdecade.vms.repository;

import com.nexdecade.vms.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByUsername(String username);
    List<AuditLog> findByModule(String module);
    Page<AuditLog> findAllByOrderByTimestampDesc(Pageable pageable);
}
