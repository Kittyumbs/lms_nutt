import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'learner' | 'instructor' | 'admin';
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  userProfile: UserProfile | null;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  userProfile: null,
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Check if email is in instructor list
  const getRoleFromEmail = (email: string): 'learner' | 'instructor' => {
    const instructorEmails = import.meta.env.VITE_INSTRUCTOR_EMAILS?.split(',') || [];
    return instructorEmails.includes(email) ? 'instructor' : 'learner';
  };

  // Create or update user profile in Firestore
  const createUserProfile = async (firebaseUser: User) => {
    if (!firebaseUser) return;

    const userRef = doc(db, 'users', firebaseUser.uid);
    const role = getRoleFromEmail(firebaseUser.email || '');

    const userData: UserProfile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || '',
      photoURL: firebaseUser.photoURL || '',
      role,
    };

    // Use setDoc with merge to create or update
    await setDoc(userRef, userData, { merge: true });

    setUserProfile(userData);
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await createUserProfile(firebaseUser);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen for user profile changes (for role updates)
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const profile = doc.data() as UserProfile;
        setUserProfile(profile);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      // Show user-friendly error message
      if (error?.code === 'auth/configuration-not-found') {
        throw new Error('❌ Firebase Authentication setup required:\n\n1. Go to Firebase Console → Authentication → Get started\n2. Enable Google Sign-in\n3. Add "localhost" to authorized domains\n4. Try again');
      } else if (error?.code === 'auth/popup-blocked') {
        throw new Error('Sign-in popup was blocked by browser. Please allow popups and try again.');
      } else if (error?.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in was cancelled.');
      } else {
        throw new Error(`Authentication failed: ${error?.message || 'Unknown error'}`);
      }
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    signOut,
    userProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
