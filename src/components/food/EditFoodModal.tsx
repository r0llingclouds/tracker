import { useState, useEffect } from 'react';
import type { Food } from '../../types/food';
import { updateFood, deleteFood } from './api';

interface EditFoodModalProps {
  food: Food;
  onClose: () => void;
  onFoodUpdated?: (food: Food) => void;
  onFoodDeleted?: (id: number) => void;
}

interface FormState {
  name: string;
  kcal: string;
  protein: string;
  carbs: string;
  fats: string;
  sodium: string;
  caffeine: string;
}

export function EditFoodModal({ food, onClose, onFoodUpdated, onFoodDeleted }: EditFoodModalProps) {
  const [form, setForm] = useState<FormState>({
    name: '',
    kcal: '',
    protein: '',
    carbs: '',
    fats: '',
    sodium: '',
    caffeine: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (food) {
      setForm({
        name: food.name || '',
        kcal: food.kcal?.toString() || '',
        protein: food.protein?.toString() || '',
        carbs: food.carbs?.toString() || '',
        fats: food.fats?.toString() || '',
        sodium: food.sodium?.toString() || '',
        caffeine: food.caffeine?.toString() || '',
      });
    }
  }, [food]);

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
        total_grams: null,
      };

      const updated = await updateFood(food.id, foodData);
      onFoodUpdated?.(updated);
      onClose();
    } catch (err) {
      if (err instanceof Error && err.message.includes('already exists')) {
        setError('A food with this name already exists');
      } else {
        setError('Failed to update food. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteFood(food.id);
      onFoodDeleted?.(food.id);
      onClose();
    } catch {
      setError('Failed to delete food. Please try again.');
      setShowConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const inputFields = [
    { name: 'kcal', label: 'Calories', unit: 'kcal', placeholder: '0' },
    { name: 'protein', label: 'Protein', unit: 'g', placeholder: '0' },
    { name: 'carbs', label: 'Carbs', unit: 'g', placeholder: '0' },
    { name: 'fats', label: 'Fats', unit: 'g', placeholder: '0' },
    { name: 'sodium', label: 'Sodium', unit: 'mg', placeholder: '0' },
    { name: 'caffeine', label: 'Caffeine', unit: 'mg', placeholder: '0' },
  ];

  if (!food) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Edit Food</h2>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 py-2 rounded-lg mb-4">
            Changes will affect all log entries using this food.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Food Name *
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g., Chicken Breast"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {inputFields.map(({ name, label, unit, placeholder }) => (
                <div key={name}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {label} <span className="text-gray-400 dark:text-gray-500">({unit})</span>
                  </label>
                  <input
                    type="number"
                    name={name}
                    value={form[name as keyof FormState]}
                    onChange={handleChange}
                    placeholder={placeholder}
                    min="0"
                    step="0.1"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                </div>
              ))}
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

            {/* Delete section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              {!showConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowConfirm(true)}
                  className="w-full text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium py-2 transition-colors"
                >
                  Delete Food
                </button>
              ) : (
                <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    This will permanently delete this food and remove it from all daily logs. This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowConfirm(false)}
                      disabled={deleting}
                      className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
