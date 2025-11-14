/// <reference types="gapi" />
/// <reference types="gapi.client" />
/// <reference types="gapi.client.calendar" />
import { message } from "antd";
import { useCallback, useEffect, useState } from "react";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID as string;
const API_KEY = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY as string;
const DISCOVERY = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPE     = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile";

// Token refresh interval (check every 10 minutes for better reliability)
const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000;
const TOKEN_EXPIRY_BUFFER = 10 * 60 * 1000; // 10 minutes buffer for more safety
const TOKEN_LIFETIME = 24 * 60 * 60 * 1000; // 24 hours

type GEvent = gapi.client.calendar.Event;

interface TokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void;
  callback?: (resp: { access_token?: string; error?: string }) => void;
}

interface UserProfile {
  email: string;
  name: string;
  picture: string;
}

export function useGoogleCalendar() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isGapiLoaded, setIsGapiLoaded] = useState(false);
  const [tokenClient, setTokenClient] = useState<TokenClient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);

  // Debug: Log state changes
  useEffect(() => {
    console.log('🔍 [useGoogleCalendar] State changed:', {
      isSignedIn,
      isGapiLoaded,
      hasTokenClient: !!tokenClient,
      hasError: !!error,
      isAuthLoading,
      hasUserProfile: !!userProfile,
      hasRefreshInterval: !!refreshInterval,
      timestamp: new Date().toISOString()
    });
  }, [isSignedIn, isGapiLoaded, tokenClient, error, isAuthLoading, userProfile, refreshInterval]);

  // Check if token is expired or about to expire
  const isTokenExpired = useCallback((tokenData: any) => {
    if (!tokenData || !tokenData.expires_at) return true;
    const timeUntilExpiry = tokenData.expires_at - Date.now();
    return timeUntilExpiry < TOKEN_EXPIRY_BUFFER; // Expired or expires within 10 minutes
  }, []);

  // Check if token is valid (not expired)
  const isTokenValid = useCallback((tokenData: any) => {
    if (!tokenData || !tokenData.expires_at) return false;
    const timeUntilExpiry = tokenData.expires_at - Date.now();
    return timeUntilExpiry > 0;
  }, []);

  // Refresh token by requesting a new one
  const refreshToken = useCallback(async () => {
    console.log('🔍 [useGoogleCalendar] refreshToken called', {
      hasTokenClient: !!tokenClient,
      timestamp: new Date().toISOString()
    });
    
    if (!tokenClient) {
      console.warn('⚠️ [useGoogleCalendar] refreshToken failed: No token client');
      return false;
    }
    
    try {
      console.log('🔄 [useGoogleCalendar] Refreshing Google Calendar token...', {
        prompt: 'none',
        timestamp: new Date().toISOString()
      });
      
      return new Promise<boolean>((resolve) => {
        // Set up a one-time listener for the callback
        const originalCallback = tokenClient.callback;
        
        tokenClient.callback = (resp: { access_token?: string; error?: string }) => {
          console.log('🔍 [useGoogleCalendar] Token refresh callback triggered:', {
            hasAccessToken: !!resp?.access_token,
            error: resp?.error || null,
            timestamp: new Date().toISOString()
          });
          
          // Restore original callback
          tokenClient.callback = originalCallback;
          
          if (resp?.access_token) {
            console.log('✅ [useGoogleCalendar] Token refreshed successfully');
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            window.gapi.client.setToken({ access_token: resp.access_token });
            
            // Save new token to localStorage
            const tokenData = {
              access_token: resp.access_token,
              expires_at: Date.now() + TOKEN_LIFETIME // 24 hours from now
            };
            
            console.log('🔍 [useGoogleCalendar] Saving refreshed token to localStorage:', {
              expiresAt: new Date(tokenData.expires_at).toISOString(),
              timestamp: new Date().toISOString()
            });
            
            localStorage.setItem('google_calendar_token', JSON.stringify(tokenData));
            
            // Trigger storage event to notify other components
            window.dispatchEvent(new StorageEvent('storage', {
              key: 'google_calendar_token',
              newValue: JSON.stringify(tokenData)
            }));
            
            console.log('🔍 [useGoogleCalendar] Storage event dispatched (token refreshed)');
            resolve(true);
          } else {
            console.log('❌ [useGoogleCalendar] Token refresh failed:', {
              error: resp?.error,
              timestamp: new Date().toISOString()
            });
            resolve(false);
          }
        };
        
        console.log('🔍 [useGoogleCalendar] Requesting access token (prompt: none)...');
        tokenClient.requestAccessToken({ prompt: 'none' });
        
        // Set a timeout to resolve if no response
        setTimeout(() => {
          console.log('⏰ [useGoogleCalendar] Token refresh timeout (15s)');
          tokenClient.callback = originalCallback; // Restore original callback
          resolve(false);
        }, 15000); // 15 second timeout
      });
    } catch (error) {
      console.error('❌ [useGoogleCalendar] Error refreshing token:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }, [tokenClient]);

  // Sign out function (defined early to avoid circular dependency)
  const signOut = useCallback(() => {
    console.log('🔍 [useGoogleCalendar] signOut called', {
      hasRefreshInterval: !!refreshInterval,
      timestamp: new Date().toISOString()
    });
    
    try {
      console.log('🚪 [useGoogleCalendar] Signing out from Google Calendar...');
      
      // Stop token refresh interval
      if (refreshInterval) {
        console.log('🔍 [useGoogleCalendar] Stopping token refresh interval');
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
      
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const currentToken = window.gapi?.client?.getToken();
      
      console.log('🔍 [useGoogleCalendar] Checking for current token:', {
        hasToken: !!currentToken,
        timestamp: new Date().toISOString()
      });
      
      if (currentToken) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        window.gapi.client.setToken(null);
        setIsSignedIn(false);
        setUserProfile(null);
        setError(null);
        console.log('🔍 [useGoogleCalendar] Cleared gapi token and state');
        
        // Remove token from localStorage
        const hadToken = !!localStorage.getItem('google_calendar_token');
        localStorage.removeItem('google_calendar_token');
        localStorage.removeItem('google_calendar_was_connected');
        console.log('🔍 [useGoogleCalendar] Removed token from localStorage', {
          hadToken,
          timestamp: new Date().toISOString()
        });
        
        // Trigger storage event to notify other components
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'google_calendar_token',
          newValue: null,
          oldValue: null
        }));
        console.log('🔍 [useGoogleCalendar] Storage event dispatched (token removed)');

        // Trigger custom event for synchronization
        window.dispatchEvent(new CustomEvent('gapi_auth_signout'));
        console.log('🔍 [useGoogleCalendar] Custom event dispatched (gapi_auth_signout)');

        console.log('✅ [useGoogleCalendar] Successfully signed out from Google Calendar');
        void message.success("Successfully signed out from Google account.");
      } else {
        console.log('🔍 [useGoogleCalendar] No current token, clearing state only');
        setIsSignedIn(false);
        setUserProfile(null);
        setError(null);
        
        // Also remove from localStorage even if no current token
        const hadToken = !!localStorage.getItem('google_calendar_token');
        localStorage.removeItem('google_calendar_token');
        localStorage.removeItem('google_calendar_was_connected');
        console.log('🔍 [useGoogleCalendar] Removed token from localStorage', {
          hadToken,
          timestamp: new Date().toISOString()
        });
        
        // Trigger storage event to notify other components
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'google_calendar_token',
          newValue: null,
          oldValue: null
        }));
        console.log('🔍 [useGoogleCalendar] Storage event dispatched (token removed)');
        
        console.log('✅ [useGoogleCalendar] Cleared Google Calendar state');
        void message.info("You are not signed in to Google.");
      }
    } catch (error) {
      console.error('❌ [useGoogleCalendar] Error during sign out:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      // Force reset state even if there's an error
      setIsSignedIn(false);
      setUserProfile(null);
      setError(null);
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [refreshInterval]);

  // Start token refresh interval
  const startTokenRefresh = useCallback(() => {
    console.log('🔍 [useGoogleCalendar] startTokenRefresh called', {
      hasExistingInterval: !!refreshInterval,
      timestamp: new Date().toISOString()
    });
    
    if (refreshInterval) {
      console.log('🔍 [useGoogleCalendar] Clearing existing refresh interval');
      clearInterval(refreshInterval);
    }
    
    console.log('🔍 [useGoogleCalendar] Starting new token refresh interval', {
      interval: TOKEN_REFRESH_INTERVAL / 1000 / 60 + ' minutes',
      timestamp: new Date().toISOString()
    });
    
    const interval = setInterval(async () => {
      console.log('🔍 [useGoogleCalendar] Token refresh interval tick...');
      const savedToken = localStorage.getItem('google_calendar_token');
      
      if (savedToken) {
        try {
          const tokenData = JSON.parse(savedToken);
          const timeUntilExpiry = tokenData.expires_at - Date.now();
          const minutesUntilExpiry = Math.floor(timeUntilExpiry / (60 * 1000));
          const isValid = isTokenValid(tokenData);
          const isExpired = isTokenExpired(tokenData);
          
          console.log('🔍 [useGoogleCalendar] Token refresh check:', {
            isValid,
            isExpired,
            timeUntilExpiry: minutesUntilExpiry + ' minutes',
            expiresAt: new Date(tokenData.expires_at).toISOString(),
            timestamp: new Date().toISOString()
          });
          
          // If token is valid, continue
          if (isValid) {
            // If token expires in less than 10 minutes, refresh it proactively
            if (timeUntilExpiry < TOKEN_EXPIRY_BUFFER && timeUntilExpiry > 0) {
              console.log(`🔄 [useGoogleCalendar] Token expires in ${minutesUntilExpiry} minutes, refreshing proactively...`);
              const success = await refreshToken();
              if (!success) {
                console.log('❌ [useGoogleCalendar] Proactive token refresh failed, will retry later');
              }
            } else {
              console.log('🔍 [useGoogleCalendar] Token still valid, no refresh needed');
            }
          } else if (isExpired) {
            console.log('🔄 [useGoogleCalendar] Token expired, attempting refresh...');
            const success = await refreshToken();
            if (!success) {
              console.log('❌ [useGoogleCalendar] Token refresh failed, signing out');
              signOut();
            }
          }
        } catch (error) {
          console.error('❌ [useGoogleCalendar] Error checking token expiry:', {
            error,
            errorMessage: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          });
          // If there's an error parsing token, remove it and sign out
          localStorage.removeItem('google_calendar_token');
          signOut();
        }
      } else {
        console.log('🔍 [useGoogleCalendar] No saved token in refresh interval');
      }
    }, TOKEN_REFRESH_INTERVAL);
    
    setRefreshInterval(interval);
    console.log('✅ [useGoogleCalendar] Token refresh interval started');
  }, [refreshInterval, isTokenValid, isTokenExpired, refreshToken, signOut]);

  // Stop token refresh interval
  const stopTokenRefresh = useCallback(() => {
    console.log('🔍 [useGoogleCalendar] stopTokenRefresh called', {
      hasInterval: !!refreshInterval,
      timestamp: new Date().toISOString()
    });
    
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
      console.log('✅ [useGoogleCalendar] Token refresh interval stopped');
    }
  }, [refreshInterval]);

  // Load GIS + gapi scripts in browser only
  useEffect(() => {
    console.log('🔍 [useGoogleCalendar] useEffect triggered (initialization)');
    
    if (typeof window === "undefined") {
      console.log('🔍 [useGoogleCalendar] Skipping initialization (server-side)');
      return;
    }

    // Validate environment variables
    console.log('🔍 [useGoogleCalendar] Validating environment variables...', {
      hasClientId: !!CLIENT_ID,
      hasApiKey: !!API_KEY,
      clientIdPrefix: CLIENT_ID ? CLIENT_ID.substring(0, 20) + '...' : 'MISSING',
      apiKeyPrefix: API_KEY ? API_KEY.substring(0, 10) + '...' : 'MISSING',
      timestamp: new Date().toISOString()
    });
    
    if (!CLIENT_ID || !API_KEY) {
      const missing = [];
      if (!CLIENT_ID) missing.push('VITE_GOOGLE_CALENDAR_CLIENT_ID');
      if (!API_KEY) missing.push('VITE_GOOGLE_CALENDAR_API_KEY');
      console.error('❌ [useGoogleCalendar] Missing environment variables:', {
        missing,
        timestamp: new Date().toISOString()
      });
      setError(`Missing environment variables: ${missing.join(', ')}`);
      setIsAuthLoading(false);
      return;
    }

    console.log('🔧 [useGoogleCalendar] Initializing Google API with:', {
      hasClientId: !!CLIENT_ID,
      hasApiKey: !!API_KEY,
      clientIdPrefix: CLIENT_ID?.substring(0, 20) + '...',
      apiKeyPrefix: API_KEY?.substring(0, 10) + '...',
      timestamp: new Date().toISOString()
    });

    setIsAuthLoading(true); // Start authentication loading
    console.log('🔍 [useGoogleCalendar] Set isAuthLoading = true');

    const gsi = document.createElement("script");
    gsi.src = "https://accounts.google.com/gsi/client";
    gsi.async = true;

    const api = document.createElement("script");
    api.src = "https://apis.google.com/js/api.js";
    api.async = true;

    api.onload = () => {
      console.log('🔍 [useGoogleCalendar] Google API script loaded');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      window.gapi.load("client:auth2", async () => {
        try {
          console.log('📡 [useGoogleCalendar] Initializing gapi.client with API key...', {
            apiKey: API_KEY ? 'SET' : 'MISSING',
            discoveryDocs: DISCOVERY,
            timestamp: new Date().toISOString()
          });
          
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          await window.gapi.client.init({ apiKey: API_KEY, discoveryDocs: DISCOVERY });
          console.log('✅ [useGoogleCalendar] gapi.client initialized successfully');
          
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          await window.gapi.client.load("calendar", "v3");
          console.log('✅ [useGoogleCalendar] Calendar API loaded successfully');
          setIsGapiLoaded(true);
          console.log('🔍 [useGoogleCalendar] Set isGapiLoaded = true');

          // Check for existing token in localStorage first
          console.log('🔍 [useGoogleCalendar] Checking for saved token in localStorage...');
          const savedToken = localStorage.getItem('google_calendar_token');
          
          console.log('🔍 [useGoogleCalendar] Token check results:', {
            hasSavedToken: !!savedToken,
            timestamp: new Date().toISOString()
          });
          
          if (savedToken) {
            try {
              const tokenData = JSON.parse(savedToken);
              const isValid = isTokenValid(tokenData);
              const timeUntilExpiry = tokenData.expires_at ? tokenData.expires_at - Date.now() : 0;
              
              console.log('🔍 [useGoogleCalendar] Saved token details:', {
                hasExpiresAt: !!tokenData.expires_at,
                expiresAt: tokenData.expires_at ? new Date(tokenData.expires_at).toISOString() : null,
                isValid,
                timeUntilExpiry: timeUntilExpiry > 0 ? Math.round(timeUntilExpiry / 1000 / 60) + ' minutes' : 'expired',
                timestamp: new Date().toISOString()
              });
              
              // If token is still valid, restore it
              if (isValid) {
                console.log('✅ [useGoogleCalendar] Restoring valid token from localStorage');
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                window.gapi.client.setToken({ access_token: tokenData.access_token });
                setIsSignedIn(true);
                console.log('🔍 [useGoogleCalendar] Set isSignedIn = true');
                
                // Start token refresh interval
                console.log('🔍 [useGoogleCalendar] Starting token refresh interval');
                startTokenRefresh();
              } else {
                console.log('❌ [useGoogleCalendar] Token expired or invalid, removing from localStorage', {
                  expiresAt: tokenData.expires_at ? new Date(tokenData.expires_at).toISOString() : null,
                  now: new Date().toISOString(),
                  timestamp: new Date().toISOString()
                });
                localStorage.removeItem('google_calendar_token');
              }
            } catch (error) {
              console.error('❌ [useGoogleCalendar] Error parsing saved token:', {
                error,
                errorMessage: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
              });
              localStorage.removeItem('google_calendar_token');
            }
          } else {
            // Check for existing token in gapi client
            console.log('🔍 [useGoogleCalendar] No saved token, checking gapi client...');
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            const existingToken = window.gapi.client.getToken();
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (existingToken?.access_token) {
              console.log('✅ [useGoogleCalendar] Found existing token in gapi client');
              setIsSignedIn(true);
              console.log('🔍 [useGoogleCalendar] Set isSignedIn = true');
              console.log('🔍 [useGoogleCalendar] Starting token refresh interval');
              startTokenRefresh();
            } else {
              console.log('🔍 [useGoogleCalendar] No existing token in gapi client');
            }
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          console.log('🔍 [useGoogleCalendar] Creating token client...', {
            clientId: CLIENT_ID ? CLIENT_ID.substring(0, 20) + '...' : 'MISSING',
            scope: SCOPE,
            timestamp: new Date().toISOString()
          });
          
          const tc = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPE,
            callback: (resp: { access_token?: string; error?: string }) => {
              console.log('🔍 [useGoogleCalendar] Token client callback triggered:', {
                hasAccessToken: !!resp?.access_token,
                error: resp?.error || null,
                timestamp: new Date().toISOString()
              });
              
              if (resp?.access_token) {
                console.log('✅ [useGoogleCalendar] Google Calendar authentication successful');
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                window.gapi.client.setToken({ access_token: resp.access_token });
                setIsSignedIn(true);
                setError(null);
                console.log('🔍 [useGoogleCalendar] Set isSignedIn = true, error = null');
                
                // Save token to localStorage for persistence
                // Google OAuth access tokens typically expire in 1 hour (3600 seconds)
                // Use actual expires_in from response if available, otherwise default to 1 hour
                const expiresIn = 3600; // 1 hour in seconds (Google OAuth standard)
                const tokenData = {
                  access_token: resp.access_token,
                  expires_at: Date.now() + (expiresIn * 1000), // 1 hour from now
                  expires_in: expiresIn,
                  created_at: Date.now()
                };
                
                console.log('🔍 [useGoogleCalendar] Saving token to localStorage:', {
                  expiresAt: new Date(tokenData.expires_at).toISOString(),
                  expiresIn: expiresIn,
                  expiresInMinutes: Math.round(expiresIn / 60),
                  timestamp: new Date().toISOString()
                });
                
                localStorage.setItem('google_calendar_token', JSON.stringify(tokenData));
                // Mark that user previously connected successfully
                localStorage.setItem('google_calendar_was_connected', 'true');
                console.log('🔍 [useGoogleCalendar] Token saved, was_connected flag set');
                
                // Start token refresh interval
                console.log('🔍 [useGoogleCalendar] Starting token refresh interval');
                startTokenRefresh();
                
                // Trigger storage event to notify other components
                window.dispatchEvent(new StorageEvent('storage', {
                  key: 'google_calendar_token',
                  newValue: JSON.stringify(tokenData),
                  oldValue: null
                }));
                console.log('🔍 [useGoogleCalendar] Storage event dispatched');
              } else {
                console.error('❌ [useGoogleCalendar] Google Calendar authentication failed:', {
                  error: resp?.error,
                  timestamp: new Date().toISOString()
                });
                setError(resp?.error || "No access token from Google");
              }
            },
          });
          
          console.log('✅ [useGoogleCalendar] Token client created successfully');
          setTokenClient(tc as TokenClient);
          console.log('🔍 [useGoogleCalendar] Token client state updated');

          // Attempt silent token fetch if user connected before and no valid token is present
          try {
            const wasConnected = localStorage.getItem('google_calendar_was_connected') === 'true';
            const hasCurrentToken = !!window.gapi.client.getToken()?.access_token;
            const saved = localStorage.getItem('google_calendar_token');
            const savedValid = (() => {
              try {
                if (!saved) return false;
                const data = JSON.parse(saved);
                return !isTokenExpired(data);
              } catch { return false; }
            })();

            console.log('🔍 [useGoogleCalendar] Checking if should attempt silent token request:', {
              wasConnected,
              hasCurrentToken,
              hasSavedToken: !!saved,
              savedValid,
              shouldAttempt: wasConnected && !hasCurrentToken && !savedValid,
              timestamp: new Date().toISOString()
            });

            if (wasConnected && !hasCurrentToken && !savedValid) {
              console.log('🔐 [useGoogleCalendar] Attempting silent Google token request (prompt: none)', {
                prompt: 'none',
                timestamp: new Date().toISOString()
              });
              (tc as TokenClient).requestAccessToken({ prompt: 'none' });
            } else {
              console.log('🔍 [useGoogleCalendar] Silent token request not needed:', {
                wasConnected,
                hasCurrentToken,
                savedValid,
                reason: !wasConnected ? 'User never connected' : hasCurrentToken ? 'Already has token' : savedValid ? 'Saved token valid' : 'Unknown'
              });
            }
          } catch (e) {
            console.warn('⚠️ [useGoogleCalendar] Silent token attempt failed to start:', {
              error: e,
              errorMessage: e instanceof Error ? e.message : String(e),
              timestamp: new Date().toISOString()
            });
          }
        } catch (e) {
          console.error('❌ [useGoogleCalendar] Error initializing Google API:', {
            error: e,
            errorMessage: e instanceof Error ? e.message : String(e),
            timestamp: new Date().toISOString()
          });
          
          // Extract detailed error information
          let errorMessage = "Failed to init Google API client";
          let errorDetails = {};
          
          if (e instanceof Error) {
            errorMessage = e.message;
            errorDetails = { message: e.message, stack: e.stack };
          } else if (typeof e === 'object' && e !== null) {
            // Google API errors often have specific structure
            errorDetails = e;
            const errorObj = e as Record<string, unknown>;
            if ('error' in errorObj && errorObj.error && typeof errorObj.error === 'object') {
              const err = errorObj.error as Record<string, unknown>;
              errorMessage = (err.message as string) || (err.error_description as string) || JSON.stringify(err);
            } else if ('message' in errorObj) {
              errorMessage = String(errorObj.message);
            }
          }
          
          console.error('❌ [useGoogleCalendar] Error details:', {
            errorMessage,
            errorDetails,
            apiKey: API_KEY ? `${API_KEY.substring(0, 10)}...` : 'MISSING',
            clientId: CLIENT_ID ? `${CLIENT_ID.substring(0, 20)}...` : 'MISSING',
            discoveryDocs: DISCOVERY,
            timestamp: new Date().toISOString()
          });
          
          setError(`Google API Error: ${errorMessage}. Check console for details.`);
        } finally {
          console.log('🔍 [useGoogleCalendar] Setting isAuthLoading = false');
          setIsAuthLoading(false);
        }
      });
    };
    api.onerror = () => {
      const errorMsg = "Failed to load Google API script";
      console.error("❌ [useGoogleCalendar] Failed to load Google API script.", {
        timestamp: new Date().toISOString()
      });
      setError(errorMsg);
      setIsAuthLoading(false); // Authentication loading is complete even on error
      console.log('🔍 [useGoogleCalendar] Set isAuthLoading = false (script load error)');
    };

    document.body.append(gsi, api);
    
    return () => {
      console.log('🔍 [useGoogleCalendar] Cleaning up initialization...');
      try {
        // Stop token refresh interval
        console.log('🔍 [useGoogleCalendar] Stopping token refresh interval');
        stopTokenRefresh();
        
        // Clean up scripts
        console.log('🔍 [useGoogleCalendar] Removing scripts from DOM');
        if (gsi.parentNode) gsi.remove();
        if (api.parentNode) api.remove();
        
        // Clean up global references if needed
        if (typeof window !== 'undefined') {
          // Clear any remaining intervals or timeouts
          setIsAuthLoading(false);
          setError(null);
          console.log('🔍 [useGoogleCalendar] Cleaned up global references');
        }
        console.log('✅ [useGoogleCalendar] Cleanup completed');
      } catch (error) {
        console.error('❌ [useGoogleCalendar] Error during script cleanup:', {
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
      }
    };
  }, []);

  // Simplified token status check - only on gapi load
  useEffect(() => {
    console.log('🔍 [useGoogleCalendar] Token status check effect triggered', {
      isGapiLoaded,
      timestamp: new Date().toISOString()
    });
    
    if (!isGapiLoaded) {
      console.log('🔍 [useGoogleCalendar] Skipping token status check (gapi not loaded)');
      return;
    }
    
    const checkTokenStatus = () => {
      console.log('🔍 [useGoogleCalendar] Checking token status...');
      try {
        // First check localStorage for saved token
        const savedToken = localStorage.getItem('google_calendar_token');
        console.log('🔍 [useGoogleCalendar] Token status check:', {
          hasSavedToken: !!savedToken,
          timestamp: new Date().toISOString()
        });
        
        if (savedToken) {
          try {
            const tokenData = JSON.parse(savedToken);
            const isValid = isTokenValid(tokenData);
            
            console.log('🔍 [useGoogleCalendar] Token status check - saved token:', {
              isValid,
              expiresAt: tokenData.expires_at ? new Date(tokenData.expires_at).toISOString() : null,
              timestamp: new Date().toISOString()
            });
            
            if (isValid) {
              // Token is still valid
              console.log('🔍 [useGoogleCalendar] Token status: Valid, setting isSignedIn = true');
              setIsSignedIn(true);
              setIsAuthLoading(false);
              return;
            } else {
              // Token expired, remove it
              console.log('🔍 [useGoogleCalendar] Token status: Expired, removing from localStorage');
              localStorage.removeItem('google_calendar_token');
            }
          } catch (error) {
            console.error('❌ [useGoogleCalendar] Error parsing saved token:', {
              error,
              errorMessage: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString()
            });
            localStorage.removeItem('google_calendar_token');
          }
        }
        
        // Fallback to gapi client token
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const currentToken = window.gapi?.client?.getToken();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const hasToken = !!currentToken?.access_token;
        
        console.log('🔍 [useGoogleCalendar] Token status check - gapi client:', {
          hasToken,
          timestamp: new Date().toISOString()
        });
        
        setIsSignedIn(hasToken);
        setIsAuthLoading(false);
        console.log('🔍 [useGoogleCalendar] Token status check completed', {
          isSignedIn: hasToken,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ [useGoogleCalendar] Error checking token status:', {
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
        setIsSignedIn(false);
        setIsAuthLoading(false);
      }
    };

    // Initial check only
    checkTokenStatus();
  }, [isGapiLoaded, isTokenValid]);

  // Window event for additional synchronization - with proper cleanup
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'google_calendar_token') {
        console.log('🔍 [useGoogleCalendar] Storage event received (cross-tab sync):', {
          hasNewValue: !!e.newValue,
          hasOldValue: !!e.oldValue,
          timestamp: new Date().toISOString()
        });
        
        // Token was added/removed/modified in localStorage
        const newToken = e.newValue;
        if (newToken) {
          try {
            const tokenData = JSON.parse(newToken);
            const isValid = isTokenValid(tokenData);
            
            console.log('🔍 [useGoogleCalendar] Processing storage event token:', {
              isValid,
              expiresAt: tokenData.expires_at ? new Date(tokenData.expires_at).toISOString() : null,
              timestamp: new Date().toISOString()
            });
            
            if (isValid) {
              console.log('🔍 [useGoogleCalendar] Storage event: Token valid, setting isSignedIn = true');
              setIsSignedIn(true);
              // Restore token to gapi client
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
              window.gapi?.client?.setToken({ access_token: tokenData.access_token });
              console.log('✅ [useGoogleCalendar] Token restored from storage event');
            } else {
              console.log('🔍 [useGoogleCalendar] Storage event: Token invalid, setting isSignedIn = false');
              setIsSignedIn(false);
              setUserProfile(null);
            }
          } catch (error) {
            console.error('❌ [useGoogleCalendar] Error parsing token from storage change:', {
              error,
              errorMessage: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString()
            });
            setIsSignedIn(false);
            setUserProfile(null);
          }
        } else {
          // Token was removed
          console.log('🔍 [useGoogleCalendar] Storage event: Token removed, setting isSignedIn = false');
          setIsSignedIn(false);
          setUserProfile(null);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          window.gapi?.client?.setToken(null);
        }
      }
    };

    const handleAuthStateChange = () => {
      console.log('🔍 [useGoogleCalendar] Auth state change event received');
      try {
        // First check localStorage
        const savedToken = localStorage.getItem('google_calendar_token');
        console.log('🔍 [useGoogleCalendar] Checking auth state:', {
          hasSavedToken: !!savedToken,
          timestamp: new Date().toISOString()
        });
        
        if (savedToken) {
          try {
            const tokenData = JSON.parse(savedToken);
            const isValid = isTokenValid(tokenData);
            
            console.log('🔍 [useGoogleCalendar] Auth state check - saved token:', {
              isValid,
              expiresAt: tokenData.expires_at ? new Date(tokenData.expires_at).toISOString() : null,
              timestamp: new Date().toISOString()
            });
            
            if (isTokenValid(tokenData)) {
              console.log('🔍 [useGoogleCalendar] Auth state: Token valid, setting isSignedIn = true');
              setIsSignedIn(true);
              return;
            } else {
              console.log('🔍 [useGoogleCalendar] Auth state: Token invalid, removing');
              localStorage.removeItem('google_calendar_token');
            }
          } catch (error) {
            console.error('❌ [useGoogleCalendar] Error parsing saved token:', {
              error,
              errorMessage: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString()
            });
            localStorage.removeItem('google_calendar_token');
          }
        }
        
        // Fallback to gapi client token
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const token = window.gapi?.client?.getToken();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const hasToken = !!token?.access_token;
        
        console.log('🔍 [useGoogleCalendar] Auth state: Checking gapi client token:', {
          hasToken,
          timestamp: new Date().toISOString()
        });
        
        setIsSignedIn(hasToken);
        if (!hasToken) {
          setUserProfile(null);
          console.log('🔍 [useGoogleCalendar] Auth state: No token, setting isSignedIn = false');
        } else {
          console.log('🔍 [useGoogleCalendar] Auth state: Found token in gapi client, setting isSignedIn = true');
        }
      } catch (error) {
        console.error('❌ [useGoogleCalendar] Error in auth state change handler:', {
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
        setIsSignedIn(false);
        setUserProfile(null);
      }
    };

    const handleSignOutEvent = () => {
      console.log('🔍 [useGoogleCalendar] Sign out event received');
      setIsSignedIn(false);
      setUserProfile(null);
      setError(null);
      console.log('🔍 [useGoogleCalendar] Set isSignedIn = false, cleared userProfile and error');
    };

    // Handle custom event for same-tab token updates (storage events don't fire in same tab)
    const handleTokenUpdate = (e: CustomEvent) => {
      console.log('🔍 [useGoogleCalendar] Custom event received (google_calendar_token_updated):', {
        hasTokenData: !!e.detail?.tokenData,
        timestamp: new Date().toISOString()
      });
      
      const tokenData = e.detail?.tokenData;
      if (tokenData) {
        const isValid = isTokenValid(tokenData);
        console.log('🔍 [useGoogleCalendar] Processing custom event token:', {
          isValid,
          expiresAt: tokenData.expires_at ? new Date(tokenData.expires_at).toISOString() : null,
          timestamp: new Date().toISOString()
        });
        
        if (isValid) {
          console.log('🔄 [useGoogleCalendar] Token updated via custom event, updating isSignedIn = true');
          setIsSignedIn(true);
          // Restore token to gapi client
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          window.gapi?.client?.setToken({ access_token: tokenData.access_token });
          console.log('✅ [useGoogleCalendar] Token restored from custom event');
        } else {
          console.log('🔍 [useGoogleCalendar] Token from custom event is invalid/expired');
        }
      } else {
        console.log('🔍 [useGoogleCalendar] Custom event has no token data');
      }
    };

    // Add event listeners with proper error handling
    console.log('🔍 [useGoogleCalendar] Adding event listeners...', {
      timestamp: new Date().toISOString()
    });
    
    try {
      window.addEventListener('storage', handleStorageChange, { passive: true });
      window.addEventListener('gapi_auth_changed', handleAuthStateChange as EventListener, { passive: true });
      window.addEventListener('gapi_auth_signout', handleSignOutEvent, { passive: true });
      window.addEventListener('google_calendar_token_updated', handleTokenUpdate as EventListener, { passive: true });
      console.log('✅ [useGoogleCalendar] Event listeners added successfully');
    } catch (error) {
      console.error('❌ [useGoogleCalendar] Error adding event listeners:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }

    return () => {
      console.log('🔍 [useGoogleCalendar] Cleaning up event listeners...');
      try {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('gapi_auth_changed', handleAuthStateChange as EventListener);
        window.removeEventListener('gapi_auth_signout', handleSignOutEvent);
        window.removeEventListener('google_calendar_token_updated', handleTokenUpdate as EventListener);
        console.log('✅ [useGoogleCalendar] Event listeners removed successfully');
      } catch (error) {
        console.error('❌ [useGoogleCalendar] Error removing event listeners:', {
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
      }
    };
  }, [isTokenValid]);

  const handleAuthClick = useCallback(() => {
    console.log('🚨 handleAuthClick called - this should NOT happen from calendar features!');
    if (!tokenClient) {
      setError("Authentication not ready. Please wait and try again.");
      return;
    }
    
    try {
      setError(null);
      console.log('🚨 About to call requestAccessToken from handleAuthClick');
      tokenClient.requestAccessToken({ prompt: "" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed";
      setError(errorMessage);
    }
  }, [tokenClient]);

  const ensureSignedIn = useCallback(async () => {
    console.log('🚨 ensureSignedIn called - this should NOT happen from calendar features!');
    // Always check for an existing token first.
    // First check localStorage
    const savedToken = localStorage.getItem('google_calendar_token');
    if (savedToken) {
      try {
        const tokenData = JSON.parse(savedToken);
        
        if (isTokenValid(tokenData)) {
          // Token is still valid, restore it
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          window.gapi.client.setToken({ access_token: tokenData.access_token });
          setIsSignedIn(true);
          return;
        } else {
          // Token expired, remove it
          localStorage.removeItem('google_calendar_token');
        }
      } catch (error) {
        console.error('Error parsing saved token:', error);
        localStorage.removeItem('google_calendar_token');
      }
    }
    
    // Fallback to gapi client token
    const existingToken = window.gapi?.client?.getToken();
    if (existingToken?.access_token) {
      setIsSignedIn(true);
      return;
    }

    // If not signed in and no existing token, proceed with authentication flow.
    if (!tokenClient) {
      await new Promise<void>(resolve => {
        const interval = setInterval(() => {
          if (tokenClient) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
      });
      if (!tokenClient) throw new Error("Auth not ready even after waiting");
    }

    // Request access token. The callback in useEffect will handle setting isSignedIn.
    console.log('🚨 About to call requestAccessToken from ensureSignedIn');
    tokenClient.requestAccessToken({ prompt: "" });

    // Wait for the isSignedIn state to become true, or for a token to appear.
    return new Promise<void>((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const currentToken = window.gapi?.client?.getToken();
        if (isSignedIn || currentToken?.access_token) {
          clearInterval(checkInterval);
          setIsSignedIn(true); // Ensure state is true if token is found
          resolve();
        }
      }, 100); // Check every 100ms
      // Add a timeout to prevent infinite waiting in case of an issue
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error("Authentication timed out."));
      }, 10000); // 10 seconds timeout
    });
  }, [isSignedIn, tokenClient, isTokenValid]);

  const fetchCalendarEvents = useCallback(async (): Promise<GEvent[]> => {
    console.log('🔍 fetchCalendarEvents called');
    if (!isGapiLoaded) {
      throw new Error("Google Calendar API not ready");
    }
    
    if (!isSignedIn) {
      console.log('🔍 Not signed in, throwing error');
      throw new Error("Not signed in to Google Calendar");
    }
    
    console.log('🔍 About to call gapi.client.calendar.events.list');
    try {
      const now = new Date().toISOString();
      
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const response = await window.gapi.client.calendar.events.list({
        calendarId: "primary",
        timeMin: now,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 50,
      });
      
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
      return response.result.items ?? [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch calendar events";
      throw new Error(errorMessage);
    }
  }, [isGapiLoaded, isSignedIn]);

  const createCalendarEvent = useCallback(async (event: GEvent) => {
    console.log('🔍 createCalendarEvent called');
    if (!isGapiLoaded) {
      throw new Error("Google Calendar API not ready");
    }
    
    if (!isSignedIn) {
      console.log('🔍 Not signed in, throwing error');
      throw new Error("Not signed in to Google Calendar");
    }
    
    console.log('🔍 About to call gapi.client.calendar.events.insert');
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const response = await window.gapi.client.calendar.events.insert({
        calendarId: "primary",
        sendUpdates: "all",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        resource: event as any,
      });
      
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
      return response.result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create calendar event";
      throw new Error(errorMessage);
    }
  }, [isGapiLoaded, isSignedIn]);

  const fetchUserProfile = useCallback(async () => {
    if (!isGapiLoaded) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const tokenData = window.gapi?.client?.getToken();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const token = tokenData?.access_token as string | undefined;
      
      if (!token) {
        console.error('No access token available for profile fetch');
        return;
      }

      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const userInfo = await response.json() as {
        email?: string;
        name?: string;
        picture?: string;
      };
      
      const email = userInfo.email || '';
      const name = userInfo.name || userInfo.email || 'Google User';
      const picture = userInfo.picture || '';

      setUserProfile({ email, name, picture });

    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      
      // Fallback to default profile
      setUserProfile({ email: '', name: 'Google Account', picture: '' });
    }
  }, [isGapiLoaded]);

  // Fetch user profile when sign in state changes
  useEffect(() => {
    if (isSignedIn && isGapiLoaded) {
      void fetchUserProfile().catch(console.error);
    } else {
      setUserProfile(null);
    }
  }, [isSignedIn, isGapiLoaded, fetchUserProfile]);


  return {
    isSignedIn,
    isGapiLoaded,
    error,
    handleAuthClick,
    fetchCalendarEvents,
    createCalendarEvent,
    signOut,
    isAuthLoading,
    userProfile
  };
}
