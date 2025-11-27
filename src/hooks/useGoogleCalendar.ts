/// <reference types="gapi" />
/// <reference types="gapi.client" />
/// <reference types="gapi.client.calendar" />

// Global types for Google APIs are declared in AuthProvider.tsx

import { message } from "antd";
import { useCallback, useEffect, useState } from "react";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID as string;
const API_KEY = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY as string;
const DISCOVERY = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPE = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile";

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

  const fetchCalendarEvents = useCallback(async (): Promise<GEvent[]> => {
    console.log('🔍 fetchCalendarEvents called');
    if (!isGapiLoaded) {
      throw new Error("Google Calendar API not ready");
    }

    if (!isSignedIn) {
      throw new Error("Not signed in to Google Calendar");
    }

    // 🔧 FIX: Thêm kiểm tra API readiness
    if (!window.gapi?.client?.calendar?.events?.list) {
      throw new Error("Google Calendar API not properly initialized");
    }

    try {
      const now = new Date().toISOString();
      const response = await window.gapi.client.calendar.events.list({
        calendarId: "primary",
        timeMin: now,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 50,
      });
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
      throw new Error("Not signed in to Google Calendar");
    }

    // 🔧 FIX: Thêm kiểm tra API readiness
    if (!window.gapi?.client?.calendar?.events?.insert) {
      throw new Error("Google Calendar API not properly initialized");
    }

    try {
      const response = await window.gapi.client.calendar.events.insert({
        calendarId: "primary",
        sendUpdates: "all",
        resource: event as any,
      });
      return response.result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create calendar event";
      throw new Error(errorMessage);
    }
  }, [isGapiLoaded, isSignedIn]);

  return {
    isSignedIn,
    isGapiLoaded,
    error,
    handleAuthClick: () => {},
    fetchCalendarEvents,
    createCalendarEvent,
    signOut: () => {},
    isAuthLoading,
    userProfile
  };
}
