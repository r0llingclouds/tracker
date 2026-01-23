import { useState, useEffect, useCallback } from 'react';
import type { KettlebellEntry, PushUpEntry, WorkoutSummary as WorkoutSummaryType, DailyWorkoutData } from '../../types/workout';
import { 
  getKettlebellEntries, 
  getPushUpEntries, 
  getWorkoutSummary,
  getDailyWorkoutData,
  updateDailyWorkoutData,
  deleteKettlebellEntry,
  deletePushUpEntry
} from './api';
import { WorkoutSummary } from './WorkoutSummary';
import { KettlebellForm } from './KettlebellForm';
import { PushUpForm } from './PushUpForm';
import { WorkoutLog } from './WorkoutLog';
import { WorkoutTimer } from './WorkoutTimer';

const defaultSummary: WorkoutSummaryType = {
  kettlebell_total_reps: 0,
  kettlebell_total_volume: 0,
  kettlebell_total_time: 0,
  kettlebell_entries: 0,
  pushup_total_reps: 0,
  pushup_total_time: 0,
  pushup_entries: 0
};

const defaultDailyData: DailyWorkoutData = {
  date: new Date().toISOString().split('T')[0],
  kettlebell_time: 0,
  pushup_time: 0
};

export function WorkoutTracker() {
  const [kettlebellEntries, setKettlebellEntries] = useState<KettlebellEntry[]>([]);
  const [pushUpEntries, setPushUpEntries] = useState<PushUpEntry[]>([]);
  const [summary, setSummary] = useState<WorkoutSummaryType>(defaultSummary);
  const [dailyData, setDailyData] = useState<DailyWorkoutData>(defaultDailyData);

  const fetchData = useCallback(async () => {
    try {
      const [kettlebellRes, pushUpRes, summaryRes, dailyRes] = await Promise.all([
        getKettlebellEntries(),
        getPushUpEntries(),
        getWorkoutSummary(),
        getDailyWorkoutData()
      ]);
      setKettlebellEntries(kettlebellRes);
      setPushUpEntries(pushUpRes);
      setSummary(summaryRes);
      setDailyData(dailyRes);
    } catch (error) {
      console.error('Error fetching workout data:', error);
      // Set default empty values so UI renders properly
      setSummary(defaultSummary);
      setDailyData(defaultDailyData);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleKettlebellCreated = () => {
    fetchData();
  };

  const handlePushUpCreated = () => {
    fetchData();
  };

  const handleDeleteKettlebell = async (id: number) => {
    try {
      await deleteKettlebellEntry(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting kettlebell entry:', error);
    }
  };

  const handleDeletePushUp = async (id: number) => {
    try {
      await deletePushUpEntry(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting push up entry:', error);
    }
  };

  const handleKettlebellTimeUpdate = async (seconds: number) => {
    try {
      const updated = await updateDailyWorkoutData({ kettlebell_time: seconds });
      setDailyData(updated);
      // Refresh summary to get updated time
      const summaryRes = await getWorkoutSummary();
      setSummary(summaryRes);
    } catch (error) {
      console.error('Error updating kettlebell time:', error);
    }
  };

  const handlePushUpTimeUpdate = async (seconds: number) => {
    try {
      const updated = await updateDailyWorkoutData({ pushup_time: seconds });
      setDailyData(updated);
      // Refresh summary to get updated time
      const summaryRes = await getWorkoutSummary();
      setSummary(summaryRes);
    } catch (error) {
      console.error('Error updating push up time:', error);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="min-h-full bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-amber-800 dark:text-amber-400 mb-2">Workout Tracker</h1>
            <p className="text-gray-600 dark:text-gray-400">Track your kettlebell swings and push ups</p>
          </header>

          <div className="grid gap-6">
            {/* Workout Summary */}
            <WorkoutSummary summary={summary} />

            {/* Kettlebell Form */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Kettlebell Swings</h2>
              </div>
              <div className="space-y-4">
                <WorkoutTimer 
                  initialSeconds={dailyData.kettlebell_time}
                  onTimeUpdate={handleKettlebellTimeUpdate}
                  color="amber"
                />
                <KettlebellForm onEntryCreated={handleKettlebellCreated} />
              </div>
            </div>

            {/* Push Up Form */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Push Ups</h2>
              </div>
              <div className="space-y-4">
                <WorkoutTimer 
                  initialSeconds={dailyData.pushup_time}
                  onTimeUpdate={handlePushUpTimeUpdate}
                  color="rose"
                />
                <PushUpForm onEntryCreated={handlePushUpCreated} />
              </div>
            </div>

            {/* Today's Log */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Today's Workout</h2>
              <WorkoutLog 
                kettlebellEntries={kettlebellEntries}
                pushUpEntries={pushUpEntries}
                onDeleteKettlebell={handleDeleteKettlebell}
                onDeletePushUp={handleDeletePushUp}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
