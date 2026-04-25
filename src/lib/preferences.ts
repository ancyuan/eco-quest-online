import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface Preferences {
  auto_harvest: boolean;
  notifications_enabled: boolean;
  dark_mode: boolean;
  tutorial_done: boolean;
}

const DEFAULTS: Preferences = {
  auto_harvest: false,
  notifications_enabled: false,
  dark_mode: false,
  tutorial_done: false,
};

export function usePreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setPrefs(DEFAULTS);
      setLoaded(false);
      return;
    }
    supabase
      .from("profiles")
      .select("auto_harvest, notifications_enabled, dark_mode, tutorial_done")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPrefs(data as Preferences);
        setLoaded(true);
      });
  }, [user]);

  // Apply dark mode globally
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", prefs.dark_mode);
  }, [prefs.dark_mode]);

  const update = useCallback(
    async (patch: Partial<Preferences>) => {
      const next = { ...prefs, ...patch };
      setPrefs(next);
      if (!user) return;
      await supabase.from("profiles").update(patch).eq("id", user.id);
    },
    [prefs, user]
  );

  return { prefs, loaded, update };
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function notify(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return; // only when tab is hidden
  try {
    new Notification(title, { body, icon: "/favicon.ico", silent: true });
  } catch {
    /* ignore */
  }
}