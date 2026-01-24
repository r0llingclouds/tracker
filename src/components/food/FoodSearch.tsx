import { useState, useEffect, useRef } from 'react';
import type { Food } from '../../types/food';
import { getFoods } from './api';

interface FoodSearchProps {
  onSelect: (food: Food, servings: number) => void;
  onEditFood?: (food: Food) => void;
  refreshKey: number;
}

export function FoodSearch({ onSelect, onEditFood, refreshKey }: FoodSearchProps) {
  const [query, setQuery] = useState('');
  const [foods, setFoods] = useState<Food[]>([]);
  const [filteredFoods, setFilteredFoods] = useState<Food[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [servings, setServings] = useState(1);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch all foods on mount and when refreshKey changes
  useEffect(() => {
    const fetchFoods = async () => {
      try {
        const foodList = await getFoods();
        setFoods(foodList);
        
        // Clear selection if the selected food was deleted
        if (selectedFood && !foodList.find(f => f.id === selectedFood.id)) {
          setSelectedFood(null);
          setQuery('');
        }
      } catch (error) {
        console.error('Error fetching foods:', error);
      }
    };
    fetchFoods();
  }, [refreshKey, selectedFood]);

  // Filter foods based on query
  useEffect(() => {
    if (query.trim()) {
      const filtered = foods.filter(food =>
        food.name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredFoods(filtered);
      setShowDropdown(filtered.length > 0 && !selectedFood);
      setSelectedIndex(-1);
    } else {
      setFilteredFoods([]);
      setShowDropdown(false);
    }
  }, [query, foods, selectedFood]);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredFoods.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectFood(filteredFoods[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        break;
    }
  };

  const handleSelectFood = (food: Food) => {
    setSelectedFood(food);
    setQuery(food.name);
    setShowDropdown(false);
  };

  const handleLogFood = () => {
    if (selectedFood) {
      onSelect(selectedFood, servings);
      setQuery('');
      setSelectedFood(null);
      setServings(1);
    }
  };

  const handleCopyFood = async () => {
    if (selectedFood) {
      const text = `${selectedFood.name} - ${selectedFood.kcal} kcal, ${selectedFood.protein}g protein, ${selectedFood.carbs}g carbs, ${selectedFood.fats}g fats, ${selectedFood.sodium}mg sodium, ${selectedFood.caffeine}mg caffeine`;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const formatNutrient = (value: number, unit: string) => {
    return `${value}${unit}`;
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedFood(null);
          }}
          onFocus={() => query.trim() && filteredFoods.length > 0 && setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search saved foods..."
          className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
        />
        
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {filteredFoods.map((food, index) => (
              <button
                key={food.id}
                onClick={() => handleSelectFood(food)}
                className={`w-full px-4 py-3 text-left hover:bg-emerald-50 dark:hover:bg-zinc-800 transition-colors ${
                  index === selectedIndex ? 'bg-emerald-50 dark:bg-zinc-800' : ''
                }`}
              >
                <div className="font-medium text-zinc-800 dark:text-zinc-50">{food.name}</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 flex flex-wrap gap-2 mt-1">
                  <span>{formatNutrient(food.kcal, ' kcal')}</span>
                  <span className="text-zinc-300 dark:text-zinc-600">|</span>
                  <span>P: {formatNutrient(food.protein, 'g')}</span>
                  <span>C: {formatNutrient(food.carbs, 'g')}</span>
                  <span>F: {formatNutrient(food.fats, 'g')}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedFood && (
        <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-zinc-800 dark:text-zinc-50">{selectedFood.name}</h3>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 grid grid-cols-3 gap-x-4 gap-y-1">
                <span>Calories: {selectedFood.kcal} kcal</span>
                <span>Protein: {selectedFood.protein}g</span>
                <span>Carbs: {selectedFood.carbs}g</span>
                <span>Fats: {selectedFood.fats}g</span>
                <span>Sodium: {selectedFood.sodium}mg</span>
                <span>Caffeine: {selectedFood.caffeine}mg</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyFood}
                className={`p-1 transition-all duration-200 ${
                  copied 
                    ? 'text-green-500 dark:text-green-400 scale-110' 
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-violet-500 dark:hover:text-violet-400'
                }`}
                title={copied ? 'Copied!' : 'Copy food info for AI parser'}
              >
                {copied ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => onEditFood?.(selectedFood)}
                className="text-zinc-600 dark:text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors p-1"
                title="Edit food"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setSelectedFood(null);
                  setQuery('');
                }}
                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1"
                title="Clear selection"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Servings:</label>
              <input
                type="number"
                value={servings}
                onChange={(e) => setServings(Math.max(0.1, parseFloat(e.target.value) || 1))}
                min="0.1"
                step="any"
                className="w-20 px-3 py-2 border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <button
              onClick={handleLogFood}
              className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-200 dark:focus:ring-emerald-800 transition-all"
            >
              Log Food
            </button>
          </div>

          <div className="text-sm text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-950 rounded-lg p-3">
            <span className="font-medium">Total for {servings} serving(s):</span>
            <span className="ml-2">
              {Math.round(selectedFood.kcal * servings)} kcal, 
              {Math.round(selectedFood.protein * servings * 10) / 10}g protein
            </span>
          </div>
        </div>
      )}

      {foods.length === 0 && (
        <p className="text-zinc-600 dark:text-zinc-400 text-center py-4">
          No foods saved yet. Add your first food below!
        </p>
      )}
    </div>
  );
}
