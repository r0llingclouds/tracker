import { useState, useEffect, useCallback } from 'react';

interface WorkoutTimerProps {
  initialSeconds: number;
  onTimeUpdate: (seconds: number) => void;
  color: 'amber' | 'rose';
}

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function WorkoutTimer({ initialSeconds, onTimeUpdate, color }: WorkoutTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Sync with initial value when it changes from server
  useEffect(() => {
    if (!isRunning) {
      setSeconds(initialSeconds);
    }
  }, [initialSeconds, isRunning]);

  // Timer tick
  useEffect(() => {
    if (!isRunning || startTime === null) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setSeconds(initialSeconds + elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, startTime, initialSeconds]);

  const handleStart = useCallback(() => {
    setStartTime(Date.now());
    setIsRunning(true);
  }, []);

  const handleStop = useCallback(() => {
    setIsRunning(false);
    setStartTime(null);
    // Save the current time to server
    onTimeUpdate(seconds);
  }, [seconds, onTimeUpdate]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setStartTime(null);
    setSeconds(0);
    onTimeUpdate(0);
  }, [onTimeUpdate]);

  const colorClasses = {
    amber: {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-800 dark:text-amber-200',
      button: 'bg-amber-600 hover:bg-amber-700',
      buttonOutline: 'border-amber-600 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30'
    },
    rose: {
      bg: 'bg-rose-100 dark:bg-rose-900/30',
      text: 'text-rose-800 dark:text-rose-200',
      button: 'bg-rose-600 hover:bg-rose-700',
      buttonOutline: 'border-rose-600 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30'
    }
  };

  const colors = colorClasses[color];

  return (
    <div className={`${colors.bg} rounded-xl p-4 flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <svg className={`w-5 h-5 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className={`font-mono text-2xl font-bold ${colors.text}`}>
          {formatTime(seconds)}
        </span>
        {isRunning && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-xs text-green-600 dark:text-green-400">Running</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {!isRunning ? (
          <button
            onClick={handleStart}
            className={`${colors.button} text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Start
          </button>
        ) : (
          <button
            onClick={handleStop}
            className={`${colors.button} text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
            Stop
          </button>
        )}
        
        {seconds > 0 && !isRunning && (
          <button
            onClick={handleReset}
            className={`border ${colors.buttonOutline} px-3 py-2 rounded-lg font-medium transition-colors`}
            title="Reset timer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
