import type { FoodLog as FoodLogType } from '../../types/food';

interface FoodLogProps {
  logs: FoodLogType[];
  onDelete: (logId: number) => void;
  onEdit: (log: FoodLogType) => void;
}

export function FoodLog({ logs, onDelete, onEdit }: FoodLogProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-600 dark:text-zinc-400">
        <svg className="w-12 h-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p>No foods logged today</p>
        <p className="text-sm mt-1">Search and log your first meal!</p>
      </div>
    );
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-3">
      {logs.map((log) => {
        const multiplier = log.servings;
        return (
          <div
            key={log.id}
            className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-zinc-800 dark:text-zinc-50">{log.name}</h3>
                  {log.servings !== 1 && (
                    <span className="text-sm bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                      x{log.servings}
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  {formatTime(log.logged_at)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                  <span className="bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-lg">
                    {Math.round(log.kcal * multiplier)} kcal
                  </span>
                  <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg">
                    P: {Math.round(log.protein * multiplier * 10) / 10}g
                  </span>
                  <span className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded-lg">
                    C: {Math.round(log.carbs * multiplier * 10) / 10}g
                  </span>
                  <span className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 px-2 py-1 rounded-lg">
                    F: {Math.round(log.fats * multiplier * 10) / 10}g
                  </span>
                  {log.sodium > 0 && (
                    <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-lg">
                      Na: {Math.round(log.sodium * multiplier)}mg
                    </span>
                  )}
                  {log.caffeine > 0 && (
                    <span className="bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 px-2 py-1 rounded-lg">
                      Caff: {Math.round(log.caffeine * multiplier)}mg
                    </span>
                  )}
                  {log.total_grams && log.total_grams > 0 && (
                    <span className="bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded-lg">
                      {Math.round(log.total_grams * multiplier * 10) / 10}g total
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEdit(log)}
                  className="text-zinc-600 dark:text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors p-1"
                  title="Edit entry"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => onDelete(log.id)}
                  className="text-zinc-600 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1"
                  title="Delete entry"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
