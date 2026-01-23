import { useState, useEffect, useCallback } from 'react';
import type { Food, FoodLog as FoodLogType, DailyData, DailySummary as DailySummaryType } from '../../types/food';
import { getLogs, getLogsSummary, createLog, deleteLog, getDailyData, updateFasting, addWater } from './api';
import { DailySummary } from './DailySummary';
import { FastingTracker } from './FastingTracker';
import { WaterTracker } from './WaterTracker';
import { FoodSearch } from './FoodSearch';
import { FoodLog } from './FoodLog';
import { FoodForm } from './FoodForm';
import { FoodParser } from './FoodParser';
import { MealLookup } from './MealLookup';
import { EditFoodModal } from './EditFoodModal';
import { EditLogModal } from './EditLogModal';

export function FoodTracker() {
  const [logs, setLogs] = useState<FoodLogType[]>([]);
  const [summary, setSummary] = useState<DailySummaryType | null>(null);
  const [dailyData, setDailyData] = useState<DailyData | null>(null);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [editingLog, setEditingLog] = useState<FoodLogType | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [logsRes, summaryRes, dailyRes] = await Promise.all([
        getLogs(),
        getLogsSummary(),
        getDailyData()
      ]);
      setLogs(logsRes);
      setSummary(summaryRes);
      setDailyData(dailyRes);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const handleFoodCreated = (food: Food) => {
    // After creating a new food, select it for logging
    setSelectedFood(food);
    setRefreshKey(k => k + 1);
  };

  const handleFoodSelected = async (food: Food, servings: number = 1) => {
    try {
      await createLog(food.id, servings);
      setSelectedFood(null);
      fetchData();
    } catch (error) {
      console.error('Error logging food:', error);
    }
  };

  const handleDeleteLog = async (logId: number) => {
    try {
      await deleteLog(logId);
      fetchData();
    } catch (error) {
      console.error('Error deleting log:', error);
    }
  };

  const handleEditFood = (food: Food) => {
    setEditingFood(food);
  };

  const handleFoodUpdated = () => {
    setRefreshKey(k => k + 1);
    fetchData();
  };

  const handleFoodDeleted = () => {
    setEditingFood(null);
    setRefreshKey(k => k + 1);
    fetchData();
  };

  const handleEditLog = (log: FoodLogType) => {
    setEditingLog(log);
  };

  const handleLogUpdated = () => {
    fetchData();
  };

  const handleFastingUpdate = async (data: { fasting_done: boolean; eating_start: number; eating_end: number }) => {
    try {
      const res = await updateFasting(data);
      setDailyData(res);
    } catch (error) {
      console.error('Error updating fasting:', error);
    }
  };

  const handleAddWater = async (amount: number) => {
    try {
      const res = await addWater(amount);
      setDailyData(res);
    } catch (error) {
      console.error('Error adding water:', error);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="min-h-full bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-emerald-800 dark:text-emerald-400 mb-2">Food Tracker</h1>
            <p className="text-gray-600 dark:text-gray-400">Track your daily nutrition intake</p>
          </header>

          <div className="grid gap-6">
            {/* Daily Summary */}
            <DailySummary summary={summary} />

            {/* Fasting & Water Tracking */}
            <div className="grid md:grid-cols-2 gap-6">
              <FastingTracker dailyData={dailyData} onUpdate={handleFastingUpdate} />
              <WaterTracker dailyData={dailyData} onAddWater={handleAddWater} />
            </div>

            {/* Food Search & Quick Log */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Log Food</h2>
              <FoodSearch 
                onSelect={handleFoodSelected} 
                onEditFood={handleEditFood}
                refreshKey={refreshKey}
              />
            </div>

            {/* Meal Lookup - Perplexity-powered */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-2 border-amber-100 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Meal Lookup</h2>
                <span className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">Experimental</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Describe your meal in natural language and search online for nutritional information
              </p>
              <MealLookup onFoodCreated={handleFoodCreated} />
            </div>

            {/* AI Food Parser */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-2 border-violet-100 dark:border-violet-800">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">AI Food Parser</h2>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Paste nutritional information text and let AI extract the values automatically
              </p>
              <FoodParser onFoodCreated={handleFoodCreated} />
            </div>

            {/* Add New Food Form */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Add New Food Manually</h2>
              <FoodForm onFoodCreated={handleFoodCreated} />
            </div>

            {/* Today's Log */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Today's Log</h2>
              <FoodLog logs={logs} onDelete={handleDeleteLog} onEdit={handleEditLog} />
            </div>
          </div>
        </div>

        {/* Edit Food Modal */}
        {editingFood && (
          <EditFoodModal
            food={editingFood}
            onClose={() => setEditingFood(null)}
            onFoodUpdated={handleFoodUpdated}
            onFoodDeleted={handleFoodDeleted}
          />
        )}

        {/* Edit Log Modal */}
        {editingLog && (
          <EditLogModal
            log={editingLog}
            onClose={() => setEditingLog(null)}
            onLogUpdated={handleLogUpdated}
          />
        )}
      </div>
    </main>
  );
}
