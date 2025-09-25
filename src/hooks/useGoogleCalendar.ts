/// <reference types="gapi" />
/// <reference types="gapi.client" />
/// <reference types="gapi.client.calendar" />
/// <reference types="gapi.client.oauth2" /> // Thêm tham chiếu kiểu cho oauth2
import '../types/gis.d.ts'; // Import GIS types
import { useState, useCallback, useEffect, useRef } from 'react';
import { gapi } from 'gapi-script';
import { message } from 'antd'; // Import message

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID; // Lấy từ biến môi trường
const API_KEY = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY; // Lấy từ biến môi trường (nếu cần)
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
  const [userEmail, setUserEmail] = useState<string | null>(null); // Thêm state để lưu email người dùng
  const tokenClient = useRef<any>(null); // Use useRef to store tokenClient

  const initGapiClient = useCallback(async () => {
    try {
      await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
      });
      await gapi.client.load('calendar', 'v3');
      await gapi.client.load('oauth2', 'v2'); // Tải thư viện oauth2 sớm hơn
      setIsGapiLoaded(true);

      tokenClient.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (resp: any) => {
          console.log("Token client callback response:", resp);
          if (resp && resp.access_token) {
            gapi.client.setToken({ access_token: resp.access_token });
            setIsSignedIn(true);
            console.log("isSignedIn set to true.");
            // Lấy thông tin người dùng sau khi đăng nhập thành công
            gapi.client.oauth2.userinfo.get().then((userResp: any) => {
              setUserEmail(userResp.result.email);
              console.log("User email set:", userResp.result.email);
            }).catch((userErr: any) => {
              console.error("Error fetching user info:", userErr);
              setUserEmail(null);
            });
          } else {
            console.log("No access token in callback response.");
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
    scriptGis.onload = () => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: () => {}, // Callback rỗng vì chúng ta dùng tokenClient để lấy token
        });
      }
    };
    scriptGis.onerror = () => {
      setError("Failed to load Google Identity Services script.");
    };
    document.body.appendChild(scriptGis);

    return () => {
      document.body.removeChild(scriptGapi);
      document.body.removeChild(scriptGis);
    };
  }, [initGapiClient, CLIENT_ID]);

  const handleAuthClick = useCallback(() => {
    if (tokenClient.current) {
      console.log("Requesting access token...");
      tokenClient.current.requestAccessToken({ prompt: 'consent' });
    } else {
      setError("Google Identity Services client not initialized.");
      console.error("Google Identity Services client not initialized.");
    }
  }, []);

  const signOut = useCallback(() => {
    if (isSignedIn && window.google && window.google.accounts && window.google.accounts.id) {
      const token = gapi.client.getToken();
      if (token && token.access_token) {
        window.google.accounts.id.revoke(token.access_token, () => {
          gapi.client.setToken(null);
          setIsSignedIn(false);
          setUserEmail(null); // Xóa email người dùng khi đăng xuất
          message.success("Đã đăng xuất khỏi Google.");
          console.log("Signed out. isSignedIn:", false, "userEmail:", null);
        });
      } else {
        message.warning("Không có access token để đăng xuất."); // Đổi warn thành warning
        console.warn("No access token to sign out.");
      }
    } else {
      message.warning("Google Identity Services chưa được khởi tạo hoặc người dùng chưa đăng nhập."); // Đổi warn thành warning
      console.warn("Google Identity Services not initialized or user not signed in.");
    }
  }, [isSignedIn]);

  const createCalendarEvent = useCallback(async (event: CalendarEvent) => {
    if (!isSignedIn) {
      setError("User not signed in to Google Calendar.");
      console.error("createCalendarEvent: User not signed in.");
      throw new Error("User not signed in.");
    }
    if (!gapi.client.calendar) {
      setError("Google Calendar API not loaded.");
      console.error("createCalendarEvent: Google Calendar API not loaded.");
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

  const fetchCalendarEvents = useCallback(async () => {
    if (!isSignedIn) {
      setError("User not signed in to Google Calendar.");
      console.error("fetchCalendarEvents: User not signed in. isSignedIn:", isSignedIn);
      throw new Error("User not signed in.");
    }
    if (!gapi.client.calendar) {
      setError("Google Calendar API not loaded.");
      console.error("fetchCalendarEvents: Google Calendar API not loaded.");
      throw new Error("Google Calendar API not loaded.");
    }

    try {
      const response = await gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: (new Date()).toISOString(), // Lấy các sự kiện từ thời điểm hiện tại trở đi
        showDeleted: false,
        singleEvents: true,
        maxResults: 10, // Giới hạn số lượng sự kiện
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
    userEmail, // Expose userEmail
    handleAuthClick,
    createCalendarEvent,
    signOut, // Expose signOut
    fetchCalendarEvents, // Expose fetchCalendarEvents
  };
};
