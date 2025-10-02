/// <reference types="gapi" />
/// <reference types="gapi.client" />
/// <reference types="gapi.client.calendar" />
import { message } from "antd";
import { useCallback, useEffect, useState } from "react";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID as string;
const API_KEY = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY as string;
const DISCOVERY = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPE     = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile";

type GEvent = gapi.client.calendar.Event;

interface TokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void;
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

          // Check for existing token
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          const existingToken = window.gapi.client.getToken();
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (existingToken?.access_token) {
            setIsSignedIn(true);
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          const tc = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPE,
            callback: (resp: { access_token?: string; error?: string }) => {
              if (resp?.access_token) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                window.gapi.client.setToken({ access_token: resp.access_token });
                setIsSignedIn(true);
                setError(null);
              } else {
                setError(resp?.error || "No access token from Google");
              }
            },
          });
          setTokenClient(tc as TokenClient);
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

  // Optimized token synchronization - reduced polling frequency
  useEffect(() => {
    if (!isGapiLoaded) return;
    
    const checkTokenStatus = () => {
      try {
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

    // Initial check
    checkTokenStatus();
    
    // Reduced polling frequency from 200ms to 2000ms (2 seconds)
    const intervalId = setInterval(checkTokenStatus, 2000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isGapiLoaded]);

  // Window event for additional synchronization - with proper cleanup
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'google_auth_state') {
        const newState = e.newValue === 'signed_in';
        setIsSignedIn(newState);
      }
    };

    const handleAuthStateChange = () => {
      try {
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
    if (!tokenClient) {
      setError("Authentication not ready. Please wait and try again.");
      return;
    }
    
    try {
      setError(null);
      tokenClient.requestAccessToken({ prompt: "" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed";
      setError(errorMessage);
    }
  }, [tokenClient]);

  const ensureSignedIn = useCallback(async () => {
    // Always check for an existing token first.
    // If a token exists, set isSignedIn to true and return.
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
  }, [isSignedIn, tokenClient]);

  const fetchCalendarEvents = useCallback(async (): Promise<GEvent[]> => {
    if (!isGapiLoaded) {
      throw new Error("Google Calendar API not ready");
    }
    
    try {
      await ensureSignedIn();
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
  }, [isGapiLoaded, ensureSignedIn]);

  const createCalendarEvent = useCallback(async (event: GEvent) => {
    if (!isGapiLoaded) {
      throw new Error("Google Calendar API not ready");
    }
    
    try {
      await ensureSignedIn();
      
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
  }, [isGapiLoaded, ensureSignedIn]);

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

  const signOut = useCallback(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const currentToken = window.gapi?.client?.getToken();
      
      if (currentToken) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        window.gapi.client.setToken(null);
        setIsSignedIn(false);
        setUserProfile(null);
        setError(null);

        // Trigger custom event for synchronization
        window.dispatchEvent(new CustomEvent('gapi_auth_signout'));

        void message.success("Đã thoát tài khoản Google hiện tại.");
      } else {
        setIsSignedIn(false);
        setUserProfile(null);
        setError(null);
        void message.info("Bạn chưa đăng nhập Google.");
      }
    } catch (error) {
      console.error('Error during sign out:', error);
      // Force reset state even if there's an error
      setIsSignedIn(false);
      setUserProfile(null);
      setError(null);
    }
  }, []);

  return {
    isSignedIn,
    isGapiLoaded,
    error,
    handleAuthClick,
    ensureSignedIn,
    fetchCalendarEvents,
    createCalendarEvent,
    signOut,
    isAuthLoading,
    userProfile
  };
}
