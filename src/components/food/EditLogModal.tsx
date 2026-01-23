import { useState, useEffect } from 'react';
import type { FoodLog } from '../../types/food';
import { updateLog } from './api';

interface EditLogModalProps {
  log: FoodLog;
  onClose: () => void;
  onLogUpdated?: (log: FoodLog) => void;
}

export function EditLogModal({ log, onClose, onLogUpdated }: EditLogModalProps) {
  const [servings, setServings] = useState(1);
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (log) {
      setServings(log.servings || 1);
      // Convert ISO timestamp to local datetime-local format
      const date = new Date(log.logged_at);
      const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setTime(localDateTime);
    }
  }, [log]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (servings <= 0) {
      setError('Servings must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      // Convert local datetime back to ISO string
      const loggedAt = new Date(time).toISOString();
      
      const updated = await updateLog(log.id, { 
        servings: Number(servings), 
        logged_at: loggedAt 
      });
      onLogUpdated?.(updated);
      onClose();
    } catch {
      setError('Failed to update log entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!log) return null;

  const multiplier = servings;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Edit Log Entry</h2>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">{log.name}</h3>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {log.kcal} kcal per serving
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Servings
              </label>
              <input
                type="number"
                value={servings}
                onChange={(e) => {
                  setServings(Math.max(0.1, parseFloat(e.target.value) || 0.1));
                  setError('');
                }}
                min="0.1"
                step="any"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={time}
                onChange={(e) => {
                  setTime(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg p-3 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">Total for {servings} serving(s):</span>
              <div className="text-gray-600 dark:text-gray-400 mt-1 flex flex-wrap gap-2">
                <span>{Math.round(log.kcal * multiplier)} kcal</span>
                <span>|</span>
                <span>P: {Math.round(log.protein * multiplier * 10) / 10}g</span>
                <span>C: {Math.round(log.carbs * multiplier * 10) / 10}g</span>
                <span>F: {Math.round(log.fats * multiplier * 10) / 10}g</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-200 dark:focus:ring-emerald-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
