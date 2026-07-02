/** Defines the shared Hibernate filter used by all tenant-scoped entities. */
@FilterDef(
    name        = "tenantFilter",
    parameters  = @ParamDef(name = "tenantId", type = Long.class),
    defaultCondition = "tenant_id = :tenantId"
)
package com.nexdecade.vms.entity;

import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;
