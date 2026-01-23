import { useCallback, useEffect, useState } from "react";
import { toLocalDateString } from "./dates";

/**
 * Returns today's local date string (YYYY-MM-DD) and keeps it up to date across:
 * - midnight rollover while tab is open
 * - tab/background timer throttling (checks on focus/visibility)
 * - device sleep/wake
 * - minor system clock / timezone changes (periodic check)
 */
export function useTodayYmd(): string {
  const [today, setToday] = useState(() => toLocalDateString(new Date()));

  const updateIfChanged = useCallback(() => {
    const next = toLocalDateString(new Date());
    setToday((prev) => (prev === next ? prev : next));
  }, []);

  useEffect(() => {
    let timeoutId: number | null = null;
    let intervalId: number | null = null;

    const scheduleMidnightTick = () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const ms = Math.max(0, nextMidnight.getTime() - now.getTime() + 50); // small buffer
      timeoutId = window.setTimeout(() => {
        updateIfChanged();
        scheduleMidnightTick();
      }, ms);
    };

    const onFocus = () => updateIfChanged();
    const onVisibilityChange = () => {
      if (!document.hidden) updateIfChanged();
    };

    scheduleMidnightTick();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Fallback for throttled timers or clock/timezone changes.
    intervalId = window.setInterval(updateIfChanged, 60_000);

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (intervalId !== null) window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [updateIfChanged]);

  return today;
}
