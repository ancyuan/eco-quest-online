import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { setMixer, unlockAudio } from "@/lib/audio";

export interface Preferences {
  auto_harvest: boolean;
  notifications_enabled: boolean;
  dark_mode: boolean;
  tutorial_done: boolean;
  audio_music: number;   // 0..100
  audio_sfx: number;     // 0..100
  audio_muted: boolean;
  language: "id" | "en";
}

const DEFAULTS: Preferences = {
  auto_harvest: false,
  notifications_enabled: false,
  dark_mode: false,
  tutorial_done: false,
  audio_music: 60,
  audio_sfx: 80,
  audio_muted: false,
  language: "id",
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
      .select("auto_harvest, notifications_enabled, dark_mode, tutorial_done, audio_music, audio_sfx, audio_muted, language")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPrefs({ ...DEFAULTS, ...(data as Partial<Preferences>) });
        setLoaded(true);
      });
  }, [user]);

  // Apply dark mode globally
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", prefs.dark_mode);
  }, [prefs.dark_mode]);

  // Apply audio mixer whenever it changes
  useEffect(() => {
    setMixer({
      music: prefs.audio_music / 100,
      sfx: prefs.audio_sfx / 100,
      muted: prefs.audio_muted,
    });
  }, [prefs.audio_music, prefs.audio_sfx, prefs.audio_muted]);

  // Unlock AudioContext on first user gesture
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => { unlockAudio(); window.removeEventListener("pointerdown", handler); };
    window.addEventListener("pointerdown", handler, { once: true });
    return () => window.removeEventListener("pointerdown", handler);
  }, []);

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