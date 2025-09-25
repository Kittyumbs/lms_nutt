/// <reference types="gapi" />
/// <reference types="google.accounts" />
/// <reference types="gapi.client" />
/// <reference types="gapi.client.calendar" />
/// <reference types="gapi.client.oauth2" />
import { useState, useCallback, useEffect, useRef } from 'react';
import { message } from 'antd';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY;
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email';

interface CalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{ email: string }>;
}

export const useGoogleCalendar = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isGapiClientLoaded, setIsGapiClientLoaded] = useState(false); // Renamed for clarity
  const [isTokenClientInitialized, setIsTokenClientInitialized] = useState(false); // New state for GIS token client
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const tokenClient = useRef<google.accounts.oauth2.TokenClient | null>(null);

  // Combined ready state
  const isGoogleReady = isGapiClientLoaded && isTokenClientInitialized;

  console.log("useGoogleCalendar hook initialized. Initial isSignedIn:", isSignedIn, "Initial userEmail:", userEmail);

  const updateSignInStatus = useCallback(async (isUserSignedIn: boolean, accessToken?: string) => {
    console.log("updateSignInStatus called with:", isUserSignedIn, "accessToken present:", !!accessToken);
    setIsSignedIn(isUserSignedIn);
    if (isUserSignedIn) {
      try {
        // If accessToken is provided, set it before fetching user info
        if (accessToken) {
          gapi.client.setToken({ access_token: accessToken });
        }
        const userResp = await gapi.client.oauth2.userinfo.get();
        setUserEmail(userResp.result.email || null);
        console.log("User email set:", userResp.result.email);
      } catch (userErr) {
        console.error("Error fetching user info in updateSignInStatus:", userErr);
        setUserEmail(null);
        // If fetching user info fails, it might mean the token is invalid or expired
        // In this case, we should consider the user as not signed in.
        setIsSignedIn(false);
      }
    } else {
      setUserEmail(null);
      gapi.client.setToken(null); // Clear token on sign out
    }
  }, []);

  const initGapiClient = useCallback(async () => {
    console.log("initGapiClient called.");
    try {
      await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
      });
      await gapi.client.load('calendar', 'v3');
      await gapi.client.load('oauth2', 'v2');
      setIsGapiClientLoaded(true); // Set this flag
      console.log("gapi client loaded and initialized.");
    } catch (err: any) {
      console.error("Error initializing Google API client:", err);
      setError("Failed to initialize Google API client.");
    }
  }, [API_KEY, DISCOVERY_DOCS]);

  const initGIS = useCallback(() => {
    console.log("initGIS called.");
    if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
      console.warn("Google Identity Services script not loaded yet.");
      return;
    }

    tokenClient.current = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        console.log("Token client callback received:", resp);
        if (resp?.access_token) {
          updateSignInStatus(true, resp.access_token); // Pass access token to update status
          message.success("Đăng nhập Google thành công!");
        } else {
          updateSignInStatus(false);
          setError(resp?.error || "Failed to get access token.");
          message.error("Không thể đăng nhập Google.");
        }
      },
      error_callback: (err) => {
        console.error("Token client error:", err);
        setError(err?.type || "Unknown token client error.");
        updateSignInStatus(false);
        message.error("Lỗi đăng nhập Google.");
      }
    });
    setIsTokenClientInitialized(true); // Set this flag
    console.log("Google Identity Services token client initialized.");

    // Initial token check will be handled by a separate useEffect after both GAPI client and GIS are ready
  }, [CLIENT_ID, SCOPES, updateSignInStatus]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let gapiLoadedOnce = false;
    let gisInitializedOnce = false;

    const checkAndInitGapi = () => {
      if (!gapiLoadedOnce && window.gapi) {
        console.log("gapi script ready, loading client.");
        gapi.load('client', initGapiClient);
        gapiLoadedOnce = true;
      }
    };

    const checkAndInitGIS = () => {
      if (!gisInitializedOnce && window.google?.accounts?.oauth2) {
        console.log("GIS script ready, initializing token client.");
        initGIS();
        gisInitializedOnce = true;
      }
    };

    // Check immediately
    checkAndInitGapi();
    checkAndInitGIS();

    // Set up intervals to check for readiness
    const gapiCheckInterval = setInterval(checkAndInitGapi, 100);
    const gisCheckInterval = setInterval(checkAndInitGIS, 100);

    return () => {
      clearInterval(gapiCheckInterval);
      clearInterval(gisCheckInterval);
    };
  }, [initGapiClient, initGIS]);

  // Effect to check initial sign-in status once both GAPI client and GIS are ready
  useEffect(() => {
    if (typeof window === 'undefined' || !isGoogleReady) return;

    console.log("Both GAPI client and GIS are ready. Checking initial sign-in status.");
    const currentToken = gapi.client.getToken();
    if (currentToken && currentToken.access_token) {
      console.log("Existing GAPI client token found, updating sign-in status.");
      updateSignInStatus(true, currentToken.access_token);
    } else {
      console.log("No existing GAPI client token found.");
      updateSignInStatus(false);
    }
  }, [isGoogleReady, updateSignInStatus]);

  const handleAuthClick = useCallback(() => {
    console.log("handleAuthClick called. Current isSignedIn:", isSignedIn);
    if (!isGoogleReady || !tokenClient.current) { // Ensure tokenClient.current is not null
      message.error("Google API client hoặc token client chưa sẵn sàng.");
      return;
    }
    if (isSignedIn) {
      message.info("Bạn đã đăng nhập.");
      return;
    }
    tokenClient.current.requestAccessToken({ prompt: 'consent' });
  }, [isGoogleReady, isSignedIn]); // Dependency on isGoogleReady

  const signOut = useCallback(() => {
    console.log("signOut called. Current isSignedIn:", isSignedIn);
    if (!isSignedIn || !userEmail) {
      message.warning("Người dùng chưa đăng nhập.");
      return;
    }
    if (window.google?.accounts?.id) {
      google.accounts.id.revoke(userEmail, () => {
        updateSignInStatus(false); // updateSignInStatus will clear the token
        message.success("Đã đăng xuất khỏi Google.");
        console.log("Signed out. isSignedIn:", false, "userEmail:", null);
      });
    } else {
      message.error("Google Identity Services chưa sẵn sàng để đăng xuất.");
    }
  }, [isSignedIn, userEmail, updateSignInStatus]);

  const createCalendarEvent = useCallback(async (event: CalendarEvent) => {
    console.log("createCalendarEvent called. Current isSignedIn:", isSignedIn);
    const currentToken = gapi.client.getToken();
    if (!currentToken || !currentToken.access_token) {
      message.error("Vui lòng đăng nhập Google để tạo lịch.");
      throw new Error("User not signed in to Google Calendar.");
    }
    if (!gapi.client.calendar) {
      setError("Google Calendar API not loaded.");
      console.error("createCalendarEvent: Google Calendar API not loaded.");
      throw new Error("Google Calendar API not loaded.");
    }

    try {
      const response = await gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });
      console.log('Event created:', response.result);
      return response.result;
    } catch (err: any) {
      console.error("Error creating event:", err);
      setError(err.result?.error?.message || "Failed to create calendar event.");
      throw err;
    }
  }, []); // Removed isSignedIn from dependencies

  const fetchCalendarEvents = useCallback(async () => {
    console.log("fetchCalendarEvents called. Current isSignedIn:", isSignedIn);
    const currentToken = gapi.client.getToken();
    if (!currentToken || !currentToken.access_token) {
      message.error("Vui lòng đăng nhập Google để xem lịch.");
      throw new Error("User not signed in to Google Calendar.");
    }
    if (!gapi.client.calendar) {
      setError("Google Calendar API not loaded.");
      console.error("fetchCalendarEvents: Google Calendar API not loaded.");
      throw new Error("Google Calendar API not loaded.");
    }

    try {
      const response = await gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: (new Date()).toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults: 10,
        orderBy: 'startTime',
      });
      return response.result.items || [];
    } catch (err: any) {
      console.error("Error fetching calendar events:", err);
      setError(err.result?.error?.message || "Failed to fetch calendar events.");
      throw err;
    }
  }, []); // Removed isSignedIn from dependencies

  return {
    isSignedIn,
    isGapiLoaded: isGoogleReady, // Expose the combined ready state as isGapiLoaded
    error,
    userEmail,
    handleAuthClick,
    createCalendarEvent,
    signOut,
    fetchCalendarEvents,
  };
};
