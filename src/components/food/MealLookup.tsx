import { useState } from 'react';
import type { Food, ParsedFood } from '../../types/food';
import { lookupMeal, createFood, createLog } from './api';

interface MealLookupProps {
  onFoodCreated?: (food: Food) => void;
}

export function MealLookup({ onFoodCreated }: MealLookupProps) {
  const [description, setDescription] = useState('');
  const [parsedData, setParsedData] = useState<ParsedFood | null>(null);
  const [editedData, setEditedData] = useState<ParsedFood | null>(null);
  const [rawResponse, setRawResponse] = useState('');
  const [sources, setSources] = useState<string[] | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async () => {
    if (!description.trim()) {
      setError('Please enter a meal description');
      return;
    }

    setLoading(true);
    setError('');
    setParsedData(null);
    setEditedData(null);
    setRawResponse('');
    setSources(null);

    try {
      const response = await lookupMeal(description);
      const { parsed, rawResponse: raw, sources: src } = response;
      setParsedData(parsed);
      setEditedData({ ...parsed });
      setRawResponse(raw || '');
      setSources(src || null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to lookup meal. Please try again.';
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
      setDescription('');
      setParsedData(null);
      setEditedData(null);
      setRawResponse('');
      setSources(null);
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
    setRawResponse('');
    setSources(null);
    setError('');
    setShowRaw(false);
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
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Describe your meal in natural language
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`Examples:
• 400ml leche proteina Mercadona y 300g cereales chocolate
• 2 huevos fritos y dos pechugas de pollo
• 230g raviolis de carne Rana con salsa de tomate
• Big Mac menu with medium fries and Coke`}
              rows={4}
              className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors resize-none"
            />
          </div>

          <button
            onClick={handleLookup}
            disabled={loading || !description.trim()}
            className="w-full bg-amber-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-amber-700 focus:ring-4 focus:ring-amber-200 dark:focus:ring-amber-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Searching online...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search Nutrition Info
              </>
            )}
          </button>
        </>
      ) : (
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Nutrition Found</span>
              </div>
              {rawResponse && (
                <button
                  onClick={() => setShowRaw(!showRaw)}
                  className="text-sm text-amber-600 dark:text-amber-400 hover:underline"
                >
                  {showRaw ? 'Hide' : 'Show'} raw response
                </button>
              )}
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Review and edit the extracted values below, then save.</p>
          </div>

          {showRaw && rawResponse && (
            <div className="bg-zinc-50 dark:bg-black rounded-lg p-4 max-h-60 overflow-y-auto">
              <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Your search:</h4>
              <pre className="text-xs text-amber-700 dark:text-amber-400 whitespace-pre-wrap font-mono mb-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                {description}
              </pre>
              <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Perplexity Response:</h4>
              <pre className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap font-mono">
                {rawResponse}
              </pre>
              {sources && sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <h5 className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Sources:</h5>
                  <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                    {sources.slice(0, 5).map((source, i) => (
                      <li key={i} className="truncate">
                        <a href={source} target="_blank" rel="noopener noreferrer" className="hover:text-amber-600 dark:hover:text-amber-400">
                          {source}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Food Name *
            </label>
            <input
              type="text"
              value={editedData?.name || ''}
              onChange={(e) => handleEditChange('name', e.target.value)}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {inputFields.map(({ name, label, unit, step = '0.1' }) => (
              <div key={name}>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {label} <span className="text-zinc-600 dark:text-zinc-400">({unit})</span>
                </label>
                <input
                  type="number"
                  value={editedData?.[name] || 0}
                  onChange={(e) => handleEditChange(name, e.target.value)}
                  min="0"
                  step={step}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 py-3 px-4 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
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
