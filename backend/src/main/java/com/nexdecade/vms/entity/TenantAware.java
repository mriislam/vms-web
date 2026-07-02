package com.nexdecade.vms.entity;

/** Implemented by every tenant-scoped entity so the JPA entity listener can auto-set tenantId on persist. */
public interface TenantAware {
    Long getTenantId();
    void setTenantId(Long tenantId);
}
