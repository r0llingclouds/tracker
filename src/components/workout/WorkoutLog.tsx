import type { KettlebellEntry, PushUpEntry } from '../../types/workout';

interface WorkoutLogProps {
  kettlebellEntries: KettlebellEntry[];
  pushUpEntries: PushUpEntry[];
  onDeleteKettlebell: (id: number) => void;
  onDeletePushUp: (id: number) => void;
}

export function WorkoutLog({ 
  kettlebellEntries, 
  pushUpEntries, 
  onDeleteKettlebell, 
  onDeletePushUp 
}: WorkoutLogProps) {
  const hasEntries = kettlebellEntries.length > 0 || pushUpEntries.length > 0;

  if (!hasEntries) {
    return (
      <div className="text-center py-8 text-zinc-600 dark:text-zinc-400">
        <svg className="w-12 h-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p>No workouts logged today</p>
        <p className="text-sm mt-1">Log your first set above!</p>
      </div>
    );
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      {/* Kettlebell Entries */}
      {kettlebellEntries.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Kettlebell Swings
          </h3>
          <div className="space-y-2">
            {kettlebellEntries.map((entry) => {
              const handMultiplier = entry.singleHanded ? 1 : 2;
              const volume = entry.weight * entry.reps * handMultiplier;
              
              return (
                <div
                  key={entry.id}
                  className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-50">
                        {entry.weight}kg × {entry.reps} reps
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        entry.singleHanded 
                          ? 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200' 
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                      }`}>
                        {entry.singleHanded ? '1H' : '2H'}
                      </span>
                      <span className="text-sm text-amber-700 dark:text-amber-300">
                        {volume.toLocaleString()} kg
                      </span>
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">
                        {formatTime(entry.created_at)}
                      </span>
                    </div>
                    <button
                      onClick={() => onDeleteKettlebell(entry.id)}
                      className="text-zinc-600 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1"
                      title="Delete entry"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Push Up Entries */}
      {pushUpEntries.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-400 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            Push Ups
          </h3>
          <div className="space-y-2">
            {pushUpEntries.map((entry) => (
              <div
                key={entry.id}
                className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-3 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-50">
                      {entry.reps} reps
                    </span>
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                      {formatTime(entry.created_at)}
                    </span>
                  </div>
                  <button
                    onClick={() => onDeletePushUp(entry.id)}
                    className="text-zinc-600 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1"
                    title="Delete entry"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
