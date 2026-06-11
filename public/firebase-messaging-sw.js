importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// Firebase config is passed from the main thread via postMessage.
// Do NOT hardcode API keys in this file.
let messaging = null;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG' && !messaging) {
    firebase.initializeApp(event.data.config);
    messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const notificationTitle = payload.notification?.title || 'SoulMate Bridge';
      const notificationOptions = {
        body: payload.notification?.body,
        icon: '/icon.svg'
      };
      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
});
