// Firebase Cloud Messaging service worker — nex-vms project
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyBffoWixiUWa4WubJCb-glQtvQXwa6wiW4',
  authDomain:        'nex-vms.firebaseapp.com',
  projectId:         'nex-vms',
  storageBucket:     'nex-vms.firebasestorage.app',
  messagingSenderId: '33357044823',
  appId:             '1:33357044823:web:ec40d0cd6616c2e9bb1712',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title = 'VMS Notification', body = '' } = payload.notification ?? {};
  self.registration.showNotification(title, {
    body,
    icon: '/vms-icon.svg',
    badge: '/vms-icon.svg',
    tag: 'vms-trip-notification',
    renotify: true,
  });
});
