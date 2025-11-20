import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration with null checks
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string || ''
};

// Validate required Firebase config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Missing required Firebase configuration. Please check your environment variables.');
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Set persistence to local storage to maintain login across browser sessions
// This ensures users stay logged in even after closing the browser
// browserLocalPersistence: persists authentication state in localStorage
// This is the default behavior in Firebase v9+, but we set it explicitly to ensure it works
export const persistenceInitialized = setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('✅ Firebase auth persistence set to browserLocalPersistence');
  })
  .catch((error) => {
    console.error('❌ Error setting Firebase auth persistence:', error);
  });

// Configure Google Provider with additional scopes if needed
export const googleProvider = new GoogleAuthProvider();
// Add custom parameters to ensure proper authentication flow
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const db = getFirestore(app);
