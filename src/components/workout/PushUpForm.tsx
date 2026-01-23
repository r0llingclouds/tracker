import { useState } from 'react';
import type { PushUpEntry } from '../../types/workout';
import { createPushUpEntry } from './api';

interface PushUpFormProps {
  onEntryCreated?: (entry: PushUpEntry) => void;
}

interface FormState {
  reps: string;
}

const initialFormState: FormState = {
  reps: '20',
};

export function PushUpForm({ onEntryCreated }: PushUpFormProps) {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const reps = parseInt(form.reps);

    if (!reps || reps <= 0) {
      setError('Reps must be a positive number');
      return;
    }

    setLoading(true);
    try {
      const entry = await createPushUpEntry({
        series: 1,  // Each log is one set
        reps
      });

      onEntryCreated?.(entry);
    } catch (err) {
      setError('Failed to save entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate preview
  const reps = parseInt(form.reps) || 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

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
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-rose-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-rose-700 focus:ring-4 focus:ring-rose-200 dark:focus:ring-rose-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Saving...' : 'Log Push Ups'}
      </button>
    </form>
  );
}
