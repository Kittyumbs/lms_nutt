import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
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
