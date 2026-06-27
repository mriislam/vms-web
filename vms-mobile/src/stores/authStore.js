import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuthStore = create((set) => ({
  token:   null,
  user:    null,
  isReady: false,

  // Load persisted session on app start
  hydrate: async () => {
    try {
      const token = await AsyncStorage.getItem('vms_token');
      const raw   = await AsyncStorage.getItem('vms_user');
      const user  = raw ? JSON.parse(raw) : null;
      set({ token, user, isReady: true });
    } catch {
      set({ isReady: true });
    }
  },

  login: async (token, user) => {
    await AsyncStorage.setItem('vms_token', token);
    await AsyncStorage.setItem('vms_user', JSON.stringify(user));
    set({ token, user });
  },

  logout: async () => {
    await AsyncStorage.removeItem('vms_token');
    await AsyncStorage.removeItem('vms_user');
    set({ token: null, user: null });
  },
}));

// ── Role helpers ─────────────────────────────────────────────────────────
export function getRole(user) {
  return user?.role ?? 'operator';
}

export function isAdmin(user) {
  return ['admin', 'manager'].includes(user?.role);
}

export function isDriver(user) {
  // Driver role — also detectable if role === 'driver'
  return user?.role === 'driver' || user?.isDriver === true;
}
