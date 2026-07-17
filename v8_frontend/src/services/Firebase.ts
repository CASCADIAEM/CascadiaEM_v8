import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

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
