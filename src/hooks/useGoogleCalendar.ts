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
    if (!tokenClient) return false;
    
    try {
      console.log('🔄 Refreshing Google Calendar token...');
      return new Promise<boolean>((resolve) => {
        // Set up a one-time listener for the callback
        const originalCallback = tokenClient.callback;
        
        tokenClient.callback = (resp: { access_token?: string; error?: string }) => {
          // Restore original callback
          tokenClient.callback = originalCallback;
          
          if (resp?.access_token) {
            console.log('✅ Token refreshed successfully');
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            window.gapi.client.setToken({ access_token: resp.access_token });
            
            // Save new token to localStorage
            const tokenData = {
              access_token: resp.access_token,
              expires_at: Date.now() + TOKEN_LIFETIME // 24 hours from now
            };
            localStorage.setItem('google_calendar_token', JSON.stringify(tokenData));
            
            // Trigger storage event to notify other components
            window.dispatchEvent(new StorageEvent('storage', {
              key: 'google_calendar_token',
              newValue: JSON.stringify(tokenData)
            }));
            
            resolve(true);
          } else {
            console.log('❌ Token refresh failed:', resp?.error);
            resolve(false);
          }
        };
        
        tokenClient.requestAccessToken({ prompt: 'none' });
        
        // Set a timeout to resolve if no response
        setTimeout(() => {
          console.log('⏰ Token refresh timeout');
          tokenClient.callback = originalCallback; // Restore original callback
          resolve(false);
        }, 15000); // 15 second timeout
      });
    } catch (error) {
      console.error('❌ Error refreshing token:', error);
      return false;
    }
  }, [tokenClient]);

  // Sign out function (defined early to avoid circular dependency)
  const signOut = useCallback(() => {
    try {
      console.log('🚪 Signing out from Google Calendar...');
      
      // Stop token refresh interval
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
      
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const currentToken = window.gapi?.client?.getToken();
      
      if (currentToken) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        window.gapi.client.setToken(null);
        setIsSignedIn(false);
        setUserProfile(null);
        setError(null);
        
        // Remove token from localStorage
        localStorage.removeItem('google_calendar_token');
        
        // Trigger storage event to notify other components
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'google_calendar_token',
          newValue: null,
          oldValue: localStorage.getItem('google_calendar_token')
        }));

        // Trigger custom event for synchronization
        window.dispatchEvent(new CustomEvent('gapi_auth_signout'));

        console.log('✅ Successfully signed out from Google Calendar');
        void message.success("Successfully signed out from Google account.");
      } else {
        setIsSignedIn(false);
        setUserProfile(null);
        setError(null);
        
        // Also remove from localStorage even if no current token
        localStorage.removeItem('google_calendar_token');
        
        // Trigger storage event to notify other components
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'google_calendar_token',
          newValue: null,
          oldValue: localStorage.getItem('google_calendar_token')
        }));
        
        console.log('✅ Cleared Google Calendar state');
        void message.info("You are not signed in to Google.");
      }
    } catch (error) {
      console.error('❌ Error during sign out:', error);
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
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
    
    const interval = setInterval(async () => {
      const savedToken = localStorage.getItem('google_calendar_token');
      if (savedToken) {
        try {
          const tokenData = JSON.parse(savedToken);
          
          // If token is valid, continue
          if (isTokenValid(tokenData)) {
            const timeUntilExpiry = tokenData.expires_at - Date.now();
            const minutesUntilExpiry = Math.floor(timeUntilExpiry / (60 * 1000));
            
            // If token expires in less than 10 minutes, refresh it proactively
            if (timeUntilExpiry < TOKEN_EXPIRY_BUFFER && timeUntilExpiry > 0) {
              console.log(`🔄 Token expires in ${minutesUntilExpiry} minutes, refreshing proactively...`);
              const success = await refreshToken();
              if (!success) {
                console.log('❌ Proactive token refresh failed, will retry later');
              }
            }
          } else if (isTokenExpired(tokenData)) {
            console.log('🔄 Token expired, attempting refresh...');
            const success = await refreshToken();
            if (!success) {
              console.log('❌ Token refresh failed, signing out');
              signOut();
            }
          }
        } catch (error) {
          console.error('❌ Error checking token expiry:', error);
          // If there's an error parsing token, remove it and sign out
          localStorage.removeItem('google_calendar_token');
          signOut();
        }
      }
    }, TOKEN_REFRESH_INTERVAL);
    
    setRefreshInterval(interval);
  }, [refreshInterval, isTokenValid, isTokenExpired, refreshToken, signOut]);

  // Stop token refresh interval
  const stopTokenRefresh = useCallback(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [refreshInterval]);

  // Load GIS + gapi scripts in browser only
  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsAuthLoading(true); // Start authentication loading

    const gsi = document.createElement("script");
    gsi.src = "https://accounts.google.com/gsi/client";
    gsi.async = true;

    const api = document.createElement("script");
    api.src = "https://apis.google.com/js/api.js";
    api.async = true;

    api.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      window.gapi.load("client:auth2", async () => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          await window.gapi.client.init({ apiKey: API_KEY, discoveryDocs: DISCOVERY });
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          await window.gapi.client.load("calendar", "v3");
          setIsGapiLoaded(true);

          // Check for existing token in localStorage first
          const savedToken = localStorage.getItem('google_calendar_token');
          if (savedToken) {
            try {
              const tokenData = JSON.parse(savedToken);
              
              // If token is still valid, restore it
              if (isTokenValid(tokenData)) {
                console.log('✅ Restoring valid token from localStorage');
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                window.gapi.client.setToken({ access_token: tokenData.access_token });
                setIsSignedIn(true);
                
                // Start token refresh interval
                startTokenRefresh();
              } else {
                console.log('❌ Token expired or invalid, removing from localStorage');
                localStorage.removeItem('google_calendar_token');
              }
            } catch (error) {
              console.error('❌ Error parsing saved token:', error);
              localStorage.removeItem('google_calendar_token');
            }
          } else {
            // Check for existing token in gapi client
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            const existingToken = window.gapi.client.getToken();
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (existingToken?.access_token) {
              console.log('✅ Found existing token in gapi client');
              setIsSignedIn(true);
              startTokenRefresh();
            }
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          const tc = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPE,
            callback: (resp: { access_token?: string; error?: string }) => {
              if (resp?.access_token) {
                console.log('✅ Google Calendar authentication successful');
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                window.gapi.client.setToken({ access_token: resp.access_token });
                setIsSignedIn(true);
                setError(null);
                
                // Save token to localStorage for persistence
                const tokenData = {
                  access_token: resp.access_token,
                  expires_at: Date.now() + TOKEN_LIFETIME // 24 hours from now
                };
                localStorage.setItem('google_calendar_token', JSON.stringify(tokenData));
                // Mark that user previously connected successfully
                localStorage.setItem('google_calendar_was_connected', 'true');
                
                // Start token refresh interval
                startTokenRefresh();
                
                // Trigger storage event to notify other components
                window.dispatchEvent(new StorageEvent('storage', {
                  key: 'google_calendar_token',
                  newValue: JSON.stringify(tokenData),
                  oldValue: null
                }));
              } else {
                console.error('❌ Google Calendar authentication failed:', resp?.error);
                setError(resp?.error || "No access token from Google");
              }
            },
          });
          setTokenClient(tc as TokenClient);

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

            if (wasConnected && !hasCurrentToken && !savedValid) {
              console.log('🔐 Attempting silent Google token request (prompt: none)');
              (tc as TokenClient).requestAccessToken({ prompt: 'none' });
            }
          } catch (e) {
            console.warn('Silent token attempt failed to start:', e);
          }
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : "Failed to init Google API client";
          setError(errorMessage);
        } finally {
          setIsAuthLoading(false);
        }
      });
    };
    api.onerror = () => {
      setError("Failed to load Google API script");
      setIsAuthLoading(false); // Authentication loading is complete even on error
      console.error("useGoogleCalendar: Failed to load Google API script.");
    };

    document.body.append(gsi, api);
    
    return () => {
      try {
        // Stop token refresh interval
        stopTokenRefresh();
        
        // Clean up scripts
        if (gsi.parentNode) gsi.remove();
        if (api.parentNode) api.remove();
        
        // Clean up global references if needed
        if (typeof window !== 'undefined') {
          // Clear any remaining intervals or timeouts
          setIsAuthLoading(false);
          setError(null);
        }
      } catch (error) {
        console.error('Error during script cleanup:', error);
      }
    };
  }, []);

  // Simplified token status check - only on gapi load
  useEffect(() => {
    if (!isGapiLoaded) return;
    
    const checkTokenStatus = () => {
      try {
        // First check localStorage for saved token
        const savedToken = localStorage.getItem('google_calendar_token');
        if (savedToken) {
          try {
            const tokenData = JSON.parse(savedToken);
            
            if (isTokenValid(tokenData)) {
              // Token is still valid
              setIsSignedIn(true);
              setIsAuthLoading(false);
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const currentToken = window.gapi?.client?.getToken();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const hasToken = !!currentToken?.access_token;
        
        setIsSignedIn(hasToken);
        setIsAuthLoading(false);
      } catch (error) {
        console.error('Error checking token status:', error);
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
        // Token was added/removed/modified in localStorage
        const newToken = e.newValue;
        if (newToken) {
          try {
            const tokenData = JSON.parse(newToken);
            
            if (isTokenValid(tokenData)) {
              setIsSignedIn(true);
              // Restore token to gapi client
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
              window.gapi?.client?.setToken({ access_token: tokenData.access_token });
            } else {
              setIsSignedIn(false);
              setUserProfile(null);
            }
          } catch (error) {
            console.error('Error parsing token from storage change:', error);
            setIsSignedIn(false);
            setUserProfile(null);
          }
        } else {
          // Token was removed
          setIsSignedIn(false);
          setUserProfile(null);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          window.gapi?.client?.setToken(null);
        }
      }
    };

    const handleAuthStateChange = () => {
      try {
        // First check localStorage
        const savedToken = localStorage.getItem('google_calendar_token');
        if (savedToken) {
          try {
            const tokenData = JSON.parse(savedToken);
            
            if (isTokenValid(tokenData)) {
              setIsSignedIn(true);
              return;
            } else {
              localStorage.removeItem('google_calendar_token');
            }
          } catch (error) {
            console.error('Error parsing saved token:', error);
            localStorage.removeItem('google_calendar_token');
          }
        }
        
        // Fallback to gapi client token
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const token = window.gapi?.client?.getToken();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const hasToken = !!token?.access_token;
        setIsSignedIn(hasToken);
        if (!hasToken) {
          setUserProfile(null);
        }
      } catch (error) {
        console.error('Error in auth state change handler:', error);
        setIsSignedIn(false);
        setUserProfile(null);
      }
    };

    const handleSignOutEvent = () => {
      setIsSignedIn(false);
      setUserProfile(null);
      setError(null);
    };

    // Add event listeners with proper error handling
    try {
      window.addEventListener('storage', handleStorageChange, { passive: true });
      window.addEventListener('gapi_auth_changed', handleAuthStateChange as EventListener, { passive: true });
      window.addEventListener('gapi_auth_signout', handleSignOutEvent, { passive: true });
    } catch (error) {
      console.error('Error adding event listeners:', error);
    }

    return () => {
      try {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('gapi_auth_changed', handleAuthStateChange as EventListener);
        window.removeEventListener('gapi_auth_signout', handleSignOutEvent);
      } catch (error) {
        console.error('Error removing event listeners:', error);
      }
    };
  }, []);

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
