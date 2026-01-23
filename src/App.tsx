import { useState, useCallback, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TaskList } from './components/TaskList';
import { CommandPalette } from './components/CommandPalette';
import { useKeyboardShortcuts } from './hooks/useKeyboard';
import { useTaskStore } from './store/taskStore';

function App() {
  const { loadData, isLoading } = useTaskStore();
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Load data from API on mount
  useEffect(() => {
    loadData();
  }, [loadData]);
  const [paletteMode, setPaletteMode] = useState<'search' | 'move' | 'tag' | 'newTask' | 'schedule'>('search');
  const [paletteInitialValue, setPaletteInitialValue] = useState('');
  const [showGHint, setShowGHint] = useState(false);
  const [showSpaceHint, setShowSpaceHint] = useState(false);

  const openPalette = useCallback((mode: 'search' | 'move' | 'tag' | 'newTask' | 'schedule' = 'search', initialValue?: string) => {
    setPaletteMode(mode);
    setPaletteInitialValue(initialValue ?? '');
    setPaletteOpen(true);
  }, []);

  const closePalette = useCallback(() => {
    setPaletteOpen(false);
    setPaletteMode('search');
    setPaletteInitialValue('');
  }, []);

  const handleGPressed = useCallback(() => setShowGHint(true), []);
  const handleGReleased = useCallback(() => setShowGHint(false), []);
  const handleSpacePressed = useCallback(() => setShowSpaceHint(true), []);
  const handleSpaceReleased = useCallback(() => setShowSpaceHint(false), []);

  useKeyboardShortcuts({ 
    openPalette, 
    closePalette, 
    paletteOpen,
    onGPressed: handleGPressed,
    onGReleased: handleGReleased,
    onSpacePressed: handleSpacePressed,
    onSpaceReleased: handleSpaceReleased,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <TaskList />
      <CommandPalette 
        open={paletteOpen} 
        onClose={closePalette}
        mode={paletteMode}
        initialValue={paletteInitialValue}
      />
      
      {/* "Go to" mode indicator */}
      {showGHint && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          <span className="opacity-70">g + </span>
          <kbd className="bg-gray-700 px-2 py-0.5 rounded mx-1">i</kbd>
          <span className="opacity-70">inbox</span>
          <span className="mx-2 opacity-50">|</span>
          <kbd className="bg-gray-700 px-2 py-0.5 rounded mx-1">t</kbd>
          <span className="opacity-70">today</span>
        </div>
      )}
      
      {/* "Space" action mode indicator */}
      {showSpaceHint && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          <span className="opacity-70">space + </span>
          <kbd className="bg-gray-700 px-2 py-0.5 rounded mx-1">s</kbd>
          <span className="opacity-70">schedule</span>
          <span className="mx-2 opacity-50">|</span>
          <kbd className="bg-gray-700 px-2 py-0.5 rounded mx-1">t</kbd>
          <span className="opacity-70">tag</span>
          <span className="mx-2 opacity-50">|</span>
          <kbd className="bg-gray-700 px-2 py-0.5 rounded mx-1">d</kbd>
          <span className="opacity-70">delete</span>
          <span className="mx-2 opacity-50">|</span>
          <kbd className="bg-gray-700 px-2 py-0.5 rounded mx-1">m</kbd>
          <span className="opacity-70">move</span>
          <span className="mx-2 opacity-50">|</span>
          <kbd className="bg-gray-700 px-2 py-0.5 rounded mx-1">c</kbd>
          <span className="opacity-70">complete</span>
        </div>
      )}
    </div>
  );
}

export default App;
