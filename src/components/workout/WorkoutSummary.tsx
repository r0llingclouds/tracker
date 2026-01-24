import type { WorkoutSummary as WorkoutSummaryType } from '../../types/workout';

interface WorkoutSummaryProps {
  summary: WorkoutSummaryType;
}

export function WorkoutSummary({ summary }: WorkoutSummaryProps) {

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const stats = [
    { 
      label: 'KB Swings', 
      value: summary.kettlebell_total_reps,
      color: 'bg-gradient-to-br from-amber-400 to-amber-500',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      )
    },
    { 
      label: 'Volume', 
      value: `${summary.kettlebell_total_volume.toLocaleString()} kg`,
      color: 'bg-gradient-to-br from-amber-500 to-orange-500',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    { 
      label: 'KB Time', 
      value: formatDuration(summary.kettlebell_total_time),
      color: 'bg-gradient-to-br from-amber-600 to-amber-700',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      label: 'Push Ups', 
      value: summary.pushup_total_reps,
      color: 'bg-gradient-to-br from-rose-400 to-rose-500',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      )
    },
    { 
      label: 'PU Time', 
      value: formatDuration(summary.pushup_total_time),
      color: 'bg-gradient-to-br from-rose-600 to-rose-700',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
  ];

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  const totalEntries = summary.kettlebell_entries + summary.pushup_entries;

  return (
    <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-50">Workout Summary</h2>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">{today}</span>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {stats.map(({ label, value, color, icon }) => (
          <div
            key={label}
            className={`${color} rounded-xl p-4 text-center shadow-md`}
          >
            <div className="flex justify-center mb-2 text-white opacity-80">
              {icon}
            </div>
            <div className="text-2xl font-bold text-white">
              {value}
            </div>
            <div className="text-xs text-white opacity-90">
              {label}
            </div>
          </div>
        ))}
      </div>

      {totalEntries > 0 && (
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400 mt-4">
          {totalEntries} {totalEntries === 1 ? 'set' : 'sets'} logged today
        </p>
      )}
    </div>
  );
}
