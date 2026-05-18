import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUIStore = create(
  persist(
    (set) => ({
      isDark: false,
      sidebarCollapsed: false,

      toggleTheme: () => set((s) => ({ isDark: !s.isDark })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: 'vms-ui',
      version: 1,           // bump resets any cached isDark:true from old sessions
      migrate: () => ({ isDark: false, sidebarCollapsed: false }),
    }
  )
);
