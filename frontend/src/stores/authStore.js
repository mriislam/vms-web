import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      role: null,

      // Accepts the real API response shape: { token, username, fullName, role }
      setAuth: ({ token, username, fullName, role }) =>
        set({ token, role, user: { username, fullName, role } }),

      clearAuth: () => set({ user: null, token: null, role: null }),

      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'vms-auth',
      partialize: (state) => ({ user: state.user, token: state.token, role: state.role }),
    }
  )
);
