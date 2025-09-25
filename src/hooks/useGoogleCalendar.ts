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

  // Load GIS + gapi scripts in browser only
  useEffect(() => {
    if (typeof window === "undefined") return;

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

          const tc = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPE,
            callback: (resp: any) => {
              if (resp?.access_token) {
                window.gapi.client.setToken({ access_token: resp.access_token });
                setIsSignedIn(true);
              } else {
                setError("No access token from GIS");
              }
            },
          });
          setTokenClient(tc);
        } catch (e: any) {
          setError(e?.message ?? "Failed to init Google API client");
        }
      });
    };
    api.onerror = () => setError("Failed to load Google API script");

    document.body.append(gsi, api);
    return () => { gsi.remove(); api.remove(); };
  }, []);

  const handleAuthClick = useCallback(() => {
    if (!tokenClient) { setError("Auth not ready"); return; }
    // Attempt to use existing session/token first
    tokenClient.requestAccessToken({ prompt: "" });
  }, [tokenClient]);

  const ensureSignedIn = useCallback(async () => {
    // If already signed in, do nothing.
    if (isSignedIn) return;

    // Wait for tokenClient to be initialized if it's not ready.
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

    // Check if a token is already available without prompting
    const token = window.gapi.client.getToken();
    if (token && token.access_token) {
      window.gapi.client.setToken(token); // Ensure gapi has the token
      setIsSignedIn(true);
      return;
    }

    // If not signed in and no token, initiate the authentication flow.
    // The callback in useEffect will handle setting isSignedIn.
    tokenClient.requestAccessToken({ prompt: "" });

    // Wait for the isSignedIn state to become true.
    // This promise will resolve when the callback in initTokenClient (from useEffect) is executed and sets isSignedIn to true.
    return new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (isSignedIn) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100); // Check every 100ms
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
    // Revoke current token and clear session
    if (window.gapi.client.getToken()) {
      window.google.accounts.oauth2.revoke(window.gapi.client.getToken().access_token, () => {
        window.gapi.client.setToken(null);
        setIsSignedIn(false);
        setError(null); // Clear any previous errors
        message.success("Đã đăng xuất Google.");
      });
    } else {
      setIsSignedIn(false);
      setError(null);
      message.info("Bạn chưa đăng nhập Google.");
    }
  }, []);

  return { isSignedIn, isGapiLoaded, error, handleAuthClick, ensureSignedIn, fetchCalendarEvents, createCalendarEvent, signOut };
}
