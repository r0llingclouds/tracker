import { useEffect, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useTaskStore } from '../store/taskStore';

interface UseKeyboardShortcutsProps {
  openPalette: (mode?: 'search' | 'move' | 'tag' | 'newTask' | 'schedule' | 'deadline' | 'area', initialValue?: string) => void;
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
    selectedTaskId,
    toggleTask,
    deleteTask,
    toggleTheme,
  } = useTaskStore();

  // Track if we're waiting for a second key (for prefix commands)
  const waitingForSpaceCommand = useRef(false);

  // Command palette - Cmd+K
  useHotkeys('meta+k, ctrl+k', (e) => {
    e.preventDefault();
    if (paletteOpen) {
      closePalette();
    } else {
      openPalette('search');
    }
  }, { enableOnFormTags: true });

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

      // Don't capture if modifier keys are pressed (except for specific combos)
      if (e.metaKey || e.ctrlKey || e.altKey) {
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
        
        if (selectedTaskId) {
          switch (key) {
            case 't':
              e.preventDefault();
              openPalette('tag');
              return;
            case 'd':
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
            case 'e':
              e.preventDefault();
              openPalette('deadline');
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
          // Enter still completes task directly (not a letter, won't conflict with search)
          if (selectedTaskId) {
            e.preventDefault();
            toggleTask(selectedTaskId);
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
    selectNextTask, 
    selectPrevTask, 
    selectedTaskId, 
    toggleTask, 
    deleteTask,
    toggleTheme,
    onSpacePressed,
    onSpaceReleased,
  ]);
}
