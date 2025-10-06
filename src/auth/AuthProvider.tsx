import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import React, { createContext, useEffect, useState, useCallback } from 'react';

import { auth, googleProvider } from '../lib/firebase';

import type { User} from 'firebase/auth';
import type { ReactNode } from 'react';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isGoogleCalendarAuthed: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleCalendar: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isGoogleCalendarAuthed: false,
  signInWithGoogle: async () => {},
  signInWithGoogleCalendar: async () => {},
  signOut: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

// Google Calendar API constants
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID as string;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY as string;
const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile";

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGoogleCalendarAuthed, setIsGoogleCalendarAuthed] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Initialize Google Calendar API
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initGoogleAPI = async () => {
      try {
        // Load Google Identity Services
        const gsiScript = document.createElement('script');
        gsiScript.src = 'https://accounts.google.com/gsi/client';
        gsiScript.async = true;
        document.body.appendChild(gsiScript);

        // Load Google API
        const gapiScript = document.createElement('script');
        gapiScript.src = 'https://apis.google.com/js/api.js';
        gapiScript.async = true;
        
        gapiScript.onload = () => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          window.gapi?.load('client', async () => {
            try {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
              await window.gapi.client.init({
                apiKey: GOOGLE_API_KEY,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
              });

              // Check existing token from localStorage first
              const savedToken = localStorage.getItem('google_calendar_token');
              if (savedToken) {
                try {
                  const tokenData = JSON.parse(savedToken);
                  // Check if token is still valid (not expired)
                  if (tokenData.expires_at && Date.now() < tokenData.expires_at) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                    window.gapi.client.setToken({ access_token: tokenData.access_token });
                    setIsGoogleCalendarAuthed(true);
                  } else {
                    // Token expired, remove it
                    localStorage.removeItem('google_calendar_token');
                  }
                } catch (error) {
                  console.error('Error parsing saved token:', error);
                  localStorage.removeItem('google_calendar_token');
                }
              }

              // Also check current token from gapi
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
              const existingToken = window.gapi.client.getToken();
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              if (existingToken?.access_token) {
                setIsGoogleCalendarAuthed(true);
              }

              // Initialize token client
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
              const tc = window.google?.accounts?.oauth2?.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: GOOGLE_SCOPE,
                callback: (response: { access_token?: string; expires_in?: number; error?: string }) => {
                  if (response.access_token) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                    window.gapi.client.setToken({ access_token: response.access_token });
                    setIsGoogleCalendarAuthed(true);
                    
                    // Save token to localStorage with expiration
                    const expiresIn = response.expires_in || 3600; // Default 1 hour
                    const expiresAt = Date.now() + (expiresIn * 1000);
                    const tokenData = {
                      access_token: response.access_token,
                      expires_at: expiresAt,
                      created_at: Date.now()
                    };
                    localStorage.setItem('google_calendar_token', JSON.stringify(tokenData));
                    
                    // Trigger storage event to notify other components
                    window.dispatchEvent(new StorageEvent('storage', {
                      key: 'google_calendar_token',
                      newValue: JSON.stringify(tokenData),
                      oldValue: null
                    }));
                  }
                }
              });
              setTokenClient(tc);
            } catch (error) {
              console.error('Error initializing Google API:', error);
            }
          });
        };

        document.body.appendChild(gapiScript);

        return () => {
          gsiScript.remove();
          gapiScript.remove();
        };
      } catch (error) {
        console.error('Error loading Google scripts:', error);
      }
    };

    void initGoogleAPI();
  }, []);

  // Auto-refresh token when it's about to expire and listen for storage changes
  useEffect(() => {
    const checkTokenExpiration = () => {
      const savedToken = localStorage.getItem('google_calendar_token');
      if (savedToken) {
        try {
          const tokenData = JSON.parse(savedToken);
          const timeUntilExpiry = tokenData.expires_at - Date.now();
          
          // If token expires in less than 5 minutes, just mark as not authenticated
          // Let useGoogleCalendar handle the refresh automatically
          if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
            setIsGoogleCalendarAuthed(false);
          } else if (timeUntilExpiry <= 0) {
            // Token expired
            localStorage.removeItem('google_calendar_token');
            setIsGoogleCalendarAuthed(false);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            window.gapi?.client?.setToken(null);
          } else {
            // Token is still valid
            setIsGoogleCalendarAuthed(true);
          }
        } catch (error) {
          console.error('Error checking token expiration:', error);
          localStorage.removeItem('google_calendar_token');
          setIsGoogleCalendarAuthed(false);
        }
      } else {
        // No token in localStorage
        setIsGoogleCalendarAuthed(false);
      }
    };

    // Listen for localStorage changes from other components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'google_calendar_token') {
        if (e.newValue) {
          // Token was added or modified
          try {
            const tokenData = JSON.parse(e.newValue);
            const timeUntilExpiry = tokenData.expires_at - Date.now();
            
            if (timeUntilExpiry > 0) {
              setIsGoogleCalendarAuthed(true);
              // Restore token to gapi client
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
              window.gapi?.client?.setToken({ access_token: tokenData.access_token });
            } else {
              setIsGoogleCalendarAuthed(false);
            }
          } catch (error) {
            console.error('Error parsing token from storage change:', error);
            setIsGoogleCalendarAuthed(false);
          }
        } else {
          // Token was removed
          setIsGoogleCalendarAuthed(false);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          window.gapi?.client?.setToken(null);
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkTokenExpiration, 60000);
    
    // Also check immediately
    checkTokenExpiration();

    // Listen for storage changes
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [tokenClient]);

  // Sign in with Google (Firebase + Calendar)
  const signInWithGoogle = async () => {
    try {
      // First, sign in with Firebase
      await signInWithPopup(auth, googleProvider);
      
      // Note: Google Calendar permission will be requested separately from sidebar
    } catch (error) {
      console.error('Error signing in with Google:', error);
      
      // Type-safe error handling
      const firebaseError = error as { code?: string; message?: string };
      
      // Show user-friendly error message
      if (firebaseError?.code === 'auth/configuration-not-found') {
        throw new Error('❌ Firebase Authentication setup required:\n\n1. Go to Firebase Console → Authentication → Get started\n2. Enable Google Sign-in\n3. Add "localhost" to authorized domains\n4. Try again');
      } else if (firebaseError?.code === 'auth/popup-blocked') {
        throw new Error('Sign-in popup was blocked by browser. Please allow popups and try again.');
      } else if (firebaseError?.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in was cancelled.');
      } else {
        const errorMessage = firebaseError?.message || (error instanceof Error ? error.message : 'Unknown error');
        throw new Error(`Authentication failed: ${errorMessage}`);
      }
    }
  };

  // Sign in with Google Calendar only
  const signInWithGoogleCalendar = useCallback(async () => {
    if (!tokenClient) {
      throw new Error('Google Calendar authentication not ready. Please wait and try again.');
    }
    
    try {
      console.log('🚨 signInWithGoogleCalendar called from sidebar - this is OK');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (error) {
      console.error('Error signing in with Google Calendar:', error);
      throw new Error('Failed to authenticate with Google Calendar');
    }
  }, [tokenClient]);

  // Sign out (both Firebase and Google Calendar)
  const signOut = async () => {
    try {
      // Sign out from Firebase
      await firebaseSignOut(auth);
      
      // Sign out from Google Calendar
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const token = window.gapi?.client?.getToken();
        if (token) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          window.gapi.client.setToken(null);
          setIsGoogleCalendarAuthed(false);
        }
        // Remove token from localStorage
        localStorage.removeItem('google_calendar_token');
        
        // Trigger storage event to notify other components
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'google_calendar_token',
          newValue: null,
          oldValue: localStorage.getItem('google_calendar_token')
        }));
      } catch (calendarError) {
        console.error('Error signing out from Google Calendar:', calendarError);
        // Don't throw here, Firebase signout is more important
      }
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    isGoogleCalendarAuthed,
    signInWithGoogle,
    signInWithGoogleCalendar,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
