/// <reference types="gapi" />
/// <reference types="gapi.auth2" />
/// <reference types="gapi.client" />
/// <reference types="gapi.client.calendar" />
/// <reference types="gapi.client.oauth2" />
import { useState, useCallback, useEffect } from 'react';
import { gapi } from 'gapi-script';
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

  console.log("useGoogleCalendar hook initialized. Initial isSignedIn:", isSignedIn, "Initial userEmail:", userEmail);

  const ensureSignedIn = useCallback(async () => {
    console.log("ensureSignedIn called.");
    const authInstance = gapi.auth2?.getAuthInstance(); // Use optional chaining for safety
    if (!authInstance) {
      throw new Error('Google Auth2 client not initialized. Please try again.');
    }
    if (!authInstance.isSignedIn.get()) {
      console.log("User not signed in, prompting for sign-in.");
      await authInstance.signIn({ prompt: 'consent' });
    }
    // The isSignedIn state is managed by the listener, so we don't set it manually here.
    // This avoids a race condition where the state is set to true before the sign-in is complete.
    console.log("ensureSignedIn: sign-in process completed or user was already signed in.");
    try {
      const userResp = await gapi.client.oauth2.userinfo.get();
      setUserEmail(userResp.result.email || null);
      console.log("User email set from ensureSignedIn:", userResp.result.email);
    } catch (userErr) {
      console.error("Error fetching user info in ensureSignedIn:", userErr);
      setUserEmail(null);
    }
  }, []);

  const initClient = useCallback(async () => {
    console.log("initClient called.");
    try {
      await gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES,
      });
      await gapi.client.load('calendar', 'v3');
      await gapi.client.load('oauth2', 'v2');
      setIsGapiLoaded(true);
      console.log("gapi client loaded and initialized.");

      const authInstance = gapi.auth2?.getAuthInstance();
      if (authInstance) {
        setIsSignedIn(authInstance.isSignedIn.get());
        authInstance.isSignedIn.listen(setIsSignedIn);
        console.log("Auth instance initialized. Initial isSignedIn:", authInstance.isSignedIn.get());

        if (authInstance.isSignedIn.get()) {
          try {
            const userResp = await gapi.client.oauth2.userinfo.get();
            setUserEmail(userResp.result.email || null);
            console.log("User email set during initClient:", userResp.result.email);
          } catch (userErr) {
            console.error("Error fetching user info during initClient:", userErr);
            setUserEmail(null);
          }
        }
      } else {
        console.error("Google Auth instance not found after client initialization.");
        setError("Failed to initialize Google Auth instance.");
      }
    } catch (err: any) {
      console.error("Error initializing Google API client:", err);
      setError("Failed to initialize Google API client.");
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const scriptGapi = document.createElement('script');
    scriptGapi.src = 'https://apis.google.com/js/api.js';
    scriptGapi.onload = () => {
      gapi.load('client:auth2', initClient); // Load client and auth2, then call initClient
    };
    scriptGapi.onerror = () => {
      setError("Failed to load Google API script.");
    };
    document.body.appendChild(scriptGapi);

    return () => {
      document.body.removeChild(scriptGapi);
    };
  }, [initClient]);

  useEffect(() => {
    console.log("isSignedIn state changed:", isSignedIn, "userEmail:", userEmail);
  }, [isSignedIn, userEmail]);

  const handleAuthClick = useCallback(async () => {
    console.log("handleAuthClick called. Current isSignedIn:", isSignedIn);
    try {
      await ensureSignedIn();
    } catch (err: any) {
      console.error("Error during authentication:", err);
      setError(err.message || "Failed to sign in to Google.");
    }
  }, [ensureSignedIn]);

  const signOut = useCallback(() => {
    console.log("signOut called. Current isSignedIn:", isSignedIn);
    const authInstance = gapi.auth2?.getAuthInstance();
    if (authInstance && authInstance.isSignedIn.get()) {
      authInstance.signOut().then(() => {
        setIsSignedIn(false);
        setUserEmail(null);
        message.success("Đã đăng xuất khỏi Google.");
        console.log("Signed out. isSignedIn:", false, "userEmail:", null);
      });
    } else {
      message.warning("Người dùng chưa đăng nhập hoặc Google Auth client chưa sẵn sàng.");
      console.warn("User not signed in or Google Auth client not ready.");
    }
  }, []);

  const createCalendarEvent = useCallback(async (event: CalendarEvent) => {
    console.log("createCalendarEvent called. Current isSignedIn:", isSignedIn);
    try {
      await ensureSignedIn(); // Ensure user is signed in before creating event
    } catch (err: any) {
      setError(err.message || "User not signed in to Google Calendar.");
      throw err;
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
  }, [ensureSignedIn]);

  const fetchCalendarEvents = useCallback(async () => {
    console.log("fetchCalendarEvents called. Current isSignedIn:", isSignedIn);
    try {
      await ensureSignedIn(); // Ensure user is signed in before fetching events
    } catch (err: any) {
      setError(err.message || "User not signed in to Google Calendar.");
      throw err;
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
  }, [ensureSignedIn]);

  return {
    isSignedIn,
    isGapiLoaded,
    error,
    userEmail,
    handleAuthClick,
    createCalendarEvent,
    signOut,
    fetchCalendarEvents,
    ensureSignedIn,
  };
};
