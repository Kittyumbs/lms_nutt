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

// 🚨 PRODUCTION FIX: Enhanced persistence setup
const initializeAuthPersistence = async () => {
  try {
    console.log('🔧 [FIREBASE-INIT] Starting auth persistence setup...');

    // Set persistence với retry logic
    await setPersistence(auth, browserLocalPersistence);
    console.log('✅ [FIREBASE-INIT] Persistence set successfully');

    // Kiểm tra immediate user
    const immediateUser = auth.currentUser;
    console.log('🔍 [FIREBASE-INIT] Immediate user check:', {
      hasUser: !!immediateUser,
      userEmail: immediateUser?.email,
      userUid: immediateUser?.uid
    });

    // Kiểm tra localStorage ngay lập tức
    const firebaseKeys = Object.keys(localStorage).filter(key =>
      key.includes('firebase') || key.includes('auth')
    );
    console.log('🔍 [FIREBASE-INIT] Initial localStorage check:', {
      keyCount: firebaseKeys.length,
      keys: firebaseKeys
    });

    return immediateUser;
  } catch (error) {
    console.error('❌ [FIREBASE-INIT] Persistence setup failed:', {
      error: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code
    });

    // Fallback: thử với inMemoryPersistence
    try {
      await setPersistence(auth, inMemoryPersistence);
      console.log('🔄 [FIREBASE-INIT] Fallback to inMemory persistence');
    } catch (fallbackError) {
      console.error('❌ [FIREBASE-INIT] Fallback persistence also failed:', fallbackError);
    }

    return null;
  }
};

// Đảm bảo persistence được khởi tạo ngay lập tức
export const persistenceInitialized = initializeAuthPersistence();

// Khởi tạo ngay lập tức
persistenceInitialized.then(user => {
  console.log('🎯 [FIREBASE-INIT] Auth initialization completed:', {
    hasUser: !!user,
    timestamp: new Date().toISOString()
  });
}).catch(err => {
  console.error('❌ [FIREBASE-INIT] Auth initialization error:', err);
});

// Configure Google Provider with additional scopes if needed
export const googleProvider = new GoogleAuthProvider();
// Add custom parameters to ensure proper authentication flow
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const db = getFirestore(app);
