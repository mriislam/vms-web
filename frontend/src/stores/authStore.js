import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:       null,
      token:      null,
      role:       null,
      tenantId:   null,
      tenantSlug: null,
      tenantName: null,

      setAuth: ({ token, username, fullName, role, tenantId, tenantSlug, tenantName }) =>
        set({
          token, role,
          tenantId:   tenantId   ?? null,
          tenantSlug: tenantSlug ?? null,
          tenantName: tenantName ?? null,
          user: { username, fullName, role, tenantId, tenantSlug, tenantName },
        }),

      clearAuth: () => set({
        user: null, token: null, role: null,
        tenantId: null, tenantSlug: null, tenantName: null,
      }),

      isAuthenticated: () => !!get().token,
      isSuperAdmin:    () => get().role === 'super_admin',
    }),
    {
      name: 'vms-auth',
      partialize: (s) => ({
        user: s.user, token: s.token, role: s.role,
        tenantId: s.tenantId, tenantSlug: s.tenantSlug, tenantName: s.tenantName,
      }),
    }
  )
);
