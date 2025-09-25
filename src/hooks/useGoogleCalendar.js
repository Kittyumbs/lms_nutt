/// <reference types="gapi" />
/// <reference types="gapi.client" />
/// <reference types="gapi.client.calendar" />
import { useEffect, useState, useCallback } from "react";
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY;
const DISCOVERY = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPE = "https://www.googleapis.com/auth/calendar.events";
export function useGoogleCalendar() {
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [isGapiLoaded, setIsGapiLoaded] = useState(false);
    const [tokenClient, setTokenClient] = useState(null);
    const [error, setError] = useState(null);
    // Load GIS + gapi scripts in browser only
    useEffect(() => {
        if (typeof window === "undefined")
            return;
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
                        callback: (resp) => {
                            if (resp?.access_token) {
                                window.gapi.client.setToken({ access_token: resp.access_token });
                                setIsSignedIn(true);
                            }
                            else {
                                setError("No access token from GIS");
                            }
                        },
                    });
                    setTokenClient(tc);
                }
                catch (e) {
                    setError(e?.message ?? "Failed to init Google API client");
                }
            });
        };
        api.onerror = () => setError("Failed to load Google API script");
        document.body.append(gsi, api);
        return () => { gsi.remove(); api.remove(); };
    }, []);
    const handleAuthClick = useCallback(() => {
        if (!tokenClient) {
            setError("Auth not ready");
            return;
        }
        tokenClient.requestAccessToken({ prompt: "consent" });
    }, [tokenClient]);
    const ensureSignedIn = useCallback(async () => {
        if (isSignedIn)
            return;
        if (!tokenClient)
            throw new Error("Auth not ready");
        await new Promise((resolve) => {
            tokenClient.callback = (resp) => {
                if (resp?.access_token) {
                    window.gapi.client.setToken({ access_token: resp.access_token });
                    setIsSignedIn(true);
                }
                resolve();
            };
            tokenClient.requestAccessToken({ prompt: "consent" });
        });
    }, [isSignedIn, tokenClient]);
    const fetchCalendarEvents = useCallback(async () => {
        if (!isGapiLoaded)
            throw new Error("API not ready");
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
    const createCalendarEvent = useCallback(async (event) => {
        if (!isGapiLoaded)
            throw new Error("API not ready");
        await ensureSignedIn();
        const r = await window.gapi.client.calendar.events.insert({
            calendarId: "primary",
            sendUpdates: "all",
            resource: event,
        });
        return r.result;
    }, [isGapiLoaded, ensureSignedIn]);
    const signOut = useCallback(() => {
        // revoke current token
        window.google?.accounts.id.revoke(undefined, () => {
            window.gapi?.client?.setToken(null);
            setIsSignedIn(false);
        });
    }, []);
    return { isSignedIn, isGapiLoaded, error, handleAuthClick, ensureSignedIn, fetchCalendarEvents, createCalendarEvent, signOut };
}
