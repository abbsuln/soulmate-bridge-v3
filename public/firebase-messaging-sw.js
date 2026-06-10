importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

firebase.initializeApp({
  "projectId": "gen-lang-client-0047852526",
  "appId": "1:93383649142:web:757f217ff59c9950373c57",
  "apiKey": "AIzaSyD3GA0Cafp_N0nERfMGRqOWitEzAkoc3lc",
  "authDomain": "gen-lang-client-0047852526.firebaseapp.com",
  "storageBucket": "gen-lang-client-0047852526.firebasestorage.app",
  "messagingSenderId": "93383649142",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification?.title || 'SoulMate Bridge';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/icon.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
