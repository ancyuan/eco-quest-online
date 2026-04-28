import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WEATHERS, WEATHER_CYCLE_MS, pickWeather, type Weather, type WeatherState } from "@/lib/game";

// Local fallback so leaderboard fairness still holds: derive weather from current epoch window.
function deriveLocalWeather(now: number): WeatherState {
  const window = Math.floor(now / WEATHER_CYCLE_MS);
  return {
    weather: pickWeather(window),
    startedAt: window * WEATHER_CYCLE_MS,
    durationMs: WEATHER_CYCLE_MS,
  };
}

export function useWeather(): WeatherState {
  const [state, setState] = useState<WeatherState>(() => deriveLocalWeather(Date.now()));

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const { data } = await supabase
        .from("weather_state")
        .select("weather, started_at, duration_ms")
        .eq("id", 1)
        .maybeSingle();
      if (cancelled) return;
      const now = Date.now();
      if (data) {
        const startedAt = new Date(data.started_at).getTime();
        const expires = startedAt + data.duration_ms;
        if (expires > now) {
          setState({
            weather: data.weather as Weather,
            startedAt,
            durationMs: data.duration_ms,
          });
          return;
        }
      }
      // expired or missing → derive locally; everyone using same epoch window stays in sync.
      setState(deriveLocalWeather(now));
    }

    refresh();
    const id = setInterval(refresh, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Re-tick every second to update countdown HUD.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // If current state expired, advance window
  const now = Date.now();
  if (state.startedAt + state.durationMs <= now) {
    return deriveLocalWeather(now);
  }
  return state;
}

export { WEATHERS };
