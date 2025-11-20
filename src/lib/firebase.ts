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
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Initialize Firebase and set up persistence
export const initializeFirebase = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
    console.log('✅ Firebase auth persistence set to browserLocalPersistence');
  } catch (error) {
    console.error('❌ Error setting Firebase auth persistence:', error);
  }
};

// Configure Google Provider with additional scopes if needed
// Add custom parameters to ensure proper authentication flow
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
