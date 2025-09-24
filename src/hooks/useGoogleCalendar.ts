/// <reference types="gapi" />
/// <reference types="gapi.client" />
/// <reference types="gapi.client.calendar" />
import '../types/gis.d.ts'; // Import GIS types
import { useState, useCallback, useEffect, useRef } from 'react';
import { gapi } from 'gapi-script';
import { message } from 'antd'; // Import message

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
  const [error, setError] = useState<string | null>(null);
  const tokenClient = useRef<any>(null); // Use useRef to store tokenClient

  const initGapiClient = useCallback(async () => {
    try {
      await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
      });
      await gapi.client.load('calendar', 'v3');
      setIsGapiLoaded(true);

      tokenClient.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (resp: any) => {
          if (resp && resp.access_token) {
            gapi.client.setToken({ access_token: resp.access_token });
            setIsSignedIn(true);
          }
        },
      });
    } catch (err: any) {
      console.error("Error initializing Google API client:", err);
      setError("Failed to initialize Google API client.");
    }
  }, [API_KEY, CLIENT_ID, DISCOVERY_DOCS, SCOPES]);

  useEffect(() => {
    if (typeof window === 'undefined') return; // Guard SSR

    const scriptGapi = document.createElement('script');
    scriptGapi.src = 'https://apis.google.com/js/api.js';
    scriptGapi.onload = () => {
      gapi.load('client', initGapiClient);
    };
    scriptGapi.onerror = () => {
      setError("Failed to load Google API script.");
    };
    document.body.appendChild(scriptGapi);

    const scriptGis = document.createElement('script');
    scriptGis.src = 'https://accounts.google.com/gsi/client';
    scriptGis.async = true;
    scriptGis.onerror = () => {
      setError("Failed to load Google Identity Services script.");
    };
    document.body.appendChild(scriptGis);

    return () => {
      document.body.removeChild(scriptGapi);
      document.body.removeChild(scriptGis);
    };
  }, [initGapiClient]);

  const handleAuthClick = useCallback(() => {
    if (tokenClient.current) {
      tokenClient.current.requestAccessToken({ prompt: 'consent' });
    } else {
      setError("Google Identity Services client not initialized.");
    }
  }, []);

  const signOut = useCallback(() => {
    if (isSignedIn && gapi.client.getToken()) {
      const accessToken = gapi.client.getToken().access_token;
      if (accessToken) {
        window.google.accounts.id.revoke(accessToken, () => {
          gapi.client.setToken(null);
          setIsSignedIn(false);
          message.success("Đã đăng xuất khỏi Google.");
        });
      }
    }
  }, [isSignedIn]);

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
    signOut, // Expose signOut
  };
};
