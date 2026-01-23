import { useState } from 'react';
import type { KettlebellEntry } from '../../types/workout';
import { createKettlebellEntry } from './api';

interface KettlebellFormProps {
  onEntryCreated?: (entry: KettlebellEntry) => void;
}

interface FormState {
  weight: string;
  reps: string;
  singleHanded: boolean;
}

const initialFormState: FormState = {
  weight: '24',
  reps: '10',
  singleHanded: false,
};

export function KettlebellForm({ onEntryCreated }: KettlebellFormProps) {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const weight = parseFloat(form.weight);
    const reps = parseInt(form.reps);

    if (!weight || weight <= 0) {
      setError('Weight must be a positive number');
      return;
    }
    if (!reps || reps <= 0) {
      setError('Reps must be a positive number');
      return;
    }

    setLoading(true);
    try {
      const entry = await createKettlebellEntry({
        weight,
        series: 1,  // Each log is one set
        reps,
        singleHanded: form.singleHanded
      });

      onEntryCreated?.(entry);
    } catch (err) {
      setError('Failed to save entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate preview
  const weight = parseFloat(form.weight) || 0;
  const reps = parseInt(form.reps) || 0;
  const handMultiplier = form.singleHanded ? 1 : 2;
  const volume = weight * reps * handMultiplier;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Weight <span className="text-gray-400 dark:text-gray-500">(kg)</span>
          </label>
          <input
            type="number"
            name="weight"
            value={form.weight}
            onChange={handleChange}
            placeholder="16"
            min="1"
            step="0.5"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Reps
          </label>
          <input
            type="number"
            name="reps"
            value={form.reps}
            onChange={handleChange}
            placeholder="10"
            min="1"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            name="singleHanded"
            checked={form.singleHanded}
            onChange={handleChange}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-amber-500"></div>
          <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            Single-handed
          </span>
        </label>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          ({form.singleHanded ? 'One arm at a time' : 'Both hands on kettlebell'})
        </span>
      </div>

      {/* Preview */}
      {reps > 0 && volume > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-amber-700 dark:text-amber-300">
            {reps} reps
          </span>
          <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            {volume.toLocaleString()} kg volume
          </span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-amber-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-amber-700 focus:ring-4 focus:ring-amber-200 dark:focus:ring-amber-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Saving...' : 'Log Kettlebell Swings'}
      </button>
    </form>
  );
}
