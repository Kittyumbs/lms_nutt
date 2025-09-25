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
  const [isGapiLoaded, setIsGapiLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const tokenClient = useRef<google.accounts.oauth2.TokenClient | null>(null);

  console.log("useGoogleCalendar hook initialized. Initial isSignedIn:", isSignedIn, "Initial userEmail:", userEmail);

  const updateSignInStatus = useCallback(async (isUserSignedIn: boolean) => {
    setIsSignedIn(isUserSignedIn);
    if (isUserSignedIn) {
      try {
        const userResp = await gapi.client.oauth2.userinfo.get();
        setUserEmail(userResp.result.email || null);
        console.log("User email set:", userResp.result.email);
      } catch (userErr) {
        console.error("Error fetching user info:", userErr);
        setUserEmail(null);
      }
    } else {
      setUserEmail(null);
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
      setIsGapiLoaded(true);
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
          gapi.client.setToken({ access_token: resp.access_token });
          updateSignInStatus(true);
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
    console.log("Google Identity Services token client initialized.");
  }, [CLIENT_ID, SCOPES, updateSignInStatus]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const scriptGapi = document.createElement('script');
    scriptGapi.src = 'https://apis.google.com/js/api.js';
    scriptGapi.onload = () => {
      gapi.load('client', initGapiClient);
      gapi.load('oauth2', () => { /* oauth2 client is loaded via gapi.client.load in initGapiClient */ });
    };
    scriptGapi.onerror = () => {
      setError("Failed to load Google API script.");
    };
    document.body.appendChild(scriptGapi);

    // GIS script is loaded in index.html, just ensure it's ready
    const checkGISReady = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(checkGISReady);
        initGIS();
      }
    }, 100); // Check every 100ms

    return () => {
      document.body.removeChild(scriptGapi);
      clearInterval(checkGISReady);
    };
  }, [initGapiClient, initGIS]);

  const handleAuthClick = useCallback(() => {
    console.log("handleAuthClick called. Current isSignedIn:", isSignedIn);
    if (!isGapiLoaded || !tokenClient.current) {
      message.error("Google API client or token client not ready.");
      return;
    }
    if (isSignedIn) {
      message.info("Bạn đã đăng nhập.");
      return;
    }
    tokenClient.current.requestAccessToken({ prompt: 'consent' });
  }, [isGapiLoaded, isSignedIn]);

  const signOut = useCallback(() => {
    console.log("signOut called. Current isSignedIn:", isSignedIn);
    if (!isSignedIn || !userEmail) {
      message.warning("Người dùng chưa đăng nhập.");
      return;
    }
    if (window.google?.accounts?.id) {
      google.accounts.id.revoke(userEmail, () => {
        gapi.client.setToken(null);
        updateSignInStatus(false);
        message.success("Đã đăng xuất khỏi Google.");
        console.log("Signed out. isSignedIn:", false, "userEmail:", null);
      });
    } else {
      message.error("Google Identity Services chưa sẵn sàng để đăng xuất.");
    }
  }, [isSignedIn, userEmail, updateSignInStatus]);

  const createCalendarEvent = useCallback(async (event: CalendarEvent) => {
    console.log("createCalendarEvent called. Current isSignedIn:", isSignedIn);
    if (!isSignedIn) {
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
  }, [isSignedIn]);

  const fetchCalendarEvents = useCallback(async () => {
    console.log("fetchCalendarEvents called. Current isSignedIn:", isSignedIn);
    if (!isSignedIn) {
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
  }, [isSignedIn]);

  return {
    isSignedIn,
    isGapiLoaded,
    error,
    userEmail,
    handleAuthClick,
    createCalendarEvent,
    signOut,
    fetchCalendarEvents,
  };
};
