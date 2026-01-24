import { useEffect, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useTaskStore } from '../store/taskStore';

type PaletteMode = 
  | 'search' 
  | 'move' 
  | 'tag' 
  | 'newTask' 
  | 'schedule' 
  | 'deadline' 
  | 'area'
  | 'bulkMove'
  | 'bulkTag'
  | 'bulkRemoveTag'
  | 'bulkSchedule'
  | 'bulkDeadline';

interface UseKeyboardShortcutsProps {
  openPalette: (mode?: PaletteMode, initialValue?: string) => void;
  closePalette: () => void;
  paletteOpen: boolean;
  onSpacePressed?: () => void;
  onSpaceReleased?: () => void;
}

export function useKeyboardShortcuts({ 
  openPalette, 
  closePalette, 
  paletteOpen,
  onSpacePressed,
  onSpaceReleased,
}: UseKeyboardShortcutsProps) {
  const { 
    selectNextTask, 
    selectPrevTask,
    extendSelectionDown,
    extendSelectionUp,
    selectedTaskId,
    selectedTaskIds,
    toggleTask,
    deleteTask,
    duplicateTask,
    toggleTheme,
    startTimer,
    stopTimer,
    getTaskById,
    setEditingTask,
    editingTaskId,
    editingProjectId,
    bulkDelete,
  } = useTaskStore();

  // Check if any edit modal is open
  const isEditModalOpen = !!editingTaskId || !!editingProjectId;
  
  // Check if we're in bulk mode (multiple tasks selected)
  const isBulkMode = selectedTaskIds.length > 1;

  // Track if we're waiting for a second key (for prefix commands)
  const waitingForSpaceCommand = useRef(false);

  // Command palette - Cmd+K (disabled when edit modal is open)
  useHotkeys('meta+k, ctrl+k', (e) => {
    e.preventDefault();
    // Don't open palette when task/project edit modal is open
    if (isEditModalOpen) return;
    if (paletteOpen) {
      closePalette();
    } else {
      openPalette('search');
    }
  }, { enableOnFormTags: true }, [isEditModalOpen, paletteOpen]);

  // Escape to close palette
  useHotkeys('escape', () => {
    if (paletteOpen) {
      closePalette();
    }
  }, { enableOnFormTags: true });

  // Toggle dark mode - Cmd/Ctrl+Shift+L
  useHotkeys('meta+shift+l, ctrl+shift+l', (e) => {
    e.preventDefault();
    toggleTheme();
  }, { enableOnFormTags: true });

  // Global keyboard listener for type-anywhere and shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if palette is open
      if (paletteOpen) return;
      
      // Don't capture if focused on an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Handle Shift+Arrow for extending selection (before other modifier checks)
      if (e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          extendSelectionDown();
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          extendSelectionUp();
          return;
        }
      }

      // Don't capture if modifier keys are pressed (except for specific combos)
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
        return;
      }

      const key = e.key.toLowerCase();

      // Handle "Space" prefix commands (task actions)
      if (waitingForSpaceCommand.current) {
        waitingForSpaceCommand.current = false;
        onSpaceReleased?.();
        
        // Commands that work without selection
        if (key === 'n') {
          e.preventDefault();
          openPalette('newTask');
          return;
        }
        
        // Bulk mode commands (when multiple tasks are selected)
        if (isBulkMode) {
          switch (key) {
            case 't':
              e.preventDefault();
              openPalette('bulkTag');
              return;
            case 'x':
              e.preventDefault();
              if (confirm(`Delete ${selectedTaskIds.length} tasks? This cannot be undone.`)) {
                bulkDelete();
              }
              return;
            case 'm':
              e.preventDefault();
              openPalette('bulkMove');
              return;
            case 's':
              e.preventDefault();
              openPalette('bulkSchedule');
              return;
            case 'd':
              e.preventDefault();
              openPalette('bulkDeadline');
              return;
          }
          // If not a valid bulk-command, open search with the typed character
          if (key.length === 1 && /[a-z0-9]/i.test(key)) {
            e.preventDefault();
            openPalette('search', key);
          }
          return;
        }
        
        // Single task commands
        if (selectedTaskId) {
          switch (key) {
            case 't':
              e.preventDefault();
              openPalette('tag');
              return;
            case 'x':
              e.preventDefault();
              deleteTask(selectedTaskId);
              return;
            case 'm':
              e.preventDefault();
              openPalette('move');
              return;
            case 'c':
              e.preventDefault();
              toggleTask(selectedTaskId);
              return;
            case 's':
              e.preventDefault();
              openPalette('schedule');
              return;
            case 'd':
              e.preventDefault();
              openPalette('deadline');
              return;
            case 'p':
              e.preventDefault();
              // Toggle timer (play/pause)
              const task = getTaskById(selectedTaskId);
              if (task?.timerStartedAt) {
                stopTimer(selectedTaskId);
              } else {
                startTimer(selectedTaskId);
              }
              return;
            case 'e':
              e.preventDefault();
              // Close palette if open, then open task edit modal
              closePalette();
              setEditingTask(selectedTaskId);
              return;
            case 'y':
              e.preventDefault();
              duplicateTask(selectedTaskId);
              return;
          }
        }
        // If not a valid space-command, open search with the typed character
        if (key.length === 1 && /[a-z0-9]/i.test(key)) {
          e.preventDefault();
          openPalette('search', key);
        }
        return;
      }

      // Single-key shortcuts
      switch (key) {
        case 'arrowdown':
          e.preventDefault();
          selectNextTask();
          break;
          
        case 'arrowup':
          e.preventDefault();
          selectPrevTask();
          break;
          
        case 'enter':
          // Enter opens the edit modal for the selected task
          if (selectedTaskId) {
            e.preventDefault();
            setEditingTask(selectedTaskId);
          }
          break;
          
        case ' ':
          // Space as leader key for task actions (always active for space+n)
          e.preventDefault();
          waitingForSpaceCommand.current = true;
          onSpacePressed?.();
          // Reset after a timeout if no second key is pressed
          setTimeout(() => {
            if (waitingForSpaceCommand.current) {
              waitingForSpaceCommand.current = false;
              onSpaceReleased?.();
            }
          }, 1500);
          break;
          
        default:
          // Type-anywhere: open palette with the typed character
          if (key.length === 1 && /[a-z0-9]/i.test(key)) {
            e.preventDefault();
            openPalette('search', key);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    paletteOpen, 
    openPalette,
    closePalette,
    selectNextTask, 
    selectPrevTask,
    extendSelectionDown,
    extendSelectionUp,
    selectedTaskId, 
    selectedTaskIds,
    isBulkMode,
    toggleTask, 
    deleteTask,
    bulkDelete,
    toggleTheme,
    onSpacePressed,
    onSpaceReleased,
    startTimer,
    stopTimer,
    getTaskById,
    setEditingTask,
    duplicateTask,
  ]);
}
