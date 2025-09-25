/// <reference types="gapi" />
/// <reference types="gapi.client" />
/// <reference types="gapi.client.calendar" />
import { useEffect, useState, useCallback } from "react";
import { message } from "antd"; // Import message from antd

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID!;
const API_KEY   = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY!;
const DISCOVERY = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPE     = "https://www.googleapis.com/auth/calendar.events";

type GEvent = gapi.client.calendar.Event;

export function useGoogleCalendar() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isGapiLoaded, setIsGapiLoaded] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true); // New state for authentication loading

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

  // Polling mechanism to ensure isSignedIn state is updated if token exists
  useEffect(() => {
    let intervalId: number; // Changed from NodeJS.Timeout to number
    if (isGapiLoaded && !isSignedIn) {
      intervalId = setInterval(() => {
        const currentToken = window.gapi?.client?.getToken();
        if (currentToken?.access_token) {
          console.log("useGoogleCalendar: Polling found existing token. Setting isSignedIn to true.");
          setIsSignedIn(true);
          clearInterval(intervalId);
        }
      }, 500); // Check every 500ms
    }
    return () => clearInterval(intervalId);
  }, [isGapiLoaded, isSignedIn]);

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

  const signOut = useCallback(() => {
    // Clear current token and session without revoking app permissions
    if (window.gapi.client.getToken()) {
      window.gapi.client.setToken(null);
      setIsSignedIn(false);
      setError(null); // Clear any previous errors
      message.success("Đã thoát tài khoản Google hiện tại.");
    } else {
      setIsSignedIn(false);
      setError(null);
      message.info("Bạn chưa đăng nhập Google.");
    }
  }, []);

  return { isSignedIn, isGapiLoaded, error, handleAuthClick, ensureSignedIn, fetchCalendarEvents, createCalendarEvent, signOut, isAuthLoading };
}
