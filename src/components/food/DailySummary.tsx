import type { DailySummary as DailySummaryType } from '../../types/food';

interface DailySummaryProps {
  summary: DailySummaryType | null;
}

export function DailySummary({ summary }: DailySummaryProps) {
  if (!summary) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const nutrients = [
    { 
      key: 'total_kcal' as const, 
      label: 'Calories', 
      unit: 'kcal', 
      color: 'bg-gradient-to-br from-orange-400 to-orange-500',
      textColor: 'text-white'
    },
    { 
      key: 'total_protein' as const, 
      label: 'Protein', 
      unit: 'g', 
      color: 'bg-gradient-to-br from-blue-400 to-blue-500',
      textColor: 'text-white'
    },
    { 
      key: 'total_carbs' as const, 
      label: 'Carbs', 
      unit: 'g', 
      color: 'bg-gradient-to-br from-yellow-400 to-yellow-500',
      textColor: 'text-white'
    },
    { 
      key: 'total_fats' as const, 
      label: 'Fats', 
      unit: 'g', 
      color: 'bg-gradient-to-br from-red-400 to-red-500',
      textColor: 'text-white'
    },
    { 
      key: 'total_sodium' as const, 
      label: 'Sodium', 
      unit: 'mg', 
      color: 'bg-gradient-to-br from-purple-400 to-purple-500',
      textColor: 'text-white'
    },
    { 
      key: 'total_caffeine' as const, 
      label: 'Caffeine', 
      unit: 'mg', 
      color: 'bg-gradient-to-br from-teal-400 to-teal-500',
      textColor: 'text-white'
    },
  ];

  const formatValue = (value: number, unit: string) => {
    if (unit === 'kcal' || unit === 'mg') {
      return Math.round(value);
    }
    return Math.round(value * 10) / 10;
  };

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Daily Summary</h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">{today}</span>
      </div>
      
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {nutrients.map(({ key, label, unit, color, textColor }) => (
          <div
            key={key}
            className={`${color} rounded-xl p-3 text-center shadow-md`}
          >
            <div className={`text-2xl font-bold ${textColor}`}>
              {formatValue(summary[key] || 0, unit)}
            </div>
            <div className={`text-xs ${textColor} opacity-90`}>
              {label}
            </div>
            <div className={`text-xs ${textColor} opacity-75`}>
              {unit}
            </div>
          </div>
        ))}
      </div>

      {summary.total_entries > 0 && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          {summary.total_entries} {summary.total_entries === 1 ? 'entry' : 'entries'} logged today
        </p>
      )}
    </div>
  );
}
