import type { DailyData } from '../../types/food';

interface WaterTrackerProps {
  dailyData: DailyData | null;
  onAddWater: (amount: number) => void;
}

export function WaterTracker({ dailyData, onAddWater }: WaterTrackerProps) {
  const waterMl = dailyData?.water_ml || 0;
  const waterLiters = (waterMl / 1000).toFixed(1);

  const handleAdd = (amount: number) => {
    onAddWater(amount);
  };

  // Calculate fill percentage (assuming 3L daily goal)
  const fillPercent = Math.min((waterMl / 3000) * 100, 100);

  return (
    <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-lg p-6 border-2 border-blue-100 dark:border-blue-800">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
        <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-50">Water Intake</h2>
      </div>

      {/* Water Display */}
      <div className="text-center mb-5">
        <div className="relative inline-block">
          {/* Water Drop Visual */}
          <div className="w-24 h-28 mx-auto relative">
            <svg viewBox="0 0 100 120" className="w-full h-full">
              {/* Drop outline */}
              <path
                d="M50 10 C20 50, 10 80, 50 110 C90 80, 80 50, 50 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-blue-200 dark:text-blue-900"
              />
              {/* Fill mask */}
              <defs>
                <clipPath id="dropClip">
                  <path d="M50 10 C20 50, 10 80, 50 110 C90 80, 80 50, 50 10" />
                </clipPath>
              </defs>
              {/* Fill */}
              <rect
                x="0"
                y={120 - (fillPercent * 1.1)}
                width="100"
                height={fillPercent * 1.1}
                fill="url(#waterGradient)"
                clipPath="url(#dropClip)"
              />
              <defs>
                <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          
          {/* Amount Display */}
          <div className="mt-2">
            <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">{waterMl}</span>
            <span className="text-lg text-zinc-600 dark:text-zinc-400 ml-1">mL</span>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {waterLiters} L
          </p>
        </div>
      </div>

      {/* Quick Add Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => handleAdd(-250)}
          disabled={waterMl < 250}
          className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg disabled:shadow-none transition-all duration-200 flex items-center justify-center gap-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
          250
        </button>
        <button
          onClick={() => handleAdd(250)}
          className="flex-1 bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          250
        </button>
        <button
          onClick={() => handleAdd(500)}
          className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          500
        </button>
      </div>
    </div>
  );
}
