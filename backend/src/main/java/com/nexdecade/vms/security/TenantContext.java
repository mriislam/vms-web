package com.nexdecade.vms.security;

/** Thread-local store for the current request's tenant. Set in JwtAuthFilter, cleared in TenantFilterInterceptor. */
public final class TenantContext {

    private static final ThreadLocal<Long>   TENANT_ID   = new ThreadLocal<>();
    private static final ThreadLocal<String> TENANT_SLUG = new ThreadLocal<>();

    private TenantContext() {}

    public static void set(Long tenantId, String tenantSlug) {
        TENANT_ID.set(tenantId);
        TENANT_SLUG.set(tenantSlug);
    }

    public static Long   get()     { return TENANT_ID.get();   }
    public static String getSlug() { return TENANT_SLUG.get(); }

    public static void clear() {
        TENANT_ID.remove();
        TENANT_SLUG.remove();
    }
}
