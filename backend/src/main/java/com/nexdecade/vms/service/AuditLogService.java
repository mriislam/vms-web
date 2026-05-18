package com.nexdecade.vms.service;

import com.nexdecade.vms.entity.AuditLog;
import com.nexdecade.vms.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository repo;

    @Async
    public void log(String username, String role, String module, String action, String detail, String ip, String status) {
        repo.save(AuditLog.builder()
                .username(username)
                .role(role)
                .module(module)
                .action(action)
                .detail(detail)
                .ipAddress(ip)
                .status(status)
                .build());
    }

    public List<AuditLog> findAll() {
        return repo.findAll(Sort.by(Sort.Direction.DESC, "timestamp"));
    }

    public List<AuditLog> findRecent(int limit) {
        return repo.findAllByOrderByTimestampDesc(PageRequest.of(0, limit)).getContent();
    }
}
