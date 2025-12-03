import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import React, { createContext, useEffect, useState, useCallback } from 'react';

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

    // Detect visibility change (tab switch)
    const handleVisibilityChange = () => {
      console.log('👀 [PRODUCTION-DEBUG] Tab visibility changed', {
        hidden: document.hidden,
        user: user ? { email: user.email } : null,
        timestamp: new Date().toISOString()
      });
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

  // Production Session Recovery
  useEffect(() => {
    // 🚨 PRODUCTION FIX: Session Recovery Mechanism
    const attemptSessionRecovery = () => {
      if (!user && !loading) {
        console.log('🔄 [AuthProvider] Attempting session recovery...');

        // Phương pháp 1: Kiểm tra auth.currentUser trực tiếp
        const currentUser = auth.currentUser;
        if (currentUser) {
          console.log('✅ [AuthProvider] Session recovered via auth.currentUser');
          setUser(currentUser);
          return;
        }

        // Phương pháp 2: Kiểm tra localStorage keys
        const hasFirebaseKeys = Object.keys(localStorage).some(key =>
          key.startsWith('firebase:authUser:')
        );

        if (hasFirebaseKeys) {
          console.log('🔍 [AuthProvider] Firebase auth keys found but no user - forcing auth refresh');
          // Try to trigger auth state change by forcing a token refresh if we have a user
          if (currentUser) {
            void (currentUser as any).getIdToken(true).catch(() => {
              // Ignore errors, just trying to trigger auth state
            });
          } else {
            console.log('🔍 [AuthProvider] No current user found for token refresh');
          }
        }
      }
    };

    // Thử recovery sau 2 giây và 5 giây
    setTimeout(attemptSessionRecovery, 2000);
    setTimeout(attemptSessionRecovery, 5000);
  }, [user, loading]);

  // Emergency Production Hotfix
  useEffect(() => {
    // 🚨 EMERGENCY FIX: Manual session restoration for production
    const manualSessionRestoration = () => {
      if (!user && !loading) {
        console.log('🔄 [AUTH-EMERGENCY] Manual session restoration triggered');

        // Phương pháp 1: Direct auth check
        const currentUser = auth.currentUser;
        if (currentUser) {
          console.log('✅ [AUTH-EMERGENCY] User found via auth.currentUser');
          setUser(currentUser);
          return;
        }

        // Phương pháp 2: Check for specific Firebase keys
        const firebaseAuthKey = Object.keys(localStorage).find(key =>
          key.startsWith('firebase:authUser:')
        );

        if (firebaseAuthKey) {
          console.log('🔍 [AUTH-EMERGENCY] Firebase auth key found:', firebaseAuthKey);
          try {
            const authData = JSON.parse(localStorage.getItem(firebaseAuthKey) || '{}');
            if (authData.uid) {
              console.log('🔄 [AUTH-EMERGENCY] Attempting to restore session from localStorage');
              // Trigger auth state change bằng cách reload
              window.location.reload();
            }
          } catch (e) {
            console.error('❌ [AUTH-EMERGENCY] Error parsing auth data:', e);
          }
        }
      }
    };

    // Chạy sau 3 giây
    const timer = setTimeout(manualSessionRestoration, 3000);
    return () => clearTimeout(timer);
  }, [user, loading]);

  // 🚨 FIXED: Listen for auth state changes with proper persistence handling
  useEffect(() => {
    console.log('🔍 [AuthProvider] Setting up Firebase auth with persistence check');

    const initializeAuth = async () => {
      try {
        // 🚨 ĐẢM BẢO persistence được set trước khi listen
        console.log('🔍 [AuthProvider] Setting persistence...');
        await setPersistence(auth, browserLocalPersistence);
        console.log('✅ [AuthProvider] Persistence confirmed');

        // 🚨 Kiểm tra current user NGAY LẬP TỨC
        const immediateUser = auth.currentUser;
        console.log('🔍 [AuthProvider] Immediate currentUser:', {
          hasUser: !!immediateUser,
          userEmail: immediateUser?.email,
          timestamp: new Date().toISOString()
        });

        if (immediateUser) {
          console.log('✅ [AuthProvider] User found in immediate check');
          setUser(immediateUser);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('❌ [AuthProvider] Persistence setup error:', error);
      }
    };

    // Chạy persistence setup
    void initializeAuth();

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
  }, []); // � Empty dependencies

  // 🚨 FIX: Auto-refresh Firebase ID token before expiration (every 50 minutes)
  useEffect(() => {
    if (!user) return;

    console.log('🔍 [AuthProvider] Setting up Firebase ID token auto-refresh...');

    const refreshToken = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.log('🔍 [AuthProvider] No current user for token refresh');
          return;
        }

        console.log('🔄 [AuthProvider] Refreshing Firebase ID token...', {
          userEmail: currentUser.email,
          timestamp: new Date().toISOString()
        });

        // Use getIdToken() without force - Firebase will auto-refresh if needed
        // Only force refresh if token is actually expired or about to expire
        const token = await currentUser.getIdToken();
        console.log('✅ [AuthProvider] Firebase ID token retrieved/refreshed successfully', {
          tokenLength: token.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        const firebaseError = error as { code?: string } & Error;
        const errorCode = firebaseError.code;
        
        // Don't log as error for certain Firebase errors that are expected
        if (errorCode === 'auth/token-service-api-has-not-been-used-in-project') {
          console.warn('⚠️ [AuthProvider] Token service API not enabled yet - Firebase will handle this automatically', {
            timestamp: new Date().toISOString()
          });
          // This error usually means the project needs time to propagate, or Firebase will handle it automatically
          return;
        }

        console.error('❌ [AuthProvider] Error refreshing Firebase ID token:', {
          error: firebaseError.message,
          code: errorCode,
          timestamp: new Date().toISOString()
        });
        
        // Don't retry - Firebase SDK will handle token refresh automatically when needed
        // Forcing refresh can cause issues if the project isn't fully set up yet
      }
    };

    // Refresh token every 50 minutes (3000 seconds)
    // Firebase ID tokens expire after 1 hour, so refresh at 50 minutes to be safe
    // Don't refresh immediately - wait at least 5 minutes after login to avoid issues
    const initialDelay = 5 * 60 * 1000; // 5 minutes
    const refreshInterval = 50 * 60 * 1000; // 50 minutes

    console.log('🔍 [AuthProvider] Token refresh scheduled:', {
      initialDelay: `${initialDelay / 1000 / 60} minutes`,
      refreshInterval: `${refreshInterval / 1000 / 60} minutes`,
      timestamp: new Date().toISOString()
    });

    // Start refreshing after initial delay (to avoid refreshing right after login)
    const initialTimeout = setTimeout(() => {
      void refreshToken();
    }, initialDelay);

    // Then refresh every 50 minutes
    const refreshIntervalId = setInterval(refreshToken, refreshInterval);

    return () => {
      console.log('🔍 [AuthProvider] Cleaning up token refresh interval');
      clearTimeout(initialTimeout);
      clearInterval(refreshIntervalId);
    };
  }, [user]);

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

  // 🚨 ENHANCED Sign in with Google - Session Verification
  const signInWithGoogle = async () => {
    console.log('🔍 [AuthProvider] signInWithGoogle - ENHANCED SESSION VERIFICATION');

    try {
      // 🚨 Bước 1: Đảm bảo persistence
      console.log('🔧 [AuthProvider] Step 1: Setting persistence...');
      await setPersistence(auth, browserLocalPersistence);

      // 🚨 Bước 2: Sign in
      console.log('🔧 [AuthProvider] Step 2: Calling signInWithPopup...');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('✅ [AuthProvider] Step 2: Sign in successful');

      // 🚨 Bước 3: Verify session được lưu
      console.log('🔧 [AuthProvider] Step 3: Verifying session storage...');

      // Kiểm tra multiple ways
      const verificationChecks = {
        authCurrentUser: !!auth.currentUser,
        resultUser: !!result.user,
        localStorageKeys: Object.keys(localStorage).filter(key =>
          key.includes('firebase') || key.includes('auth')
        ).length
      };

      console.log('🔍 [AuthProvider] Session verification:', verificationChecks);

      if (!verificationChecks.authCurrentUser) {
        console.error('❌ [AuthProvider] auth.currentUser is null after sign in!');
      }

      if (verificationChecks.localStorageKeys === 0) {
        console.error('❌ [AuthProvider] No Firebase keys in localStorage after sign in!');
      }

      // 🚨 Bước 4: Force update state
      setUser(result.user);
      console.log('✅ [AuthProvider] Step 4: User state updated');

      // 🚨 Bước 5: Additional verification after delay
      setTimeout(() => {
        const finalCheck = {
          finalCurrentUser: !!auth.currentUser,
          finalLocalStorage: Object.keys(localStorage).filter(key =>
            key.includes('firebase') || key.includes('auth')
          ).length
        };
        console.log('🔍 [AuthProvider] Final session verification:', finalCheck);
      }, 1000);

      return result;

    } catch (error) {
      console.error('❌ [AuthProvider] Enhanced sign in failed:', {
        error: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
        timestamp: new Date().toISOString()
      });
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