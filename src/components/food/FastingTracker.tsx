import { useState, useEffect } from 'react';
import type { DailyData } from '../../types/food';

interface FastingTrackerProps {
  dailyData: DailyData | null;
  onUpdate: (data: { fasting_done: boolean; eating_start: number; eating_end: number }) => void;
}

export function FastingTracker({ dailyData, onUpdate }: FastingTrackerProps) {
  const [fastingDone, setFastingDone] = useState(false);
  const [eatingStart, setEatingStart] = useState(13);
  const [eatingEnd, setEatingEnd] = useState(20);

  useEffect(() => {
    if (dailyData) {
      setFastingDone(dailyData.fasting_done);
      setEatingStart(dailyData.eating_start);
      setEatingEnd(dailyData.eating_end);
    }
  }, [dailyData]);

  const handleFastingToggle = () => {
    const newValue = !fastingDone;
    setFastingDone(newValue);
    onUpdate({ fasting_done: newValue, eating_start: eatingStart, eating_end: eatingEnd });
  };

  const handleStartChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(e.target.value);
    setEatingStart(value);
    onUpdate({ fasting_done: fastingDone, eating_start: value, eating_end: eatingEnd });
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(e.target.value);
    setEatingEnd(value);
    onUpdate({ fasting_done: fastingDone, eating_start: eatingStart, eating_end: value });
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-2 border-cyan-100 dark:border-cyan-800">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-6 h-6 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Intermittent Fasting</h2>
      </div>

      {/* Fasting Done Checkbox */}
      <label className="flex items-center gap-3 mb-5 cursor-pointer group">
        <div className="relative">
          <input
            type="checkbox"
            checked={fastingDone}
            onChange={handleFastingToggle}
            className="sr-only peer"
          />
          <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 rounded-md peer-checked:bg-cyan-500 peer-checked:border-cyan-500 transition-colors flex items-center justify-center">
            {fastingDone && (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
        <span className="text-gray-700 dark:text-gray-300 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
          Did intermittent fasting today
        </span>
      </label>

      {/* Eating Window */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Eating Window</p>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start</label>
            <select
              value={eatingStart}
              onChange={handleStartChange}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              {[...Array(24)].map((_, i) => (
                <option key={i} value={i}>{formatHour(i)}</option>
              ))}
            </select>
          </div>
          <div className="text-gray-400 dark:text-gray-500 pt-5">to</div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">End</label>
            <select
              value={eatingEnd}
              onChange={handleEndChange}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              {[...Array(24)].map((_, i) => (
                <option key={i} value={i}>{formatHour(i)}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          {eatingEnd > eatingStart 
            ? `${eatingEnd - eatingStart}h eating window`
            : eatingEnd < eatingStart 
              ? `${24 - eatingStart + eatingEnd}h eating window`
              : '0h eating window'}
        </p>
      </div>
    </div>
  );
}
