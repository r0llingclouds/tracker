import { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, CollisionDetection } from '@dnd-kit/core';
import { startOfDay, addDays } from 'date-fns';
import { Sidebar } from './components/Sidebar';
import { TaskList } from './components/tasks/TaskList';
import { CommandPalette } from './components/tasks/CommandPalette';
import { TrackerApp } from './components/habits/TrackerApp';
import { FoodTracker } from './components/food/FoodTracker';
import { WorkoutTracker } from './components/workout/WorkoutTracker';
import { useKeyboardShortcuts } from './hooks/useKeyboard';
import { useTaskStore } from './store/taskStore';

export type AppMode = 'tasks' | 'habits' | 'food' | 'workout';

function App() {
  const { loadData, isLoading, theme, reorderTasks, moveTask, setTaskDate, setTaskArea, setSomeday, getTaskById } = useTaskStore();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>('tasks');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  
  // DnD sensors - pointer only (keyboard sensor disabled to avoid conflict with Space shortcuts)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before starting drag
      },
    })
  );
  
  // Custom collision detection: prefer droppable areas (sidebar) over sortable items
  const collisionDetection: CollisionDetection = useCallback((args) => {
    // First check for pointer intersections with droppables (sidebar items)
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      // Filter to only drop targets (sidebar items have ids starting with 'drop-')
      const dropTargets = pointerCollisions.filter(c => 
        typeof c.id === 'string' && c.id.startsWith('drop-')
      );
      if (dropTargets.length > 0) {
        return dropTargets;
      }
    }
    
    // Fall back to rect intersection for sortable items
    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) {
      return rectCollisions;
    }
    
    // Finally try closest center for reordering
    return closestCenter(args);
  }, []);
  
  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveTaskId(event.active.id as string);
  }, []);
  
  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTaskId(null);
    
    if (!over) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Check if dropped on a sidebar item (drop target)
    if (overId.startsWith('drop-')) {
      const today = startOfDay(new Date());
      const tomorrow = addDays(today, 1);
      
      if (overId === 'drop-inbox') {
        // Move to inbox (clear project and area)
        moveTask(activeId, null);
        setTaskArea(activeId, null);
      } else if (overId === 'drop-today') {
        // Schedule for today
        setTaskDate(activeId, today);
      } else if (overId === 'drop-upcoming') {
        // Schedule for tomorrow
        setTaskDate(activeId, tomorrow);
      } else if (overId === 'drop-someday') {
        // Mark as someday
        setSomeday(activeId, true);
      } else if (overId.startsWith('drop-area-')) {
        // Move to area
        const areaId = overId.replace('drop-area-', '');
        setTaskArea(activeId, areaId);
      } else if (overId.startsWith('drop-project-')) {
        // Move to project
        const projectId = overId.replace('drop-project-', '');
        moveTask(activeId, projectId);
      }
    } else if (activeId !== overId) {
      // Reordering within list
      reorderTasks(activeId, overId);
    }
  }, [moveTask, setTaskDate, setTaskArea, setSomeday, reorderTasks]);
  
  // Get active task for drag overlay
  const activeTask = activeTaskId ? getTaskById(activeTaskId) : null;

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
      <div className="flex h-screen bg-zinc-50 dark:bg-black items-center justify-center">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen bg-zinc-50 dark:bg-black">
        <Sidebar appMode={appMode} setAppMode={setAppMode} />
        {appMode === 'tasks' && <TaskList />}
        {appMode === 'habits' && <TrackerApp />}
        {appMode === 'food' && <FoodTracker />}
        {appMode === 'workout' && <WorkoutTracker />}
        {appMode === 'tasks' && (
          <CommandPalette 
            open={paletteOpen} 
            onClose={closePalette}
            mode={paletteMode}
            initialValue={paletteInitialValue}
          />
        )}
        
        {/* Drag overlay for visual feedback */}
        <DragOverlay>
          {activeTask ? (
            <div className="bg-white dark:bg-zinc-950 shadow-lg rounded-lg px-4 py-3 border border-zinc-200 dark:border-zinc-800 max-w-md">
              <p className="text-zinc-900 dark:text-zinc-50 truncate">{activeTask.title}</p>
            </div>
          ) : null}
        </DragOverlay>
      
      {/* "Space" action mode indicator */}
      {showSpaceHint && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          <span className="opacity-70">space + </span>
          <kbd className="bg-zinc-700 px-2 py-0.5 rounded mx-1">n</kbd>
          <span className="opacity-70">new</span>
          <span className="mx-2 opacity-50">|</span>
          <kbd className="bg-zinc-700 px-2 py-0.5 rounded mx-1">e</kbd>
          <span className="opacity-70">edit</span>
          <span className="mx-2 opacity-50">|</span>
          <kbd className="bg-zinc-700 px-2 py-0.5 rounded mx-1">s</kbd>
          <span className="opacity-70">schedule</span>
          <span className="mx-2 opacity-50">|</span>
          <kbd className="bg-zinc-700 px-2 py-0.5 rounded mx-1">d</kbd>
          <span className="opacity-70">deadline</span>
          <span className="mx-2 opacity-50">|</span>
          <kbd className="bg-zinc-700 px-2 py-0.5 rounded mx-1">t</kbd>
          <span className="opacity-70">tag</span>
          <span className="mx-2 opacity-50">|</span>
          <kbd className="bg-zinc-700 px-2 py-0.5 rounded mx-1">m</kbd>
          <span className="opacity-70">move</span>
          <span className="mx-2 opacity-50">|</span>
          <kbd className="bg-zinc-700 px-2 py-0.5 rounded mx-1">x</kbd>
          <span className="opacity-70">delete</span>
          <span className="mx-2 opacity-50">|</span>
          <kbd className="bg-zinc-700 px-2 py-0.5 rounded mx-1">c</kbd>
          <span className="opacity-70">complete</span>
        </div>
      )}
      </div>
    </DndContext>
  );
}

export default App;
