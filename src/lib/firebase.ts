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

// 🚨 QUAN TRỌNG: Production Firebase config với domain chính xác
console.log('🚨 [FIREBASE-CONFIG] Current configuration:', {
  authDomain: firebaseConfig.authDomain,
  currentHostname: typeof window !== 'undefined' ? window.location.hostname : 'server-side',
  isVercel: typeof window !== 'undefined' ? window.location.hostname.includes('vercel.app') : false,
  timestamp: new Date().toISOString()
});

// 🚨 QUAN TRỌNG: Kiểm tra domain matching
if (firebaseConfig.authDomain && typeof window !== 'undefined' &&
    !window.location.hostname.includes(firebaseConfig.authDomain.replace('.firebaseapp.com', '')) &&
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('vercel.app')) {
  console.error('❌ [FIREBASE-CONFIG] Domain mismatch!', {
    authDomain: firebaseConfig.authDomain,
    currentHost: window.location.hostname,
    expected: `Should contain: ${firebaseConfig.authDomain.replace('.firebaseapp.com', '')} or be localhost/vercel`
  });
}

// Validate required Firebase config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Missing required Firebase configuration. Please check your environment variables.');
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// 🚨 Debug Firebase config
console.log('🚨 [FIREBASE-DEBUG] Firebase Config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  hasApiKey: !!firebaseConfig.apiKey,
  appId: firebaseConfig.appId,
  currentDomain: typeof window !== 'undefined' ? window.location.hostname : 'server-side',
  timestamp: new Date().toISOString()
});

// 🚨 Set persistence with enhanced error handling and immediate verification
export const persistenceInitialized = setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('✅ [FIREBASE-DEBUG] Persistence set to browserLocalPersistence SUCCESSFULLY');

    // 🚨 Check current user immediately after persistence is set
    const currentUser = auth.currentUser;
    console.log('🔍 [FIREBASE-DEBUG] Immediate currentUser check after persistence:', {
      hasUser: !!currentUser,
      userEmail: currentUser?.email,
      userUid: currentUser?.uid,
      timestamp: new Date().toISOString()
    });
  })
  .catch((error) => {
    console.error('❌ [FIREBASE-DEBUG] Persistence setup FAILED:', {
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });

    // 🚨 Try to get current user even if persistence failed
    setTimeout(() => {
      const fallbackUser = auth.currentUser;
      console.log('🔍 [FIREBASE-DEBUG] Fallback currentUser check after persistence error:', {
        hasUser: !!fallbackUser,
        userEmail: fallbackUser?.email,
        errorContext: 'Persistence failed but user might still be available',
        timestamp: new Date().toISOString()
      });
    }, 100);
  });

// Wait for persistence to be initialized before using auth
export const getInitializedAuth = () => {
  return new Promise<typeof auth>((resolve) => {
    persistenceInitialized.then(() => resolve(auth)).catch(() => resolve(auth));
  });
};

// Configure Google Provider with additional scopes if needed
export const googleProvider = new GoogleAuthProvider();
// Add custom parameters to ensure proper authentication flow
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const db = getFirestore(app);
