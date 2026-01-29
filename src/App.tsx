import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TrackerApp } from './components/habits/TrackerApp';
import { FoodTracker } from './components/food/FoodTracker';
import { WorkoutTracker } from './components/workout/WorkoutTracker';

export type AppMode = 'habits' | 'food' | 'workout';
export type Theme = 'light' | 'dark' | 'system';

function App() {
  const [appMode, setAppMode] = useState<AppMode>('habits');
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'system';
  });

  // Save theme to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Apply theme class to document
  useEffect(() => {
    const applyTheme = () => {
      const isDark = theme === 'dark' || 
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
    };

    applyTheme();

    // Listen for system theme changes when in 'system' mode
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(current => {
      if (current === 'light') return 'dark';
      if (current === 'dark') return 'system';
      return 'light';
    });
  };

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-black">
      <Sidebar appMode={appMode} setAppMode={setAppMode} theme={theme} toggleTheme={toggleTheme} />
      {appMode === 'habits' && <TrackerApp />}
      {appMode === 'food' && <FoodTracker />}
      {appMode === 'workout' && <WorkoutTracker />}
    </div>
  );
}

export default App;
