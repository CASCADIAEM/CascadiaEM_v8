import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, signInAnonymously, connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCN_deLJNlLlv6-7J1P5LohK7dSgtInQgU",
  authDomain: "cascadiaem-event-manager.firebaseapp.com",
  projectId: "cascadiaem-event-manager",
  storageBucket: "cascadiaem-event-manager.firebasestorage.app",
  messagingSenderId: "657401392495",
  appId: "1:657401392495:web:b2a3a7fbc8f39afbee8c9a"
};

// Initialize Firebase Core
const app = initializeApp(firebaseConfig);

// Initialize Services with Multi-Tab Offline Persistent Cache
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const auth = getAuth(app);

// Strict local emulator routing (with dynamic network IP binding for mobile/tablet Wi-Fi testing)
const isLocal = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.startsWith('192.168.') ||
  window.location.hostname.startsWith('10.') ||
  window.location.hostname.startsWith('172.')
);

if (isLocal) {
  const host = window.location.hostname;
  console.log(`🔌 [FIREBASE EMULATOR BINDING]: Directing database and authentication connections strictly to local emulators at ${host}`);
  connectFirestoreEmulator(db, host, 8080);
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
}

// Trigger immediate secure anonymous sign-in to satisfy Firestore security rules
signInAnonymously(auth)
  .then(() => {
    console.log("✅ [FIREBASE AUTH]: Anonymous authentication established successfully.");
  })
  .catch((err) => {
    console.error("🚨 [FIREBASE AUTH]: Anonymous authentication collapsed.", err);
  });

// Global state observer to guarantee session stability and automatic re-authentication
auth.onAuthStateChanged((user) => {
  if (!user) {
    console.warn("⚠️ [FIREBASE AUTH]: No active session. Attempting automatic anonymous re-authentication...");
    signInAnonymously(auth)
      .then(() => {
        console.log("✅ [FIREBASE AUTH]: Anonymous session restored successfully.");
      })
      .catch((err) => {
        console.error("🚨 [FIREBASE AUTH]: Anonymous session restoration failed.", err);
      });
  }
});
