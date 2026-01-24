import { useState } from 'react';
import type { Food } from '../../types/food';
import { createFood, createLog } from './api';

interface FoodFormProps {
  onFoodCreated?: (food: Food) => void;
}

interface FormState {
  name: string;
  kcal: string;
  protein: string;
  carbs: string;
  fats: string;
  sodium: string;
  caffeine: string;
  total_grams: string;
}

const initialFormState: FormState = {
  name: '',
  kcal: '',
  protein: '',
  carbs: '',
  fats: '',
  sodium: '',
  caffeine: '',
  total_grams: '',
};

export function FoodForm({ onFoodCreated }: FoodFormProps) {
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
    
    if (!form.name.trim()) {
      setError('Food name is required');
      return;
    }

    setLoading(true);
    try {
      const foodData = {
        name: form.name.trim(),
        kcal: parseFloat(form.kcal) || 0,
        protein: parseFloat(form.protein) || 0,
        carbs: parseFloat(form.carbs) || 0,
        fats: parseFloat(form.fats) || 0,
        sodium: parseFloat(form.sodium) || 0,
        caffeine: parseFloat(form.caffeine) || 0,
        total_grams: parseFloat(form.total_grams) || null,
      };

      const newFood = await createFood(foodData);

      // Also log it as today's entry
      await createLog(newFood.id, 1);

      setForm(initialFormState);
      onFoodCreated?.(newFood);
    } catch (err) {
      if (err instanceof Error && err.message.includes('already exists')) {
        setError('A food with this name already exists');
      } else {
        setError('Failed to create food. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputFields = [
    { name: 'kcal', label: 'Calories', unit: 'kcal', placeholder: '0' },
    { name: 'protein', label: 'Protein', unit: 'g', placeholder: '0' },
    { name: 'carbs', label: 'Carbs', unit: 'g', placeholder: '0' },
    { name: 'fats', label: 'Fats', unit: 'g', placeholder: '0' },
    { name: 'sodium', label: 'Sodium', unit: 'mg', placeholder: '0' },
    { name: 'caffeine', label: 'Caffeine', unit: 'mg', placeholder: '0' },
    { name: 'total_grams', label: 'Total Grams', unit: 'g', placeholder: '', step: 'any' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Food Name *
        </label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="e.g., Chicken Breast"
          className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {inputFields.map(({ name, label, unit, placeholder, step = '0.1' }) => (
          <div key={name}>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              {label} <span className="text-zinc-600 dark:text-zinc-400">({unit})</span>
            </label>
            <input
              type="number"
              name={name}
              value={form[name as keyof FormState]}
              onChange={handleChange}
              placeholder={placeholder}
              min="0"
              step={step}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            />
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-200 dark:focus:ring-emerald-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Saving...' : 'Save & Log Food'}
      </button>
    </form>
  );
}
