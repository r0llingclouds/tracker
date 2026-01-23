import { useState } from 'react';
import type { Food, ParsedFood } from '../../types/food';
import { parseFood, createFood, createLog } from './api';

interface FoodParserProps {
  onFoodCreated?: (food: Food) => void;
}

export function FoodParser({ onFoodCreated }: FoodParserProps) {
  const [text, setText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedFood | null>(null);
  const [editedData, setEditedData] = useState<ParsedFood | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleParse = async () => {
    if (!text.trim()) {
      setError('Please paste some text to parse');
      return;
    }

    setLoading(true);
    setError('');
    setParsedData(null);
    setEditedData(null);

    try {
      const response = await parseFood(text);
      const parsed = response.parsed;
      setParsedData(parsed);
      setEditedData({ ...parsed });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to parse text. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEditChange = (field: keyof ParsedFood, value: string) => {
    setEditedData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: field === 'name' ? value : (field === 'total_grams' ? (parseFloat(value) || null) : (parseFloat(value) || 0))
      };
    });
  };

  const handleSave = async () => {
    if (!editedData?.name?.trim()) {
      setError('Food name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Create the food entry
      const newFood = await createFood({
        name: editedData.name,
        kcal: editedData.kcal,
        protein: editedData.protein,
        carbs: editedData.carbs,
        fats: editedData.fats,
        sodium: editedData.sodium,
        caffeine: editedData.caffeine,
        total_grams: editedData.total_grams || null,
      });
      
      // Also log it as today's entry
      await createLog(newFood.id, 1);
      
      onFoodCreated?.(newFood);
      // Reset form
      setText('');
      setParsedData(null);
      setEditedData(null);
    } catch (err) {
      if (err instanceof Error && err.message.includes('already exists')) {
        setError('A food with this name already exists');
      } else {
        setError('Failed to save food. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setParsedData(null);
    setEditedData(null);
    setError('');
  };

  const inputFields = [
    { name: 'kcal' as const, label: 'Calories', unit: 'kcal' },
    { name: 'protein' as const, label: 'Protein', unit: 'g' },
    { name: 'carbs' as const, label: 'Carbs', unit: 'g' },
    { name: 'fats' as const, label: 'Fats', unit: 'g' },
    { name: 'sodium' as const, label: 'Sodium', unit: 'mg' },
    { name: 'caffeine' as const, label: 'Caffeine', unit: 'mg' },
    { name: 'total_grams' as const, label: 'Total Grams', unit: 'g', step: 'any' },
  ];

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {!parsedData ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Paste nutritional information text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Paste text containing nutritional information here...

Example:
Total del bol (leche + 300 g cereales)
Kcal totales: ~1.360 kcal
Proteínas: ~30 g
Carbohidratos: ~228 g
Grasas: ~43 g
Sodio: ~730 mg`}
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors resize-none font-mono text-sm"
            />
          </div>

          <button
            onClick={handleParse}
            disabled={loading || !text.trim()}
            className="w-full bg-violet-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-violet-700 focus:ring-4 focus:ring-violet-200 dark:focus:ring-violet-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Parsing with AI...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Parse with AI
              </>
            )}
          </button>
        </>
      ) : (
        <div className="space-y-4">
          <div className="bg-violet-50 dark:bg-violet-900/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">AI Parsed Successfully</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Review and edit the extracted values below, then save.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Food Name *
            </label>
            <input
              type="text"
              value={editedData?.name || ''}
              onChange={(e) => handleEditChange('name', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {inputFields.map(({ name, label, unit, step = '0.1' }) => (
              <div key={name}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {label} <span className="text-gray-400 dark:text-gray-500">({unit})</span>
                </label>
                <input
                  type="number"
                  value={editedData?.[name] || 0}
                  onChange={(e) => handleEditChange(name, e.target.value)}
                  min="0"
                  step={step}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-200 dark:focus:ring-emerald-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save & Log Food'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
