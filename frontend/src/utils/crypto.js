const KEY_USAGES = ['encrypt', 'decrypt'];

async function deriveKey(passphrase) {
  const enc = new TextEncoder();
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(passphrase));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, KEY_USAGES);
}

// Cached key promise — avoids re-deriving on every request
let _keyPromise = null;
function getKey() {
  if (!_keyPromise) {
    const passphrase = import.meta.env.VITE_ENCRYPTION_KEY ?? '';
    _keyPromise = deriveKey(passphrase);
  }
  return _keyPromise;
}

// Returns Base64(IV[12] + Ciphertext+GCMTag)
export async function encrypt(plaintext) {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  const combined = new Uint8Array(12 + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), 12);
  return btoa(String.fromCharCode(...combined));
}

// Accepts Base64(IV[12] + Ciphertext+GCMTag), returns plaintext string
export async function decrypt(b64) {
  const key = await getKey();
  const combined = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const cipherBuf = combined.slice(12);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBuf);
  return new TextDecoder().decode(plainBuf);
}

export const encryptionEnabled = () =>
  import.meta.env.VITE_ENCRYPTION_ENABLED === 'true';
