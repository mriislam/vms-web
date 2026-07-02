package com.nexdecade.vms.config;

import com.nexdecade.vms.security.TenantContext;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.Session;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Enables the Hibernate "tenantFilter" for each request so all repository
 * queries automatically include WHERE tenant_id = :tenantId.
 * Super-admin tokens (tenantId == null) bypass the filter and see all data.
 * Clears TenantContext after every request to prevent thread-pool leakage.
 */
@Component
@Slf4j
public class TenantFilterInterceptor implements HandlerInterceptor {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        Long tenantId = TenantContext.get();
        if (tenantId != null) {
            try {
                entityManager.unwrap(Session.class)
                             .enableFilter("tenantFilter")
                             .setParameter("tenantId", tenantId);
            } catch (Exception e) {
                log.warn("Could not enable tenant filter: {}", e.getMessage());
            }
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        TenantContext.clear();
    }
}
