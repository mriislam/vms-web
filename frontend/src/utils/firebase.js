// Firebase / FCM utility — gracefully no-ops when not configured
const configured = () =>
  !!import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_API_KEY !== 'YOUR_KEY';

export async function initFcm() {
  if (!configured()) return; // skip when credentials aren't filled in
  try {
    const [{ initializeApp }, { getMessaging, getToken, onMessage }] = await Promise.all([
      import('firebase/app'),
      import('firebase/messaging'),
    ]);

    const app = initializeApp({
      apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId:             import.meta.env.VITE_FIREBASE_APP_ID,
    });

    const messaging = getMessaging(app);
    const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: sw,
    });

    if (token) {
      const { default: apiClient } = await import('../services/apiClient');
      await apiClient.post('/driver/fcm-token', { token });
    }

    onMessage(messaging, (payload) => {
      const { title = 'VMS', body = '' } = payload.notification ?? {};
      if (Notification.permission === 'granted' && title) {
        new Notification(title, { body, icon: '/vms-icon.svg' });
      }
    });
  } catch (err) {
    console.warn('FCM init skipped:', err.message);
  }
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  const perm = await Notification.requestPermission();
  return perm === 'granted';
}
