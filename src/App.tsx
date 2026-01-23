import { useState, useCallback, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TaskList } from './components/tasks/TaskList';
import { CommandPalette } from './components/tasks/CommandPalette';
import { TrackerApp } from './components/habits/TrackerApp';
import { FoodTracker } from './components/food/FoodTracker';
import { useKeyboardShortcuts } from './hooks/useKeyboard';
import { useTaskStore } from './store/taskStore';

export type AppMode = 'tasks' | 'habits' | 'food';

function App() {
  const { loadData, isLoading, theme } = useTaskStore();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>('tasks');

  // Load data from API on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const [paletteMode, setPaletteMode] = useState<'search' | 'move' | 'tag' | 'newTask' | 'schedule' | 'deadline' | 'area'>('search');
  const [paletteInitialValue, setPaletteInitialValue] = useState('');
  const [showSpaceHint, setShowSpaceHint] = useState(false);

  const openPalette = useCallback((mode: 'search' | 'move' | 'tag' | 'newTask' | 'schedule' | 'deadline' | 'area' = 'search', initialValue?: string) => {
    setPaletteMode(mode);
    setPaletteInitialValue(initialValue ?? '');
    setPaletteOpen(true);
  }, []);

  const closePalette = useCallback(() => {
    setPaletteOpen(false);
    setPaletteMode('search');
    setPaletteInitialValue('');
  }, []);

  const handleSpacePressed = useCallback(() => setShowSpaceHint(true), []);
  const handleSpaceReleased = useCallback(() => setShowSpaceHint(false), []);

  useKeyboardShortcuts({ 
    openPalette, 
    closePalette, 
    paletteOpen,
    onSpacePressed: handleSpacePressed,
    onSpaceReleased: handleSpaceReleased,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900 items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar appMode={appMode} setAppMode={setAppMode} />
      {appMode === 'tasks' && <TaskList />}
      {appMode === 'habits' && <TrackerApp />}
      {appMode === 'food' && <FoodTracker />}
      {appMode === 'tasks' && (
        <CommandPalette 
          open={paletteOpen} 
          onClose={closePalette}
          mode={paletteMode}
          initialValue={paletteInitialValue}
        />
      )}
      
      {/* "Space" action mode indicator */}
      {showSpaceHint && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          <span className="opacity-70">space + </span>
          <kbd className="bg-gray-700 px-2 py-0.5 rounded mx-1">n</kbd>
          <span className="opacity-70">new</span>
          <span className="mx-2 opacity-50">|</span>
          <kbd className="bg-gray-700 px-2 py-0.5 rounded mx-1">e</kbd>
          <span className="opacity-70">edit</span>
          <span className="mx-2 opacity-50">|</span>
          <kbd className="bg-gray-700 px-2 py-0.5 rounded mx-1">s</kbd>
          <span className="opacity-70">schedule</span>
          <span className="mx-2 opacity-50">|</span>
          <kbd className="bg-gray-700 px-2 py-0.5 rounded mx-1">d</kbd>
          <span className="opacity-70">deadline</span>
          <span className="mx-2 opacity-50">|</span>
          <kbd className="bg-gray-700 px-2 py-0.5 rounded mx-1">t</kbd>
          <span className="opacity-70">tag</span>
          <span className="mx-2 opacity-50">|</span>
          <kbd className="bg-gray-700 px-2 py-0.5 rounded mx-1">m</kbd>
          <span className="opacity-70">move</span>
          <span className="mx-2 opacity-50">|</span>
          <kbd className="bg-gray-700 px-2 py-0.5 rounded mx-1">x</kbd>
          <span className="opacity-70">delete</span>
          <span className="mx-2 opacity-50">|</span>
          <kbd className="bg-gray-700 px-2 py-0.5 rounded mx-1">c</kbd>
          <span className="opacity-70">complete</span>
        </div>
      )}
    </div>
  );
}

export default App;
