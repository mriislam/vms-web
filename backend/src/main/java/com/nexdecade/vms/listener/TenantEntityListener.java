package com.nexdecade.vms.listener;

import com.nexdecade.vms.entity.TenantAware;
import com.nexdecade.vms.security.TenantContext;
import jakarta.persistence.PrePersist;

/** Automatically stamps tenant_id on every new entity before it is persisted. */
public class TenantEntityListener {

    @PrePersist
    public void prePersist(Object entity) {
        if (entity instanceof TenantAware ta && ta.getTenantId() == null) {
            ta.setTenantId(TenantContext.get());
        }
    }
}
