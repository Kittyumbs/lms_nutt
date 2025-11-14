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

  // Debug: Log state changes
  useEffect(() => {
    console.log('🔍 [AuthProvider] State changed:', {
      user: user ? { uid: user.uid, email: user.email, displayName: user.displayName } : null,
      loading,
      isGoogleCalendarAuthed,
      hasTokenClient: !!tokenClient,
      timestamp: new Date().toISOString()
    });
  }, [user, loading, isGoogleCalendarAuthed, tokenClient]);

  // Listen for auth state changes
  useEffect(() => {
    console.log('🔍 [AuthProvider] Setting up Firebase auth state listener');
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const previousUser = user;
      const wasLoggedOut = !previousUser && firebaseUser; // User just logged in
      const wasLoggedIn = previousUser && !firebaseUser; // User just logged out
      
      console.log('🔍 [AuthProvider] Firebase auth state changed:', {
        previousUser: previousUser ? { uid: previousUser.uid, email: previousUser.email } : null,
        newUser: firebaseUser ? { uid: firebaseUser.uid, email: firebaseUser.email } : null,
        wasLoggedOut,
        wasLoggedIn,
        hasTokenClient: !!tokenClient,
        isGoogleCalendarAuthed,
        timestamp: new Date().toISOString()
      });
      
      setUser(firebaseUser);
      setLoading(false);
      
      // Auto-connect Google Calendar when user logs in
      // Try silent refresh first (no popup), only show popup if needed
      if (wasLoggedOut && firebaseUser && tokenClient && !isGoogleCalendarAuthed) {
        console.log('🔍 [AuthProvider] User just logged in, preparing auto-connect Calendar...', {
          hasFirebaseUser: !!firebaseUser,
          hasTokenClient: !!tokenClient,
          isGoogleCalendarAuthed,
          willAttemptIn: '1500ms'
        });
        
        // Small delay to ensure everything is ready
        setTimeout(() => {
          try {
            console.log('🔄 [AuthProvider] Attempting silent Google Calendar connection after login...', {
              tokenClientExists: !!tokenClient,
              prompt: 'none',
              timestamp: new Date().toISOString()
            });
            // Try silent refresh first (no popup - won't be blocked)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            tokenClient.requestAccessToken({ prompt: 'none' });
            
            // If silent refresh fails, we'll show a message to user to click "Kết nối" button
            // We don't auto-open popup because browser will block it (no user interaction)
          } catch (calendarError) {
            console.warn('⚠️ [AuthProvider] Silent Calendar connection failed (user can connect manually):', {
              error: calendarError,
              timestamp: new Date().toISOString()
            });
            // Don't show error - user can click "Kết nối" button if needed
          }
        }, 1500);
      } else if (wasLoggedOut && firebaseUser) {
        console.log('🔍 [AuthProvider] User logged in but conditions not met for auto-connect:', {
          hasTokenClient: !!tokenClient,
          isGoogleCalendarAuthed,
          reason: !tokenClient ? 'No tokenClient' : isGoogleCalendarAuthed ? 'Already connected' : 'Unknown'
        });
      }
    });

    return () => {
      console.log('🔍 [AuthProvider] Cleaning up Firebase auth state listener');
      unsubscribe();
    };
  }, [user, tokenClient, isGoogleCalendarAuthed]);

  // Initialize Google Calendar API
  useEffect(() => {
    if (typeof window === 'undefined') return;

    console.log('🔍 [AuthProvider] Initializing Google Calendar API...', {
      hasClientId: !!GOOGLE_CLIENT_ID,
      hasApiKey: !!GOOGLE_API_KEY,
      clientIdPrefix: GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID.substring(0, 20) + '...' : 'MISSING',
      apiKeyPrefix: GOOGLE_API_KEY ? GOOGLE_API_KEY.substring(0, 10) + '...' : 'MISSING',
      timestamp: new Date().toISOString()
    });

    const initGoogleAPI = async () => {
      try {
        // Load Google Identity Services
        const gsiScript = document.createElement('script');
        gsiScript.src = 'https://accounts.google.com/gsi/client';
        gsiScript.async = true;
        document.body.appendChild(gsiScript);
        console.log('🔍 [AuthProvider] Loading Google Identity Services script...');

        // Load Google API
        const gapiScript = document.createElement('script');
        gapiScript.src = 'https://apis.google.com/js/api.js';
        gapiScript.async = true;
        
        gapiScript.onload = () => {
          console.log('🔍 [AuthProvider] Google API script loaded, initializing client...');
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          window.gapi?.load('client', async () => {
            try {
              console.log('🔍 [AuthProvider] Initializing gapi.client...', {
                apiKey: GOOGLE_API_KEY ? 'SET' : 'MISSING',
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
              });
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
              await window.gapi.client.init({
                apiKey: GOOGLE_API_KEY,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
              });
              console.log('✅ [AuthProvider] gapi.client initialized successfully');

              // Initialize token client first
              console.log('🔍 [AuthProvider] Creating token client...', {
                clientId: GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID.substring(0, 20) + '...' : 'MISSING',
                scope: GOOGLE_SCOPE
              });
              
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
              const tc = window.google?.accounts?.oauth2?.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: GOOGLE_SCOPE,
                callback: (response: { access_token?: string; expires_in?: number; error?: string }) => {
                  console.log('🔍 [AuthProvider] Token client callback triggered:', {
                    hasAccessToken: !!response.access_token,
                    error: response.error || null,
                    expiresIn: response.expires_in || null,
                    timestamp: new Date().toISOString()
                  });
                  
                  if (response.access_token) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                    window.gapi.client.setToken({ access_token: response.access_token });
                    console.log('🔍 [AuthProvider] Token set to gapi.client');
                    
                    // Save token to localStorage with expiration
                    // Google OAuth tokens typically expire in 1 hour (3600 seconds)
                    // But we'll use the actual expires_in from response, or default to 1 hour
                    const expiresIn = response.expires_in || 3600; // Default 1 hour
                    const expiresAt = Date.now() + (expiresIn * 1000);
                    const tokenData = {
                      access_token: response.access_token,
                      expires_at: expiresAt,
                      expires_in: expiresIn, // Store for reference
                      created_at: Date.now()
                    };
                    
                    console.log('🔍 [AuthProvider] Saving token to localStorage:', {
                      expiresAt: new Date(expiresAt).toISOString(),
                      expiresIn: expiresIn,
                      expiresInMinutes: Math.round(expiresIn / 60),
                      timestamp: new Date().toISOString()
                    });
                    
                    localStorage.setItem('google_calendar_token', JSON.stringify(tokenData));
                    // Mark that user has connected successfully for silent refresh
                    localStorage.setItem('google_calendar_was_connected', 'true');
                    
                    // IMPORTANT: Update state to reflect Calendar is connected
                    console.log('🔍 [AuthProvider] Setting isGoogleCalendarAuthed = true');
                    setIsGoogleCalendarAuthed(true);
                    console.log('✅ [AuthProvider] Google Calendar connected successfully');
                    
                    // Trigger storage event to notify other components (for cross-tab sync)
                    window.dispatchEvent(new StorageEvent('storage', {
                      key: 'google_calendar_token',
                      newValue: JSON.stringify(tokenData),
                      oldValue: null
                    }));
                    console.log('🔍 [AuthProvider] Storage event dispatched (for cross-tab sync)');
                    
                    // Trigger custom event for same-tab notification (storage events don't fire in same tab)
                    window.dispatchEvent(new CustomEvent('google_calendar_token_updated', {
                      detail: { tokenData }
                    }));
                    console.log('🔍 [AuthProvider] Custom event dispatched (for same-tab sync)');
                  } else if (response.error) {
                    // Handle different error types
                    console.log('🔍 [AuthProvider] Token client callback error:', {
                      error: response.error,
                      errorType: response.error === 'popup_closed_by_user' ? 'popup_closed' : 
                                 response.error === 'popup_blocked' ? 'popup_blocked' : 
                                 'other',
                      timestamp: new Date().toISOString()
                    });
                    
                    if (response.error === 'popup_closed_by_user' || response.error === 'popup_blocked') {
                      console.warn('⚠️ [AuthProvider] Calendar popup was blocked or closed. User can connect manually from sidebar.');
                      // Don't set to false - keep current state, user can retry manually
                    } else {
                      console.error('❌ [AuthProvider] Google Calendar connection error:', response.error);
                      setIsGoogleCalendarAuthed(false);
                    }
                  }
                }
              });
              
              console.log('✅ [AuthProvider] Token client created successfully');
              setTokenClient(tc);
              console.log('🔍 [AuthProvider] Token client state updated');

              // Check existing token from localStorage first
              console.log('🔍 [AuthProvider] Checking for saved token in localStorage...');
              const savedToken = localStorage.getItem('google_calendar_token');
              const wasConnected = localStorage.getItem('google_calendar_was_connected') === 'true';
              
              console.log('🔍 [AuthProvider] Token check results:', {
                hasSavedToken: !!savedToken,
                wasConnected,
                hasTokenClient: !!tc
              });
              
              if (savedToken) {
                try {
                  const tokenData = JSON.parse(savedToken);
                  const now = Date.now();
                  const expiresAt = tokenData.expires_at;
                  const isValid = expiresAt && now < expiresAt;
                  const timeUntilExpiry = expiresAt ? expiresAt - now : 0;
                  
                  console.log('🔍 [AuthProvider] Saved token details:', {
                    hasExpiresAt: !!expiresAt,
                    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
                    now: new Date(now).toISOString(),
                    isValid,
                    timeUntilExpiry: timeUntilExpiry > 0 ? Math.round(timeUntilExpiry / 1000 / 60) + ' minutes' : 'expired',
                    timestamp: new Date().toISOString()
                  });
                  
                  // Check if token is still valid (not expired)
                  if (isValid) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                    window.gapi.client.setToken({ access_token: tokenData.access_token });
                    setIsGoogleCalendarAuthed(true);
                    console.log('✅ [AuthProvider] Restored valid Google Calendar token from localStorage');
                  } else {
                    // Token expired, try silent refresh if user was previously connected
                    console.log('🔍 [AuthProvider] Token expired, checking if should attempt silent refresh...', {
                      wasConnected,
                      hasTokenClient: !!tc
                    });
                    
                    if (wasConnected && tc) {
                      console.log('🔄 [AuthProvider] Token expired, attempting silent refresh...', {
                        prompt: 'none',
                        timestamp: new Date().toISOString()
                      });
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                      tc.requestAccessToken({ prompt: 'none' });
                    } else {
                      console.log('🔍 [AuthProvider] Removing expired token (no silent refresh)', {
                        wasConnected,
                        hasTokenClient: !!tc
                      });
                      // Remove expired token
                      localStorage.removeItem('google_calendar_token');
                    }
                  }
                } catch (error) {
                  console.error('❌ [AuthProvider] Error parsing saved token:', error);
                  localStorage.removeItem('google_calendar_token');
                }
              } else {
                // No saved token, try silent refresh if user was previously connected
                console.log('🔍 [AuthProvider] No saved token, checking if should attempt silent refresh...', {
                  wasConnected,
                  hasTokenClient: !!tc
                });
                
                if (wasConnected && tc) {
                  console.log('🔄 [AuthProvider] No saved token, attempting silent refresh...', {
                    prompt: 'none',
                    timestamp: new Date().toISOString()
                  });
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                  tc.requestAccessToken({ prompt: 'none' });
                } else {
                  console.log('🔍 [AuthProvider] No saved token and no silent refresh attempt', {
                    wasConnected,
                    hasTokenClient: !!tc,
                    reason: !wasConnected ? 'User never connected before' : !tc ? 'No token client' : 'Unknown'
                  });
                }
              }

              // Also check current token from gapi
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
              const existingToken = window.gapi.client.getToken();
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              if (existingToken?.access_token) {
                console.log('🔍 [AuthProvider] Found existing token in gapi client');
                setIsGoogleCalendarAuthed(true);
                console.log('✅ [AuthProvider] Found existing token in gapi client');
              } else {
                console.log('🔍 [AuthProvider] No existing token in gapi client');
              }
            } catch (error) {
              console.error('❌ [AuthProvider] Error initializing Google API:', {
                error,
                errorMessage: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
              });
            }
          });
        };

        document.body.appendChild(gapiScript);
        console.log('🔍 [AuthProvider] Google API script added to DOM');

        return () => {
          console.log('🔍 [AuthProvider] Cleaning up Google API scripts');
          gsiScript.remove();
          gapiScript.remove();
        };
      } catch (error) {
        console.error('❌ [AuthProvider] Error loading Google scripts:', {
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
      }
    };

    void initGoogleAPI();
  }, []);

  // Auto-refresh token when it's about to expire and listen for storage changes
  useEffect(() => {
    console.log('🔍 [AuthProvider] Setting up token expiration checker...', {
      hasTokenClient: !!tokenClient,
      timestamp: new Date().toISOString()
    });
    
    const checkTokenExpiration = () => {
      const savedToken = localStorage.getItem('google_calendar_token');
      console.log('🔍 [AuthProvider] Checking token expiration...', {
        hasSavedToken: !!savedToken,
        timestamp: new Date().toISOString()
      });
      
      if (savedToken) {
        try {
          const tokenData = JSON.parse(savedToken);
          const timeUntilExpiry = tokenData.expires_at - Date.now();
          const minutesUntilExpiry = Math.round(timeUntilExpiry / 1000 / 60);
          
          console.log('🔍 [AuthProvider] Token expiration check:', {
            expiresAt: new Date(tokenData.expires_at).toISOString(),
            timeUntilExpiry: minutesUntilExpiry + ' minutes',
            isExpiringSoon: timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0,
            isExpired: timeUntilExpiry <= 0,
            isValid: timeUntilExpiry > 5 * 60 * 1000
          });
          
          // If token expires in less than 5 minutes, just mark as not authenticated
          // Let useGoogleCalendar handle the refresh automatically
          if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
            console.log('🔍 [AuthProvider] Token expiring soon, setting isGoogleCalendarAuthed = false');
            setIsGoogleCalendarAuthed(false);
          } else if (timeUntilExpiry <= 0) {
            // Token expired
            console.log('🔍 [AuthProvider] Token expired, removing and setting isGoogleCalendarAuthed = false');
            localStorage.removeItem('google_calendar_token');
            setIsGoogleCalendarAuthed(false);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            window.gapi?.client?.setToken(null);
          } else {
            // Token is still valid
            console.log('🔍 [AuthProvider] Token still valid, setting isGoogleCalendarAuthed = true');
            setIsGoogleCalendarAuthed(true);
          }
        } catch (error) {
          console.error('❌ [AuthProvider] Error checking token expiration:', {
            error,
            errorMessage: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          });
          localStorage.removeItem('google_calendar_token');
          setIsGoogleCalendarAuthed(false);
        }
      } else {
        // No token in localStorage
        console.log('🔍 [AuthProvider] No saved token, setting isGoogleCalendarAuthed = false');
        setIsGoogleCalendarAuthed(false);
      }
    };

    // Listen for localStorage changes from other components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'google_calendar_token') {
        console.log('🔍 [AuthProvider] Storage event received (cross-tab sync):', {
          hasNewValue: !!e.newValue,
          hasOldValue: !!e.oldValue,
          timestamp: new Date().toISOString()
        });
        
        if (e.newValue) {
          // Token was added or modified
          try {
            const tokenData = JSON.parse(e.newValue);
            const timeUntilExpiry = tokenData.expires_at - Date.now();
            
            console.log('🔍 [AuthProvider] Processing storage event token:', {
              expiresAt: new Date(tokenData.expires_at).toISOString(),
              timeUntilExpiry: Math.round(timeUntilExpiry / 1000 / 60) + ' minutes',
              isValid: timeUntilExpiry > 0
            });
            
            if (timeUntilExpiry > 0) {
              setIsGoogleCalendarAuthed(true);
              // Restore token to gapi client
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
              window.gapi?.client?.setToken({ access_token: tokenData.access_token });
              console.log('✅ [AuthProvider] Token restored from storage event');
            } else {
              console.log('🔍 [AuthProvider] Token from storage event is expired');
              setIsGoogleCalendarAuthed(false);
            }
          } catch (error) {
            console.error('❌ [AuthProvider] Error parsing token from storage change:', {
              error,
              errorMessage: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString()
            });
            setIsGoogleCalendarAuthed(false);
          }
        } else {
          // Token was removed
          console.log('🔍 [AuthProvider] Token removed in storage event, setting isGoogleCalendarAuthed = false');
          setIsGoogleCalendarAuthed(false);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          window.gapi?.client?.setToken(null);
        }
      }
    };

    // Check every minute
    console.log('🔍 [AuthProvider] Starting token expiration checker (every 60 seconds)');
    const interval = setInterval(checkTokenExpiration, 60000);
    
    // Also check immediately
    console.log('🔍 [AuthProvider] Running initial token expiration check');
    checkTokenExpiration();

    // Listen for storage changes
    console.log('🔍 [AuthProvider] Adding storage event listener');
    window.addEventListener('storage', handleStorageChange);

    return () => {
      console.log('🔍 [AuthProvider] Cleaning up token expiration checker');
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [tokenClient]);

  // Sign in with Google (Firebase + Calendar)
  const signInWithGoogle = async () => {
    console.log('🔍 [AuthProvider] signInWithGoogle called', {
      currentUser: user ? { uid: user.uid, email: user.email } : null,
      hasTokenClient: !!tokenClient,
      isGoogleCalendarAuthed,
      timestamp: new Date().toISOString()
    });
    
    try {
      // First, sign in with Firebase
      // Auto-connect Calendar will be handled by onAuthStateChanged listener
      console.log('🔍 [AuthProvider] Calling signInWithPopup...');
      await signInWithPopup(auth, googleProvider);
      console.log('✅ [AuthProvider] signInWithPopup completed successfully');
    } catch (error) {
      console.error('❌ [AuthProvider] Error signing in with Google:', {
        error,
        errorCode: (error as { code?: string })?.code,
        errorMessage: (error as { message?: string })?.message || (error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString()
      });
      
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
    console.log('🔍 [AuthProvider] signInWithGoogleCalendar called', {
      hasTokenClient: !!tokenClient,
      currentUser: user ? { uid: user.uid, email: user.email } : null,
      isGoogleCalendarAuthed,
      timestamp: new Date().toISOString()
    });
    
    if (!tokenClient) {
      console.error('❌ [AuthProvider] signInWithGoogleCalendar failed: No token client', {
        timestamp: new Date().toISOString()
      });
      throw new Error('Google Calendar authentication not ready. Please wait and try again.');
    }
    
    try {
      console.log('🔍 [AuthProvider] Requesting access token with consent prompt...', {
        prompt: 'consent',
        hasTokenClient: !!tokenClient,
        timestamp: new Date().toISOString()
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      tokenClient.requestAccessToken({ prompt: 'consent' });
      console.log('🔍 [AuthProvider] Access token request sent (waiting for callback)...');
    } catch (error) {
      console.error('❌ [AuthProvider] Error signing in with Google Calendar:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      throw new Error('Failed to authenticate with Google Calendar');
    }
  }, [tokenClient, user, isGoogleCalendarAuthed]);

  // Sign out (both Firebase and Google Calendar)
  const signOut = async () => {
    console.log('🔍 [AuthProvider] signOut called', {
      currentUser: user ? { uid: user.uid, email: user.email } : null,
      isGoogleCalendarAuthed,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Sign out from Firebase
      console.log('🔍 [AuthProvider] Signing out from Firebase...');
      await firebaseSignOut(auth);
      console.log('✅ [AuthProvider] Firebase sign out completed');
      
      // Sign out from Google Calendar
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const token = window.gapi?.client?.getToken();
        console.log('🔍 [AuthProvider] Checking for Google Calendar token...', {
          hasToken: !!token,
          timestamp: new Date().toISOString()
        });
        
        if (token) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          window.gapi.client.setToken(null);
          setIsGoogleCalendarAuthed(false);
          console.log('🔍 [AuthProvider] Google Calendar token cleared from gapi.client');
        }
        
        // Remove token from localStorage
        const hadToken = !!localStorage.getItem('google_calendar_token');
        localStorage.removeItem('google_calendar_token');
        localStorage.removeItem('google_calendar_was_connected');
        console.log('🔍 [AuthProvider] Google Calendar token removed from localStorage', {
          hadToken,
          timestamp: new Date().toISOString()
        });
        
        // Trigger storage event to notify other components
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'google_calendar_token',
          newValue: null,
          oldValue: null
        }));
        console.log('🔍 [AuthProvider] Storage event dispatched (token removed)');
        
        console.log('✅ [AuthProvider] Google Calendar sign out completed');
      } catch (calendarError) {
        console.error('❌ [AuthProvider] Error signing out from Google Calendar:', {
          error: calendarError,
          errorMessage: calendarError instanceof Error ? calendarError.message : String(calendarError),
          timestamp: new Date().toISOString()
        });
        // Don't throw here, Firebase signout is more important
      }
      
      console.log('✅ [AuthProvider] signOut completed successfully');
    } catch (error) {
      console.error('❌ [AuthProvider] Error signing out:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
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
