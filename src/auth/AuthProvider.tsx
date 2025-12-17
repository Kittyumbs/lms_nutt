import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, setPersistence, browserLocalPersistence, inMemoryPersistence } from 'firebase/auth';
import React, { createContext, useEffect, useState, useCallback, useRef } from 'react';

import { auth, googleProvider } from '../lib/firebase';

// Extend Window interface for Google APIs
declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; expires_in?: number; error?: string }) => void;
          }) => any;
        };
      };
    };
    gapi?: {
      load: (module: string, callback: () => Promise<void>) => void;
      client?: {
        init: (config: {
          apiKey: string;
          discoveryDocs: string[];
        }) => Promise<void>;
        setToken: (token: { access_token: string }) => void;
        getToken: () => { access_token?: string } | null;
      };
    };
  }
}

import type { User} from 'firebase/auth';
import type { ReactNode } from 'react';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isGoogleCalendarAuthed: boolean;
  signInWithGoogle: () => Promise<any>;
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

  // 🚨 CRITICAL: Ensure persistence is set before any auth operations
  const [persistenceReady, setPersistenceReady] = useState(false);

  // Debug: Log state changes (only when user or auth state changes significantly)
  useEffect(() => {
    // Only log when user state changes (login/logout), not on every minor state update
    if (user !== null || loading === false) {
      console.log('🔍 [AuthProvider] State changed:', {
        user: user ? { uid: user.uid, email: user.email, displayName: user.displayName } : null,
        loading,
        isGoogleCalendarAuthed,
        hasTokenClient: !!tokenClient,
        timestamp: new Date().toISOString()
      });
    }
  }, [user, loading]); // Removed isGoogleCalendarAuthed and tokenClient to reduce noise

  // Session Debug Chi Tiết
  useEffect(() => {
    console.log('🔍 [AuthProvider] Checking for existing auth session...');

    // Kiểm tra chi tiết Firebase session trong localStorage
    const checkFirebaseSession = () => {
      const firebaseKeys = Object.keys(localStorage).filter(key =>
        key.includes('firebase') || key.includes('auth')
      );

      console.log('🔍 [AuthProvider] Detailed Firebase session check:', {
        totalKeys: firebaseKeys.length,
        keys: firebaseKeys,
        hasFirebaseAuthKey: firebaseKeys.some(key => key.includes('auth')),

        timestamp: new Date().toISOString()
      });

      // Kiểm tra từng key Firebase quan trọng
      firebaseKeys.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          if (value && value.length > 50) { // Chỉ log nếu có dữ liệu
            console.log(`🔍 [AuthProvider] ${key}:`, {
              length: value.length,
              hasData: true,
              preview: value.substring(0, 100) + '...'
            });
          }
        } catch (e) {
          console.log(`🔍 [AuthProvider] ${key}: [cannot parse]`);
        }
      });
    };

    checkFirebaseSession();
  }, []);

  // Auto-refresh Detection
  useEffect(() => {
    // Detect page refresh
    const handleBeforeUnload = () => {
      console.log('🔄 [PRODUCTION-DEBUG] Page refreshing/closing', {
        user: user ? { email: user.email } : null,
        timestamp: new Date().toISOString()
      });
    };

    // Detect visibility change (tab switch) - removed excessive logging
    const handleVisibilityChange = () => {
      // Only log if there's an actual issue or for debugging specific problems
      // Removed to reduce console noise
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Domain Validation for Production
  useEffect(() => {
    // 🚨 DOMAIN VALIDATION: Đảm bảo domain khớp với Firebase config
    const validateDomainConfiguration = () => {
      const currentHost = window.location.hostname;
      const isProduction = currentHost.includes('vercel.app');

      console.log('🔍 [AUTH-DOMAIN] Domain validation:', {
        currentHost,
        isProduction,
        expectedAuthDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        timestamp: new Date().toISOString()
      });

      if (isProduction) {
        // Kiểm tra xem authDomain có khớp với production domain không
        const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
        if (authDomain && !authDomain.includes('firebaseapp.com')) {
          console.error('❌ [AUTH-DOMAIN] Invalid authDomain for production:', authDomain);
        }
      }
    };

    validateDomainConfiguration();
  }, []);

  // 🚨 CRITICAL: Setup persistence first, then auth listeners
  useEffect(() => {
    const ensurePersistenceSet = async () => {
      console.log('🔍 [AuthProvider] Ensuring persistence is set before auth listeners...');

      try {
        // Ensure persistence is set - if it fails, fallback to inMemoryPersistence
        await setPersistence(auth, browserLocalPersistence);
        console.log('✅ [AuthProvider] Persistence verified/ensured in AuthProvider - using localStorage');
      } catch (error) {
        console.error('❌ [AuthProvider] Persistence set failed in AuthProvider:', error);
        try {
          await setPersistence(auth, inMemoryPersistence);
          console.log('🔄 [AuthProvider] Fallback persistence set - using inMemory (session only)');
        } catch (fallbackError) {
          console.error('❌ [AuthProvider] Fallback persistence also failed:', fallbackError);
        }
      }

      setPersistenceReady(true);
    };

    ensurePersistenceSet();
  }, []);

  // 🚨 Only setup auth state listener after persistence is ready
  useEffect(() => {
    if (!persistenceReady) {
      console.log('🔍 [AuthProvider] Waiting for persistence setup...');
      return;
    }

    console.log('🔍 [AuthProvider] Setting up Firebase auth state listener');

    // 🚨 Setup auth state listener với detailed logging
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        console.log('🔍 [AuthProvider] Firebase auth state changed - DETAILED:', {
          hasUser: !!firebaseUser,
          userEmail: firebaseUser?.email,
          userUid: firebaseUser?.uid,
          isAnonymous: firebaseUser?.isAnonymous,
          providerData: firebaseUser?.providerData?.length,
          metadata: firebaseUser?.metadata ? {
            creationTime: firebaseUser.metadata.creationTime,
            lastSignInTime: firebaseUser.metadata.lastSignInTime
          } : null,
          timestamp: new Date().toISOString()
        });

        // 🚨 QUAN TRỌNG: Chỉ cập nhật user nếu thực sự có thay đổi
        // Nếu firebaseUser là null nhưng user hiện tại vẫn tồn tại, có thể đang refresh token
        // Chỉ set null nếu thực sự không có user trong auth.currentUser
        if (!firebaseUser && user) {
          // Kiểm tra lại auth.currentUser sau một khoảng thời gian ngắn
          // để tránh reset user khi token đang được refresh
          setTimeout(() => {
            const currentUser = auth.currentUser;
            if (currentUser) {
              console.log('🔄 [AuthProvider] User still exists after null event, likely token refresh');
              setUser(currentUser);
              return;
            }
          }, 100);
        }

        // 🚨 LUÔN tin tưởng Firebase user state
        setUser(firebaseUser);
        setLoading(false);

        if (firebaseUser) {
          console.log('✅ [AuthProvider] User authenticated successfully');

          // 🚨 Debug thêm về user object
          console.log('🔍 [AuthProvider] User object details:', {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            providerId: firebaseUser.providerId,
            refreshToken: firebaseUser.refreshToken ? '[exists]' : null
          });

          // Simplified Calendar connection - only if conditions met
          if (tokenClient && !isGoogleCalendarAuthed) {
            console.log('🔄 [AuthProvider] Checking for existing Calendar token...');
            const savedToken = localStorage.getItem('google_calendar_token');
            if (savedToken) {
              try {
                const tokenData = JSON.parse(savedToken);
                if (tokenData.expires_at && Date.now() < tokenData.expires_at) {
                  console.log('🔄 [AuthProvider] Restoring valid Calendar token...');
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                  tokenClient.requestAccessToken({ prompt: 'none' });
                }
              } catch (error) {
                console.warn('⚠️ [AuthProvider] Error restoring Calendar token:', error);
              }
            }
          }
        } else {
          console.log('🔍 [AuthProvider] No user found in Firebase Auth');

          // 🚨 Kiểm tra lại localStorage ngay lập tức
          setTimeout(() => {
            const firebaseKeys = Object.keys(localStorage).filter(key =>
              key.includes('firebase') || key.includes('auth')
            );
            console.log('🔍 [AuthProvider] Post-auth-check localStorage:', {
              hasFirebaseKeys: firebaseKeys.length > 0,
              keys: firebaseKeys
            });
          }, 1000);
        }
      },
      (error) => {
        // 🚨 QUAN TRỌNG: Xử lý lỗi mà KHÔNG reset user
        const firebaseError = error as { code?: string } & Error;
        console.error('❌ [AuthProvider] Auth state listener error:', {
          error: firebaseError.message,
          code: firebaseError.code,
          timestamp: new Date().toISOString()
        });
        // KHÔNG set user = null khi có lỗi, giữ nguyên state hiện tại
        setLoading(false);
      }
    );

    return () => {
      console.log('🔍 [AuthProvider] Cleaning up auth listener');
      unsubscribe();
    };
  }, [persistenceReady]); // Wait for persistence to be ready

  // 🚨 REMOVED: Manual token refresh logic - Firebase handles this automatically

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
                // No saved token - DON'T try silent refresh because it will fail
                // Silent refresh only works if there's a valid session/token to refresh
                // If no token exists, user needs to explicitly grant consent again
                console.log('🔍 [AuthProvider] No saved token - skipping silent refresh', {
                  wasConnected,
                  hasTokenClient: !!tc,
                  reason: 'Silent refresh requires an existing valid token/session. User needs to grant consent explicitly.',
                  timestamp: new Date().toISOString()
                });
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

  // Track last token state to avoid excessive logging
  const lastTokenStateRef = useRef<{ hasToken: boolean; isValid: boolean } | null>(null);

  // Auto-refresh token when it's about to expire and listen for storage changes
  useEffect(() => {
    if (!tokenClient) return;

    console.log('🔍 [AuthProvider] Setting up token expiration checker...', {
      hasTokenClient: !!tokenClient,
      timestamp: new Date().toISOString()
    });

    const checkTokenExpiration = () => {
      const savedToken = localStorage.getItem('google_calendar_token');
      const hasToken = !!savedToken;
      let isValid = false;
      let shouldLog = false;

      if (savedToken) {
        try {
          const tokenData = JSON.parse(savedToken);
          const timeUntilExpiry = tokenData.expires_at - Date.now();
          const minutesUntilExpiry = Math.round(timeUntilExpiry / 1000 / 60);
          isValid = timeUntilExpiry > 5 * 60 * 1000;

          // Only log if state changed or if there's an issue
          const currentState = { hasToken: true, isValid };
          const lastState = lastTokenStateRef.current;
          if (!lastState ||
              lastState.hasToken !== currentState.hasToken ||
              lastState.isValid !== currentState.isValid) {
            shouldLog = true;
            lastTokenStateRef.current = currentState;
          }

          if (shouldLog) {
            console.log('🔍 [AuthProvider] Token expiration check:', {
              expiresAt: new Date(tokenData.expires_at).toISOString(),
              timeUntilExpiry: minutesUntilExpiry + ' minutes',
              isExpiringSoon: timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0,
              isExpired: timeUntilExpiry <= 0,
              isValid: timeUntilExpiry > 5 * 60 * 1000
            });
          }

          // 🚨 CRITICAL: Proactively refresh token if expiring within 10 minutes
          if (timeUntilExpiry < 10 * 60 * 1000 && timeUntilExpiry > 0) {
            console.log('🔄 [AuthProvider] Token expiring soon, attempting proactive refresh...', {
              timeUntilExpiry: Math.round(timeUntilExpiry / 1000 / 60) + ' minutes',
              timestamp: new Date().toISOString()
            });

            // Try silent refresh
            if (tokenClient) {
              try {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                tokenClient.requestAccessToken({ prompt: 'none' });
                console.log('🔄 [AuthProvider] Proactive token refresh initiated');
              } catch (refreshError) {
                console.error('❌ [AuthProvider] Proactive token refresh failed:', refreshError);
                setIsGoogleCalendarAuthed(false);
              }
            } else {
              console.warn('⚠️ [AuthProvider] Token expiring but no token client available');
              setIsGoogleCalendarAuthed(false);
            }
          } else if (timeUntilExpiry <= 0) {
            // Token expired
            if (shouldLog) {
              console.log('🔍 [AuthProvider] Token expired, removing and setting isGoogleCalendarAuthed = false');
            }
            localStorage.removeItem('google_calendar_token');
            setIsGoogleCalendarAuthed(false);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            window.gapi?.client?.setToken(null);
          } else {
            // Token is still valid
            if (shouldLog) {
              console.log('🔍 [AuthProvider] Token still valid, setting isGoogleCalendarAuthed = true');
            }
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
          lastTokenStateRef.current = { hasToken: false, isValid: false };
        }
      } else {
        // No token in localStorage - only log if state changed from having token to not having token
        const currentState = { hasToken: false, isValid: false };
        const lastState = lastTokenStateRef.current;

        // Only update state if it changed
        if (!lastState || lastState.hasToken !== currentState.hasToken) {
          // Only log when transitioning from having token to not having token
          // Don't log if we never had a token (user hasn't connected Calendar yet)
          if (lastState?.hasToken) {
            console.log('🔍 [AuthProvider] Token removed, setting isGoogleCalendarAuthed = false');
          }
          lastTokenStateRef.current = currentState;
        }
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

    // Check every 5 minutes (reduced from 60 seconds to reduce noise)
    // Only check more frequently if token is about to expire
    console.log('🔍 [AuthProvider] Starting token expiration checker (every 5 minutes)');

    // Initial check
    console.log('🔍 [AuthProvider] Running initial token expiration check');
    checkTokenExpiration();

    // Check every 5 minutes (300000ms) instead of every minute
    const interval = setInterval(checkTokenExpiration, 300000);

    // Listen for storage changes
    console.log('🔍 [AuthProvider] Adding storage event listener');
    window.addEventListener('storage', handleStorageChange);

    return () => {
      console.log('🔍 [AuthProvider] Cleaning up token expiration checker');
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [tokenClient]);

  // 🚨 CRITICAL: Session restoration on page refresh with forced token refresh
  useEffect(() => {
    console.log('🔍 [AuthProvider] Initializing aggressive session restoration...');

    // Force Firebase to check for existing session and refresh tokens if needed
    const restoreSession = async () => {
      try {
        // Wait for Firebase auth to initialize and get current user
        const currentUser = await new Promise<User | null>((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe(); // Only run once
            resolve(user);
          });
        });

        if (currentUser) {
          console.log('🔍 [AuthProvider] Found existing user, checking token validity...');

          try {
            // Get current token and check if it's close to expiry
            const tokenResult = await currentUser.getIdTokenResult();
            const timeUntilExpiry = new Date(tokenResult.expirationTime).getTime() - Date.now();
            const minutesUntilExpiry = Math.round(timeUntilExpiry / 1000 / 60);

            console.log('🔍 [AuthProvider] Existing token expiry check:', {
              expiresAt: new Date(tokenResult.expirationTime).toISOString(),
              timeUntilExpiry: minutesUntilExpiry + ' minutes',
              needsRefresh: timeUntilExpiry < 30 * 60 * 1000 // Less than 30 minutes
            });

            // Force refresh if token expires within 30 minutes
            if (timeUntilExpiry < 30 * 60 * 1000) {
              console.log('🔄 [AuthProvider] Token expires soon, forcing refresh on app startup...');
              await currentUser.getIdToken(true);
              console.log('✅ [AuthProvider] Token refreshed successfully on app startup');
            } else {
              console.log('✅ [AuthProvider] Existing token is still valid');
            }
          } catch (tokenError) {
            console.error('❌ [AuthProvider] Error checking token on startup:', tokenError);
          }
        } else {
          console.log('🔍 [AuthProvider] No existing user session found');
        }

        console.log('✅ [AuthProvider] Session restoration check completed');
      } catch (error) {
        console.error('❌ [AuthProvider] Session restoration failed:', error);
      }
    };

    restoreSession();
  }, []);

  // 🚨 CRITICAL: Add Firebase token auto-refresh with more frequent checks
  useEffect(() => {
    if (!user) return;

    console.log('🔍 [AuthProvider] Setting up Firebase token auto-refresh for user:', {
      email: user.email,
      uid: user.uid,
      timestamp: new Date().toISOString()
    });

    const refreshFirebaseToken = async () => {
      try {
        // Get current token first to check if it needs refresh
        const currentToken = await user.getIdToken(false);
        const tokenResult = await user.getIdTokenResult();

        console.log('🔍 [AuthProvider] Current token info:', {
          expiresAt: new Date(tokenResult.expirationTime).toISOString(),
          timeUntilExpiry: Math.round((new Date(tokenResult.expirationTime).getTime() - Date.now()) / 1000 / 60) + ' minutes',
          issuedAt: new Date(tokenResult.issuedAtTime).toISOString(),
          timestamp: new Date().toISOString()
        });

        // Force refresh if token expires within 15 minutes
        const timeUntilExpiry = new Date(tokenResult.expirationTime).getTime() - Date.now();
        if (timeUntilExpiry < 15 * 60 * 1000) {
          console.log('🔄 [AuthProvider] Token expiring soon, forcing refresh...');
          const newToken = await user.getIdToken(true);
          console.log('✅ [AuthProvider] Firebase ID token refreshed successfully', {
            tokenLength: newToken.length,
            timestamp: new Date().toISOString()
          });
          return newToken;
        } else {
          console.log('✅ [AuthProvider] Firebase token still valid');
          return currentToken;
        }
      } catch (error) {
        console.error('❌ [AuthProvider] Failed to refresh Firebase ID token:', {
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
        throw error;
      }
    };

    // Check token every 10 minutes (more frequent to catch expiry issues)
    const tokenRefreshInterval = setInterval(async () => {
      try {
        await refreshFirebaseToken();
      } catch (error) {
        console.warn('⚠️ [AuthProvider] Firebase token refresh failed, user may need to re-authenticate');
      }
    }, 10 * 60 * 1000); // 10 minutes

    // Initial token check
    refreshFirebaseToken().catch((error) => {
      console.warn('⚠️ [AuthProvider] Initial Firebase token check failed:', error);
    });

    return () => {
      console.log('🔍 [AuthProvider] Cleaning up Firebase token refresh interval');
      clearInterval(tokenRefreshInterval);
    };
  }, [user]);

  // 🚨 SIMPLIFIED: Sign in with Google (persistence is handled globally)
  const signInWithGoogle = async () => {
    console.log('🔍 [AuthProvider] signInWithGoogle called');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log('✅ [AuthProvider] Google sign in successful');

      // Firebase auth state listener will handle the user state update automatically
      return result;
    } catch (error) {
      console.error('❌ [AuthProvider] Google sign in failed:', error);
      throw error;
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
      // Don't use 'consent' prompt - it forces user to re-consent every time
      // Without prompt (undefined), Google will reuse existing consent if available
      // If no consent exists, it will show the consent screen automatically
      // This allows seamless reconnection without asking for permission again
      console.log('🔍 [AuthProvider] Requesting access token (will reuse existing consent if available)...', {
        prompt: 'undefined (Google will auto-decide: reuse consent if available, show consent if needed)',
        hasTokenClient: !!tokenClient,
        timestamp: new Date().toISOString()
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      tokenClient.requestAccessToken(); // No prompt = Google will reuse consent if available, otherwise show consent
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
