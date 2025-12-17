import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence, inMemoryPersistence } from 'firebase/auth';
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
console.log('🚨 [FIREBASE-DOMAIN-DEBUG] Domain Analysis:', {
  // Firebase config domains
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,

  // Current deployment domains
  currentHostname: typeof window !== 'undefined' ? window.location.hostname : 'server-side',
  currentOrigin: typeof window !== 'undefined' ? window.location.origin : 'server-side',
  isVercel: typeof window !== 'undefined' ? window.location.hostname.includes('vercel.app') : false,

  // Domain matching check
  domainMatches: typeof window !== 'undefined' ? window.location.hostname.includes(firebaseConfig.authDomain?.replace('.firebaseapp.com', '') || '') : false,
  expectedAuthDomain: `${firebaseConfig.projectId}.firebaseapp.com`,

  timestamp: new Date().toISOString()
});

// 🚨 QUAN TRỌNG: Validate authDomain
if (firebaseConfig.authDomain !== `${firebaseConfig.projectId}.firebaseapp.com`) {
  console.error('❌ [FIREBASE-DOMAIN] authDomain mismatch!', {
    current: firebaseConfig.authDomain,
    expected: `${firebaseConfig.projectId}.firebaseapp.com`,
    fix: 'Update VITE_FIREBASE_AUTH_DOMAIN in Vercel environment variables'
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

// 🚨 SYNCHRONOUS: Set persistence synchronously to ensure it's ready before any auth listeners
console.log('🔧 [FIREBASE-INIT] Setting up Firebase auth persistence synchronously...');

try {
  await setPersistence(auth, browserLocalPersistence);
  console.log('✅ [FIREBASE-INIT] Persistence set successfully - using localStorage for session persistence');
} catch (error) {
  console.error('❌ [FIREBASE-INIT] Persistence setup failed, trying fallback:', error);
  try {
    await setPersistence(auth, inMemoryPersistence);
    console.log('🔄 [FIREBASE-INIT] Fallback to inMemory persistence - session will not persist across browser restarts');
  } catch (fallbackError) {
    console.error('❌ [FIREBASE-INIT] Fallback persistence also failed:', fallbackError);
  }
}

// 🚨 CRITICAL: Verify persistence is working by checking localStorage
console.log('🔍 [FIREBASE-INIT] Verifying persistence setup...');
try {
  // Test if we can access localStorage (this will fail in private browsing)
  const testKey = '__firebase_persistence_test__';
  localStorage.setItem(testKey, 'test');
  localStorage.removeItem(testKey);
  console.log('✅ [FIREBASE-INIT] localStorage access confirmed');
} catch (storageError) {
  console.warn('⚠️ [FIREBASE-INIT] localStorage access failed, persistence may not work:', storageError);
}

export const persistenceInitialized = Promise.resolve(null);

// Configure Google Provider with additional scopes if needed
export const googleProvider = new GoogleAuthProvider();
// Add custom parameters to ensure proper authentication flow
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const db = getFirestore(app);
