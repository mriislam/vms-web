import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl
  ?? 'https://demo-vms.nexdecade.com/api';

const ENCRYPTION_KEY = 'VMS-Nexdecade-AES256-SecretKey-2024';
const ENCRYPTION_ENABLED = true;

// ── AES-256-GCM encryption (matches web frontend) ──────────────────────────
async function deriveKey(passphrase) {
  const enc  = new TextEncoder();
  const raw  = await crypto.subtle.digest('SHA-256', enc.encode(passphrase));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt','decrypt']);
}
let _keyPromise = null;
function getKey() {
  if (!_keyPromise) _keyPromise = deriveKey(ENCRYPTION_KEY);
  return _keyPromise;
}
async function encrypt(plaintext) {
  const key = await getKey();
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const buf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  const combined = new Uint8Array(12 + buf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(buf), 12);
  return btoa(String.fromCharCode(...combined));
}
async function decrypt(b64) {
  const key = await getKey();
  const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const iv  = combined.slice(0, 12);
  const buf = combined.slice(12);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, buf);
  return new TextDecoder().decode(plain);
}

// ── Axios client ────────────────────────────────────────────────────────────
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token + encrypt body
client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('vms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const isAuth = config.url?.includes('/auth/');
  if (ENCRYPTION_ENABLED && !isAuth && config.data != null) {
    const plain = typeof config.data === 'string' ? config.data : JSON.stringify(config.data);
    const enc   = await encrypt(plain);
    config.data = JSON.stringify({ enc });
  }
  return config;
});

// Response interceptor — decrypt body + handle 401
client.interceptors.response.use(
  async (res) => {
    const isAuth = res.config?.url?.includes('/auth/');
    if (ENCRYPTION_ENABLED && !isAuth && res.data?.enc) {
      try {
        const plain = await decrypt(res.data.enc);
        res.data = JSON.parse(plain);
      } catch { /* not encrypted */ }
    }
    return res;
  },
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('vms_token');
      await AsyncStorage.removeItem('vms_user');
    }
    return Promise.reject(error);
  }
);

export default client;
