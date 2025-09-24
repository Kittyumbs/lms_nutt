/// <reference types="gapi" />
/// <reference types="gapi.client.calendar" />
import { useState, useCallback, useEffect } from 'react';
import { gapi } from 'gapi-script';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID; // Lấy từ biến môi trường
const API_KEY = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY; // Lấy từ biến môi trường (nếu cần)
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

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
  const [authInstance, setAuthInstance] = useState<gapi.auth2.GoogleAuth | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initClient = useCallback(() => {
    gapi.client.init({
      apiKey: API_KEY,
      clientId: CLIENT_ID,
      discoveryDocs: DISCOVERY_DOCS,
      scope: SCOPES,
    }).then(() => {
      const auth2 = gapi.auth2.getAuthInstance();
      setAuthInstance(auth2);
      setIsSignedIn(auth2.isSignedIn.get());
      auth2.isSignedIn.listen(setIsSignedIn);
      setIsGapiLoaded(true);
    }).catch((err: any) => {
      console.error("Error initializing gapi client:", err);
      setError("Failed to initialize Google API client.");
    });
  }, []);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      gapi.load('client', () => {
        gapi.client.setApiKey(API_KEY);
        gapi.client.load('calendar', 'v3', () => {
          gapi.load('auth2', initClient);
        });
      });
    };
    script.onerror = () => {
      setError("Failed to load Google API script.");
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [initClient]);

  const handleAuthClick = useCallback(() => {
    if (authInstance) {
      if (isSignedIn) {
        // User is signed in, no need to sign in again
        console.log("User already signed in.");
      } else {
        authInstance.signIn().catch((err: any) => {
          console.error("Error signing in:", err);
          setError("Failed to sign in to Google.");
        });
      }
    } else {
      setError("Google API client not initialized.");
    }
  }, [authInstance, isSignedIn]);

  const createCalendarEvent = useCallback(async (event: CalendarEvent) => {
    if (!isSignedIn) {
      setError("User not signed in to Google Calendar.");
      throw new Error("User not signed in.");
    }
    if (!gapi.client.calendar) {
      setError("Google Calendar API not loaded.");
      throw new Error("Google Calendar API not loaded.");
    }

    try {
      const response = await gapi.client.calendar.events.insert({
        calendarId: 'primary', // 'primary' refers to the user's primary calendar
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

  return {
    isSignedIn,
    isGapiLoaded,
    error,
    handleAuthClick,
    createCalendarEvent,
  };
};
