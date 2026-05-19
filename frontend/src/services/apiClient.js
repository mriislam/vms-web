import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { decrypt, encrypt, encryptionEnabled } from '../utils/crypto';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT + optionally encrypt request body
apiClient.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const isAuthEndpoint = config.url?.includes('/auth/');
  if (encryptionEnabled() && !isAuthEndpoint && config.data !== undefined && config.data !== null) {
    const plain = typeof config.data === 'string' ? config.data : JSON.stringify(config.data);
    const enc = await encrypt(plain);
    config.data = JSON.stringify({ enc });
  }

  return config;
});

// Handle 401 + optionally decrypt response body
apiClient.interceptors.response.use(
  async (response) => {
    const isAuthResponse = response.config?.url?.includes('/auth/');
    if (encryptionEnabled() && !isAuthResponse && response.data?.enc) {
      try {
        const plain = await decrypt(response.data.enc);
        response.data = JSON.parse(plain);
      } catch {
        // not encrypted or decryption failed — leave as-is
      }
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
