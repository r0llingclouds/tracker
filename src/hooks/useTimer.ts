import { useState, useEffect } from 'react';

/**
 * Format milliseconds into a human-readable time string
 * @param ms - Time in milliseconds
 * @returns Formatted string (MM:SS or H:MM:SS for longer durations)
 */
export function formatTime(ms: number): string {
  if (ms < 0) ms = 0;
  
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Calculate the current elapsed time for a task
 * @param timeSpent - Accumulated time in milliseconds
 * @param timerStartedAt - Timestamp when timer was started (null if paused)
 * @returns Current total elapsed time in milliseconds
 */
export function calculateElapsedTime(timeSpent: number, timerStartedAt: Date | null): number {
  if (!timerStartedAt) {
    return timeSpent;
  }
  const now = Date.now();
  const startTime = timerStartedAt instanceof Date ? timerStartedAt.getTime() : new Date(timerStartedAt).getTime();
  return timeSpent + (now - startTime);
}

/**
 * Custom hook for live timer updates
 * Returns the current elapsed time and formatted string, updating every second when running
 */
export function useTimer(timeSpent: number, timerStartedAt: Date | null): {
  elapsedTime: number;
  formattedTime: string;
  isRunning: boolean;
} {
  const isRunning = timerStartedAt !== null;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isRunning) return;

    // Update every second while timer is running
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  // Force recalculation on each tick
  const elapsedTime = calculateElapsedTime(timeSpent, timerStartedAt);
  
  // Use tick in dependency to ensure fresh calculation
  void tick;

  return {
    elapsedTime,
    formattedTime: formatTime(elapsedTime),
    isRunning,
  };
}
