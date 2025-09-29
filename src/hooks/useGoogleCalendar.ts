/// <reference types="gapi" />
/// <reference types="gapi.client" />
/// <reference types="gapi.client.calendar" />
import { useEffect, useState, useCallback } from "react";
import { message } from "antd"; // Import message from antd

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID!;
const API_KEY   = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY!;
const DISCOVERY = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest", "https://www.googleapis.com/discovery/v1/apis/people/v1/rest"];
const SCOPE     = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/contacts.readonly";

type GEvent = gapi.client.calendar.Event;

export function useGoogleCalendar() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isGapiLoaded, setIsGapiLoaded] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true); // New state for authentication loading
  const [userProfile, setUserProfile] = useState<{ email: string; name: string; picture: string } | null>(null);

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
      window.gapi.load("client", async () => {
        try {
          await window.gapi.client.init({ apiKey: API_KEY, discoveryDocs: DISCOVERY });
          await window.gapi.client.load("calendar", "v3");
          await window.gapi.client.load("people", "v1");
          setIsGapiLoaded(true);
          console.log("useGoogleCalendar: gapi client loaded. isGapiLoaded:", true);

          // Check for existing token immediately after gapi client is loaded
          const existingToken = window.gapi.client.getToken();
          if (existingToken?.access_token) {
            setIsSignedIn(true);
            console.log("useGoogleCalendar: Existing token found on load. isSignedIn:", true);
          } else {
            console.log("useGoogleCalendar: No existing token found on load.");
          }

          const tc = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPE,
            callback: (resp: any) => {
              console.log("useGoogleCalendar: tokenClient callback fired. resp:", resp);
              if (resp?.access_token) {
                window.gapi.client.setToken({ access_token: resp.access_token });
                setIsSignedIn(true);
                console.log("useGoogleCalendar: Access token received from callback. isSignedIn:", true);
              } else {
                setError("No access token from GIS");
                console.error("useGoogleCalendar: No access token from GIS callback.");
              }
            },
          });
          setTokenClient(tc);
          console.log("useGoogleCalendar: tokenClient initialized.");
        } catch (e: any) {
          setError(e?.message ?? "Failed to init Google API client");
          console.error("useGoogleCalendar: Error during gapi client init:", e);
        } finally {
          setIsAuthLoading(false); // Authentication loading is complete
          console.log("useGoogleCalendar: Authentication loading complete. isAuthLoading:", false);
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
      gsi.remove();
      api.remove();
    };
  }, []);

  // More robust synchronization with continuous polling
  useEffect(() => {
    if (isGapiLoaded) {
      const intervalId = setInterval(() => {
        const currentToken = window.gapi?.client?.getToken();
        const hasToken = !!currentToken?.access_token;

        // Update isSignedIn based on token existence
        setIsSignedIn(hasToken);

        // Update loading state if needed
        setIsAuthLoading(false);
      }, 200); // Check every 200ms for better responsiveness

      return () => clearInterval(intervalId);
    }
  }, [isGapiLoaded]);

  // Window event for additional synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'google_auth_state') {
        const newState = e.newValue === 'signed_in';
        console.log("useGoogleCalendar: Storage change detected. Setting isSignedIn to:", newState);
        setIsSignedIn(newState);
      }
    };

    const handleAuthStateChange = () => {
      const token = window.gapi?.client?.getToken();
      const hasToken = !!token?.access_token;
      console.log("useGoogleCalendar: Auth state change detected. hasToken:", hasToken);
      setIsSignedIn(hasToken);
      setUserProfile(null); // Reset profile temporarily
    };

    const handleSignOutEvent = () => {
      console.log("useGoogleCalendar: Sign out event detected. Setting isSignedIn to false.");
      setIsSignedIn(false);
      setUserProfile(null);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('gapi_auth_changed', handleAuthStateChange as EventListener);
    window.addEventListener('gapi_auth_signout', handleSignOutEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('gapi_auth_changed', handleAuthStateChange as EventListener);
      window.removeEventListener('gapi_auth_signout', handleSignOutEvent);
    };
  }, []);

  const handleAuthClick = useCallback(() => {
    if (!tokenClient) { setError("Auth not ready"); return; }
    // Attempt to use existing session/token first
    tokenClient.requestAccessToken({ prompt: "" });
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
    if (!isGapiLoaded) throw new Error("API not ready");
    await ensureSignedIn();
    const now = new Date().toISOString();
    const r = await window.gapi.client.calendar.events.list({
      calendarId: "primary",
      timeMin: now,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 50,
    });
    return r.result.items ?? [];
  }, [isGapiLoaded, ensureSignedIn]);

  const createCalendarEvent = useCallback(async (event: GEvent) => {
    if (!isGapiLoaded) throw new Error("API not ready");
    await ensureSignedIn();
    const r = await window.gapi.client.calendar.events.insert({
      calendarId: "primary",
      sendUpdates: "all",
      resource: event as any,
    });
    return r.result;
  }, [isGapiLoaded, ensureSignedIn]);

  const fetchUserProfile = useCallback(async () => {
    if (!isGapiLoaded) return;
    try {
      const response = await window.gapi.client.get({
        path: 'https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses,photos'
      });
      const profile = response.result;
      const email = profile.emailAddresses?.[0]?.value || '';
      const name = profile.names?.[0]?.displayName || email;
      const picture = profile.photos?.[0]?.url || '';
      setUserProfile({ email, name, picture });
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      setUserProfile(null);
    }
  }, [isGapiLoaded]);

  // Fetch user profile when sign in state changes
  useEffect(() => {
    if (isSignedIn && isGapiLoaded) {
      fetchUserProfile();
    } else {
      setUserProfile(null);
    }
  }, [isSignedIn, isGapiLoaded, fetchUserProfile]);

  const signOut = useCallback(() => {
    // Clear current token and session without revoking app permissions
    if (window.gapi.client.getToken()) {
      window.gapi.client.setToken(null);
      setIsSignedIn(false);
      setUserProfile(null);
      setError(null); // Clear any previous errors

      // Trigger custom event for synchronization
      window.dispatchEvent(new CustomEvent('gapi_auth_signout'));

      message.success("Đã thoát tài khoản Google hiện tại.");
    } else {
      setIsSignedIn(false);
      setUserProfile(null);
      setError(null);
      message.info("Bạn chưa đăng nhập Google.");
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
