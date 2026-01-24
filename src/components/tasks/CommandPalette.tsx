import { Command } from 'cmdk';
import { useEffect, useState, useRef } from 'react';
import { addDays, addWeeks, format, startOfDay } from 'date-fns';
import { useTaskStore } from '../../store/taskStore';
import {
  parseDateFromText,
  getNextDayOccurrence,
  DAY_ABBREVIATIONS,
  URL_REGEX,
} from '../../lib/tasks/parsing';

// Date suggestion types and helpers for schedule mode
interface DateSuggestion {
  id: string;
  label: string;
  date: Date | null;
  description: string;
  icon: 'sun' | 'calendar' | 'week' | 'clear' | 'someday';
  isSomeday?: boolean;
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  return t.startsWith(q) || t.includes(q);
}

function getDateSuggestions(query: string): DateSuggestion[] {
  const q = query.toLowerCase().trim();
  const today = startOfDay(new Date());
  const tomorrow = startOfDay(addDays(new Date(), 1));
  const nextWeek = startOfDay(addWeeks(new Date(), 1));
  
  const baseSuggestions: DateSuggestion[] = [
    {
      id: 'today',
      label: 'Today',
      date: today,
      description: format(today, 'EEE, MMM d'),
      icon: 'sun',
    },
    {
      id: 'tomorrow',
      label: 'Tomorrow',
      date: tomorrow,
      description: format(tomorrow, 'EEE, MMM d'),
      icon: 'calendar',
    },
    {
      id: 'next-week',
      label: 'Next Week',
      date: nextWeek,
      description: format(nextWeek, 'EEE, MMM d'),
      icon: 'week',
    },
    {
      id: 'no-date',
      label: 'No Date',
      date: null,
      description: 'Remove scheduled date',
      icon: 'clear',
    },
    {
      id: 'someday',
      label: 'Someday',
      date: null,
      description: 'Do it eventually',
      icon: 'someday',
      isSomeday: true,
    },
  ];
  
  // If no query, return base suggestions
  if (!q) {
    return baseSuggestions;
  }
  
  const results: DateSuggestion[] = [];
  
  // Check for keyword matches
  if (fuzzyMatch(q, 'today')) {
    results.push(baseSuggestions[0]);
  }
  if (fuzzyMatch(q, 'tomorrow') || fuzzyMatch(q, 'tom')) {
    results.push(baseSuggestions[1]);
  }
  if (fuzzyMatch(q, 'next week') || fuzzyMatch(q, 'next') || fuzzyMatch(q, 'week')) {
    results.push(baseSuggestions[2]);
  }
  if (fuzzyMatch(q, 'no date') || fuzzyMatch(q, 'none') || fuzzyMatch(q, 'clear') || fuzzyMatch(q, 'remove')) {
    results.push(baseSuggestions[3]);
  }
  if (fuzzyMatch(q, 'someday') || fuzzyMatch(q, 'later') || fuzzyMatch(q, 'eventually')) {
    results.push(baseSuggestions[4]);
  }
  
  // Check for day name matches
  for (const [abbrev, dayIndex] of Object.entries(DAY_ABBREVIATIONS)) {
    if (abbrev.startsWith(q) || q === abbrev) {
      const dayName = DAY_NAMES[dayIndex];
      const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      
      // Get next occurrence
      const firstOccurrence = getNextDayOccurrence(dayIndex, 0);
      const secondOccurrence = getNextDayOccurrence(dayIndex, 1);
      
      // Add first occurrence if not already in results
      const firstId = `${dayName}-1`;
      if (!results.some(r => r.id === firstId)) {
        results.push({
          id: firstId,
          label: capitalizedDay,
          date: firstOccurrence,
          description: format(firstOccurrence, 'MMM d'),
          icon: 'calendar',
        });
      }
      
      // Add second occurrence
      const secondId = `${dayName}-2`;
      if (!results.some(r => r.id === secondId)) {
        results.push({
          id: secondId,
          label: capitalizedDay,
          date: secondOccurrence,
          description: format(secondOccurrence, 'MMM d'),
          icon: 'calendar',
        });
      }
      
      // Only match one day abbreviation
      break;
    }
  }
  
  // Check for day number (1-31)
  const dayNum = parseInt(q, 10);
  if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Try this month first
    let firstDate = new Date(currentYear, currentMonth, dayNum);
    
    // If that day has passed (or is today), use next month
    if (firstDate <= now) {
      firstDate = new Date(currentYear, currentMonth + 1, dayNum);
    }
    
    // Second occurrence is the month after
    const secondDate = new Date(firstDate.getFullYear(), firstDate.getMonth() + 1, dayNum);
    
    // Only add if the date is valid (handles months with fewer days)
    if (firstDate.getDate() === dayNum) {
      results.push({
        id: `day-${dayNum}-1`,
        label: format(firstDate, 'EEEE'),
        date: startOfDay(firstDate),
        description: format(firstDate, 'MMM d'),
        icon: 'calendar',
      });
    }
    
    if (secondDate.getDate() === dayNum) {
      results.push({
        id: `day-${dayNum}-2`,
        label: format(secondDate, 'EEEE'),
        date: startOfDay(secondDate),
        description: format(secondDate, 'MMM d'),
        icon: 'calendar',
      });
    }
  }
  
  return results;
}

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

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onModeChange?: (mode: PaletteMode) => void;
  mode: PaletteMode;
  initialValue?: string;
}

export function CommandPalette({ open, onClose, onModeChange, mode, initialValue = '' }: CommandPaletteProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { 
    tasks, 
    projects,
    areas,
    tags,
    selectedTaskId,
    selectedTaskIds,
    addTask, 
    moveTask,
    setTaskArea,
    setProjectArea,
    setTaskDate,
    setDeadline,
    setSomeday,
    setRecurrence,
    addTagToTask,
    removeTagFromTask,
    addProject,
    addArea,
    deleteArea,
    setView,
    selectTask,
    getTaskById,
    // Bulk actions
    bulkMoveToProject,
    bulkMoveToArea,
    bulkAddTag,
    bulkRemoveTag,
    bulkSetDeadline,
    bulkSetSchedule,
    bulkSetSomeday,
    bulkDelete,
    clearSelection,
  } = useTaskStore();
  
  // Check if we're in bulk mode (multiple tasks selected)
  const isBulkMode = selectedTaskIds.length > 1;
  const bulkCount = selectedTaskIds.length;

  useEffect(() => {
    if (open) {
      setInputValue(initialValue);
      // Focus input after a small delay to ensure the dialog is rendered
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open, mode, initialValue]);

  // Detect if user is typing a tag in newTask mode (e.g., "Buy groceries #shop")
  const tagMatch = mode === 'newTask' ? inputValue.match(/#(\w*)$/) : null;
  const isTypingTag = tagMatch !== null;
  const tagQuery = tagMatch?.[1]?.toLowerCase() || '';
  
  // Filter tags based on the query after #
  const filteredTags = isTypingTag
    ? tags.filter(t => t.toLowerCase().includes(tagQuery))
    : [];

  // Detect if user is typing a location in newTask mode (e.g., "Buy groceries @dev")
  const locationMatch = mode === 'newTask' ? inputValue.match(/@(\w*)$/) : null;
  const isTypingLocation = locationMatch !== null;
  const locationQuery = locationMatch?.[1]?.toLowerCase() || '';

  // Filter projects and areas based on the query after @
  const filteredLocationProjects = isTypingLocation
    ? projects.filter(p => p.name.toLowerCase().includes(locationQuery))
    : [];
  const filteredLocationAreas = isTypingLocation
    ? areas.filter(a => a.name.toLowerCase().includes(locationQuery))
    : [];

  // Parse all tags from input for display
  const parsedTags = inputValue.match(/#(\w+)/g)?.map(t => t.slice(1).toLowerCase()) || [];
  
  // Extract URL from input (first match only)
  const urlMatches = inputValue.match(URL_REGEX);
  const parsedUrl = urlMatches?.[0] ?? null;
  
  // Get clean title (without tags, location, and URLs) for display
  const titleWithoutTags = inputValue.replace(/#\w+\s*/g, '').replace(/@\w+\s*/g, '').replace(URL_REGEX, '').trim();
  
  // Parse location from input (e.g., "@dev" or "@gamedev")
  const locationFromInput = inputValue.match(/@(\w+)/)?.[1]?.toLowerCase();
  const parsedProject = locationFromInput 
    ? projects.find(p => p.name.toLowerCase() === locationFromInput) 
    : null;
  const parsedArea = !parsedProject && locationFromInput
    ? areas.find(a => a.name.toLowerCase() === locationFromInput)
    : null;
  
  // Parse deadline from d/ syntax (e.g., "d/mon", "d/tom", "d/23jun")
  const deadlineMatch = mode === 'newTask' ? titleWithoutTags.match(/\bd\/(\S+)/i) : null;
  let parsedDeadline: Date | null = null;
  let titleWithoutDeadline = titleWithoutTags;
  
  if (deadlineMatch) {
    const dateStr = deadlineMatch[1];
    const dateResult = parseDateFromText(dateStr);
    parsedDeadline = dateResult.scheduledDate;
    titleWithoutDeadline = titleWithoutTags.replace(/\bd\/\S+\s*/i, '').trim();
  }
  
  // Parse scheduled date from the remaining title (for newTask mode)
  const parsedDate = mode === 'newTask' ? parseDateFromText(titleWithoutDeadline) : null;
  const cleanTitle = parsedDate?.title ?? titleWithoutDeadline;

  const handleSelect = (callback: () => void) => {
    callback();
    onClose();
  };

  // Insert a tag into the input, replacing the partial #query
  const insertTag = (tag: string) => {
    const newValue = inputValue.replace(/#\w*$/, `#${tag} `);
    setInputValue(newValue);
    // Keep focus on input
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const insertLocation = (name: string) => {
    // Replace partial @query with full @name
    const newValue = inputValue.replace(/@\w*$/, `@${name} `);
    setInputValue(newValue);
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const getPlaceholder = () => {
    switch (mode) {
      case 'newTask':
        return 'What needs to be done? (use # for tags)';
      case 'move':
        return 'Move to project...';
      case 'tag':
        return 'Add tag...';
      case 'schedule':
        return 'Schedule task...';
      case 'deadline':
        return 'Set deadline...';
      case 'area':
        return 'Type to create area, or select to delete...';
      case 'bulkMove':
        return `Move ${bulkCount} tasks to...`;
      case 'bulkTag':
        return `Add tag to ${bulkCount} tasks...`;
      case 'bulkRemoveTag':
        return `Remove tag from ${bulkCount} tasks...`;
      case 'bulkSchedule':
        return `Schedule ${bulkCount} tasks...`;
      case 'bulkDeadline':
        return `Set deadline for ${bulkCount} tasks...`;
      default:
        return isBulkMode 
          ? `${bulkCount} tasks selected - choose action...`
          : 'Search tasks, projects, or type a command...';
    }
  };
  
  // Get selected task for schedule mode
  const selectedTask = selectedTaskId ? getTaskById(selectedTaskId) : null;

  // Create task with parsed tags, date, deadline, and URL
  const createTaskWithTags = () => {
    if (!cleanTitle && parsedTags.length === 0 && !parsedUrl) return;
    const title = cleanTitle || 'Untitled';
    
    // Determine project/area from @ syntax
    const projectId = parsedProject?.id ?? null;
    const areaId = !projectId && parsedArea ? parsedArea.id : null;
    
    addTask(title, projectId, parsedTags, parsedDate?.scheduledDate ?? null, parsedDeadline, areaId, parsedUrl);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Tab to insert selected tag when typing #
    if (mode === 'newTask' && isTypingTag && e.key === 'Tab' && filteredTags.length > 0) {
      e.preventDefault();
      insertTag(filteredTags[0]);
      return;
    }
    
    // Handle Tab to insert selected location when typing @
    if (mode === 'newTask' && isTypingLocation && e.key === 'Tab') {
      e.preventDefault();
      const firstMatch = filteredLocationProjects[0] || filteredLocationAreas[0];
      if (firstMatch) {
        insertLocation(firstMatch.name);
      }
      return;
    }
    
    // Handle Enter for new task creation (only if not selecting a tag or location)
    if (mode === 'newTask' && e.key === 'Enter' && inputValue.trim() && !isTypingTag && !isTypingLocation) {
      e.preventDefault();
      createTaskWithTags();
      return;
    }
    
    // Note: Tag mode Enter is handled by cmdk's onSelect to allow selecting filtered items
    
    // Handle Enter for new project creation when moving
    if (mode === 'move' && e.key === 'Enter' && inputValue.trim()) {
      // Check if it matches an existing project
      const existingProject = projects.find(
        p => p.name.toLowerCase() === inputValue.trim().toLowerCase()
      );
      if (!existingProject && selectedTaskId) {
        // Create new project and move task to it
        addProject(inputValue.trim());
        // We need to get the new project id after it's created
        // For now, we'll just close - the user can select it from the list
      }
    }
    
    // Note: Removed single-key shortcuts for schedule mode (t/m/w/x) 
    // to allow fuzzy typing. Users can now type "tod", "tom", "mon", etc.
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" />
      <Command
        className="relative z-10 w-full max-w-xl bg-white dark:bg-zinc-950 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
        loop
        shouldFilter={mode !== 'newTask' && mode !== 'schedule' && mode !== 'deadline'}
      >
        <Command.Input
          ref={inputRef}
          value={inputValue}
          onValueChange={setInputValue}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          className="w-full px-4 py-4 text-lg border-b border-zinc-200 dark:border-zinc-800 outline-none bg-transparent text-zinc-900 dark:text-zinc-50"
        />
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-zinc-600 dark:text-zinc-400">
            {mode === 'newTask' 
              ? 'Press Enter to create task' 
              : mode === 'tag'
              ? 'Press Enter to create tag'
              : 'No results found'}
          </Command.Empty>

          {mode === 'search' && (
            <>
              {/* Bulk Actions - show when multiple tasks selected */}
              {isBulkMode && (
                <Command.Group heading={`Bulk Actions (${bulkCount} tasks)`}>
                  <Command.Item
                    value="bulk move"
                    onSelect={() => {
                      setInputValue('');
                      onModeChange?.('bulkMove');
                    }}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                  >
                    <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span>Move {bulkCount} tasks to...</span>
                    <span className="ml-auto text-xs text-zinc-600 dark:text-zinc-400">project/area</span>
                  </Command.Item>
                  <Command.Item
                    value="bulk add tag"
                    onSelect={() => {
                      setInputValue('');
                      onModeChange?.('bulkTag');
                    }}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                  >
                    <span className="text-zinc-600 dark:text-zinc-400">#</span>
                    <span>Add tag to {bulkCount} tasks</span>
                  </Command.Item>
                  <Command.Item
                    value="bulk remove tag"
                    onSelect={() => {
                      setInputValue('');
                      onModeChange?.('bulkRemoveTag');
                    }}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                  >
                    <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span>Remove tag from {bulkCount} tasks</span>
                  </Command.Item>
                  <Command.Item
                    value="bulk schedule"
                    onSelect={() => {
                      setInputValue('');
                      onModeChange?.('bulkSchedule');
                    }}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                  >
                    <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Schedule {bulkCount} tasks</span>
                  </Command.Item>
                  <Command.Item
                    value="bulk deadline"
                    onSelect={() => {
                      setInputValue('');
                      onModeChange?.('bulkDeadline');
                    }}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                  >
                    <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                    <span>Set deadline for {bulkCount} tasks</span>
                  </Command.Item>
                  <Command.Item
                    value="bulk delete"
                    onSelect={() => handleSelect(() => {
                      if (confirm(`Delete ${bulkCount} tasks? This cannot be undone.`)) {
                        bulkDelete();
                      }
                    })}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800 text-red-600 dark:text-red-400"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete {bulkCount} tasks</span>
                  </Command.Item>
                  <Command.Item
                    value="clear selection"
                    onSelect={() => handleSelect(() => {
                      clearSelection();
                    })}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                  >
                    <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Clear selection</span>
                    <span className="ml-auto text-xs text-zinc-600 dark:text-zinc-400 font-mono">esc</span>
                  </Command.Item>
                </Command.Group>
              )}
              
              {/* Actions */}
              <Command.Group heading="Actions">
                <Command.Item
                  value="new task"
                  onSelect={() => handleSelect(() => {
                    // Will be handled by parent opening in newTask mode
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <span className="text-lg">+</span>
                  <span>New Task</span>
                  <span className="ml-auto text-xs text-zinc-600 dark:text-zinc-400 font-mono">n</span>
                </Command.Item>
                <Command.Item
                  value="new project"
                  onSelect={() => {
                    const name = prompt('Project name:');
                    if (name) {
                      addProject(name);
                      onClose();
                    }
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <span className="text-lg">📁</span>
                  <span>New Project</span>
                </Command.Item>
                <Command.Item
                  value="new area"
                  onSelect={() => {
                    const name = prompt('Area name:');
                    if (name) {
                      addArea(name);
                      onClose();
                    }
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <span className="text-zinc-600 dark:text-zinc-400">@</span>
                  <span>New Area</span>
                </Command.Item>
                </Command.Group>

              {/* Navigation */}
              <Command.Group heading="Navigation">
                <Command.Item
                  value="inbox"
                  onSelect={() => handleSelect(() => setView('inbox'))}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <span className="text-lg">📥</span>
                  <span>Go to Inbox</span>
                  <span className="ml-auto text-xs text-zinc-600 dark:text-zinc-400 font-mono">gi</span>
                </Command.Item>
                <Command.Item
                  value="today"
                  onSelect={() => handleSelect(() => setView('today'))}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <span className="text-lg">📅</span>
                  <span>Go to Today</span>
                  <span className="ml-auto text-xs text-zinc-600 dark:text-zinc-400 font-mono">gt</span>
                </Command.Item>
                <Command.Item
                  value="upcoming"
                  onSelect={() => handleSelect(() => setView('upcoming'))}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <span className="text-lg">📆</span>
                  <span>Go to Upcoming</span>
                  <span className="ml-auto text-xs text-zinc-600 dark:text-zinc-400 font-mono">gu</span>
                </Command.Item>
                <Command.Item
                  value="someday"
                  onSelect={() => handleSelect(() => setView('someday'))}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <span className="text-lg">💭</span>
                  <span>Go to Someday</span>
                  <span className="ml-auto text-xs text-zinc-600 dark:text-zinc-400 font-mono">gs</span>
                </Command.Item>
              </Command.Group>

              {/* Projects */}
              {projects.length > 0 && (
                <Command.Group heading="Projects">
                  {projects.map(project => (
                    <Command.Item
                      key={project.id}
                      value={`project ${project.name}`}
                      onSelect={() => handleSelect(() => setView('project', project.id))}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                    >
                      <span 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: project.color }}
                      />
                      <span>{project.name}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {/* Areas */}
              {areas.length > 0 && (
                <Command.Group heading="Areas">
                  {areas.map(area => (
                    <Command.Item
                      key={area.id}
                      value={`area ${area.name}`}
                      onSelect={() => handleSelect(() => setView('area', null, null, area.id))}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                    >
                      <span className="text-zinc-600 dark:text-zinc-400">@</span>
                      <span>{area.name}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {/* Move Project to Area */}
              {projects.length > 0 && areas.length > 0 && (
                <Command.Group heading="Move Project to Area">
                  {projects.map(project => {
                    const currentArea = areas.find(a => a.id === project.areaId);
                    return (
                      <Command.Item
                        key={`move-${project.id}`}
                        value={`move project ${project.name} to area`}
                        onSelect={() => {
                          const areaNames = areas.map(a => a.name).join(', ');
                          const areaName = prompt(
                            `Move "${project.name}" to area (${areaNames}), or type "none" to remove from area:`,
                            currentArea?.name || ''
                          );
                          if (areaName?.toLowerCase() === 'none') {
                            setProjectArea(project.id, null);
                            onClose();
                          } else if (areaName) {
                            const targetArea = areas.find(a => a.name.toLowerCase() === areaName.toLowerCase());
                            if (targetArea) {
                              setProjectArea(project.id, targetArea.id);
                              onClose();
                            } else {
                              alert(`Area "${areaName}" not found.`);
                            }
                          }
                        }}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                      >
                        <span 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: project.color }}
                        />
                        <span className="flex-1">{project.name}</span>
                        {currentArea ? (
                          <span className="text-xs text-zinc-600 dark:text-zinc-400">in @{currentArea.name}</span>
                        ) : (
                          <span className="text-xs text-zinc-600 dark:text-zinc-400">no area</span>
                        )}
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <Command.Group heading="Tags">
                  {tags.map(tag => (
                    <Command.Item
                      key={tag}
                      value={`tag ${tag}`}
                      onSelect={() => handleSelect(() => setView('tag', null, tag))}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                    >
                      <span className="text-zinc-600 dark:text-zinc-400">#</span>
                      <span>{tag}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {/* Tasks */}
              {tasks.filter(t => !t.completed).length > 0 && (
                <Command.Group heading="Tasks">
                  {tasks.filter(t => !t.completed).map(task => (
                    <Command.Item
                      key={task.id}
                      value={`task ${task.title}`}
                      onSelect={() => handleSelect(() => {
                        if (task.projectId) {
                          setView('project', task.projectId);
                        } else {
                          setView('inbox');
                        }
                        selectTask(task.id);
                      })}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                    >
                      <span className="w-4 h-4 rounded-full border-2 border-gray-300" />
                      <span className="truncate">{task.title}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </>
          )}

          {mode === 'move' && (
            <>
              <Command.Item
                value="inbox"
                onSelect={() => handleSelect(() => {
                  if (selectedTaskId) moveTask(selectedTaskId, null);
                })}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
              >
                <span className="text-lg">📥</span>
                <span>Inbox</span>
              </Command.Item>
              {projects.map(project => (
                <Command.Item
                  key={project.id}
                  value={project.name}
                  onSelect={() => handleSelect(() => {
                    if (selectedTaskId) moveTask(selectedTaskId, project.id);
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <span 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: project.color }}
                  />
                  <span>{project.name}</span>
                </Command.Item>
              ))}
              {inputValue && !projects.some(p => p.name.toLowerCase() === inputValue.toLowerCase()) && (
                <Command.Item
                  value={`create ${inputValue}`}
                  onSelect={() => handleSelect(() => {
                    addProject(inputValue);
                    // Move task to the new project - need to do this after project is created
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <span className="text-lg">+</span>
                  <span>Create "{inputValue}"</span>
                </Command.Item>
              )}
              {/* Areas */}
              {areas.length > 0 && (
                <Command.Group heading="Areas">
                  {areas.map(area => (
                    <Command.Item
                      key={area.id}
                      value={`area ${area.name}`}
                      onSelect={() => handleSelect(() => {
                        if (selectedTaskId) setTaskArea(selectedTaskId, area.id);
                      })}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                    >
                      <span className="text-zinc-600 dark:text-zinc-400">@</span>
                      <span>{area.name}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </>
          )}

          {mode === 'tag' && (
            <>
              {tags.map(tag => {
                const isOnTask = selectedTask?.tags.includes(tag);
                return (
                  <Command.Item
                    key={tag}
                    value={tag}
                    onSelect={() => handleSelect(() => {
                      if (selectedTaskId) {
                        if (isOnTask) {
                          removeTagFromTask(selectedTaskId, tag);
                        } else {
                          addTagToTask(selectedTaskId, tag);
                        }
                      }
                    })}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                  >
                    <span className="text-zinc-600 dark:text-zinc-400">#</span>
                    <span className="flex-1">{tag}</span>
                    {isOnTask && (
                      <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </Command.Item>
                );
              })}
              {inputValue && !tags.includes(inputValue.toLowerCase()) && (
                <Command.Item
                  value={`create tag ${inputValue}`}
                  onSelect={() => handleSelect(() => {
                    if (selectedTaskId) addTagToTask(selectedTaskId, inputValue);
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <span className="text-lg">+</span>
                  <span>Create tag "#{inputValue}"</span>
                </Command.Item>
              )}
            </>
          )}

          {mode === 'area' && (
            <>
              {/* Existing areas */}
              {areas.map(area => (
                <Command.Item
                  key={area.id}
                  value={area.name}
                  onSelect={() => handleSelect(() => {
                    if (confirm(`Delete area "${area.name}"? Projects will become ungrouped.`)) {
                      deleteArea(area.id);
                    }
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <span className="text-zinc-600 dark:text-zinc-400">@</span>
                  <span>{area.name}</span>
                  <span className="ml-auto text-xs text-zinc-600 dark:text-zinc-400">click to delete</span>
                </Command.Item>
              ))}
              
              {/* Create new area option */}
              {inputValue && !areas.some(a => a.name.toLowerCase() === inputValue.toLowerCase()) && (
                <Command.Item
                  value={`create ${inputValue}`}
                  onSelect={() => handleSelect(() => {
                    addArea(inputValue);
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <span className="text-lg">+</span>
                  <span>Create area "{inputValue}"</span>
                </Command.Item>
              )}
            </>
          )}

          {mode === 'newTask' && (
            <>
              {/* Show tag suggestions when typing # */}
              {isTypingTag && filteredTags.length > 0 && (
                <Command.Group heading="Tags">
                  {filteredTags.slice(0, 6).map(tag => (
                    <Command.Item
                      key={tag}
                      value={`tag-${tag}`}
                      onSelect={() => insertTag(tag)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                    >
                      <span className="text-zinc-600 dark:text-zinc-400">#</span>
                      <span>{tag}</span>
                      <span className="ml-auto text-xs text-zinc-600 dark:text-zinc-400">Tab</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              
              {/* Show create new tag option if typing # with no matches */}
              {isTypingTag && tagQuery && !tags.includes(tagQuery) && (
                <Command.Item
                  value={`create-tag-${tagQuery}`}
                  onSelect={() => insertTag(tagQuery)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <span className="text-lg">+</span>
                  <span>Create tag "#{tagQuery}"</span>
                </Command.Item>
              )}
              
              {/* Show location suggestions when typing @ */}
              {isTypingLocation && (filteredLocationProjects.length > 0 || filteredLocationAreas.length > 0) && (
                <>
                  {filteredLocationProjects.length > 0 && (
                    <Command.Group heading="Projects">
                      {filteredLocationProjects.slice(0, 4).map(project => (
                        <Command.Item
                          key={project.id}
                          value={`project-${project.id}`}
                          onSelect={() => insertLocation(project.name)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                        >
                          <span 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: project.color }}
                          />
                          <span>{project.name}</span>
                          <span className="ml-auto text-xs text-zinc-600 dark:text-zinc-400">Tab</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                  {filteredLocationAreas.length > 0 && (
                    <Command.Group heading="Areas">
                      {filteredLocationAreas.slice(0, 4).map(area => (
                        <Command.Item
                          key={area.id}
                          value={`area-${area.id}`}
                          onSelect={() => insertLocation(area.name)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                        >
                          <span className="text-zinc-600 dark:text-zinc-400">@</span>
                          <span>{area.name}</span>
                          <span className="ml-auto text-xs text-zinc-600 dark:text-zinc-400">Tab</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                </>
              )}

              {/* Show task preview with parsed tags and date */}
              {inputValue && !isTypingTag && !isTypingLocation && (
                <Command.Item
                  value={inputValue}
                  onSelect={createTaskWithTags}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <span className="text-lg">+</span>
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>Create "{cleanTitle || 'Untitled'}"</span>
                      {parsedProject && (
                        <span className="flex items-center gap-1 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded">
                          <span 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: parsedProject.color }}
                          />
                          {parsedProject.name}
                        </span>
                      )}
                      {parsedArea && (
                        <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded">
                          @{parsedArea.name}
                        </span>
                      )}
                      {parsedTags.map(tag => (
                        <span key={tag} className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    {(parsedDate?.scheduledDate || parsedDeadline || parsedUrl) && (
                      <div className="flex items-center gap-3 text-xs">
                        {parsedDate?.scheduledDate && (
                          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{format(parsedDate.scheduledDate, 'EEE, MMM d')}</span>
                          </div>
                        )}
                        {parsedDeadline && (
                          <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                            </svg>
                            <span>Due {format(parsedDeadline, 'EEE, MMM d')}</span>
                          </div>
                        )}
                        {parsedUrl && (
                          <div className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            <span className="truncate max-w-[150px]">{parsedUrl}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="ml-auto text-xs text-zinc-600 dark:text-zinc-400">↵</span>
                </Command.Item>
              )}
              
              {/* Hint when input is empty */}
              {!inputValue && (
                <div className="px-3 py-4 text-sm text-zinc-600 dark:text-zinc-400 text-center">
                  Type task name, use <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded">#</span> for tags
                  <br />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">
                    Schedule: "tomorrow", "mon" | Deadline: <span className="font-mono">d/mon</span>, <span className="font-mono">d/23jun</span>
                  </span>
                </div>
              )}
            </>
          )}

          {mode === 'schedule' && (
            <>
              {selectedTask && (
                <div className="px-3 py-2 mb-2 text-sm text-zinc-600 dark:text-zinc-300 border-b border-zinc-100 dark:border-zinc-800">
                  Scheduling: <span className="font-medium">{selectedTask.title}</span>
                  {selectedTask.scheduledDate && (
                    <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                      (currently: {format(selectedTask.scheduledDate, 'MMM d')})
                    </span>
                  )}
                </div>
              )}
              
              {/* Dynamic date suggestions */}
              {getDateSuggestions(inputValue).map(suggestion => (
                <Command.Item
                  key={suggestion.id}
                  value={`${suggestion.label} ${suggestion.description}`}
                  onSelect={() => handleSelect(() => {
                    if (selectedTaskId) {
                      if (suggestion.isSomeday) {
                        setSomeday(selectedTaskId, true);
                      } else {
                        setTaskDate(selectedTaskId, suggestion.date);
                      }
                    }
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  {suggestion.icon === 'sun' && (
                    <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                    </svg>
                  )}
                  {suggestion.icon === 'calendar' && (
                    <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                  {suggestion.icon === 'week' && (
                    <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                  {suggestion.icon === 'clear' && (
                    <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  {suggestion.icon === 'someday' && (
                    <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  )}
                  <span className="flex-1">{suggestion.label}</span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">{suggestion.description}</span>
                </Command.Item>
              ))}
              
              {/* Show "no results" hint when query doesn't match */}
              {inputValue && getDateSuggestions(inputValue).length === 0 && (
                <div className="px-3 py-4 text-sm text-zinc-600 dark:text-zinc-400 text-center">
                  No matching dates. Try "today", "tomorrow", or a day name like "mon"
                </div>
              )}
              
              <Command.Group heading="Pick a Date">
                <div className="px-3 py-2">
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                    min={format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => {
                      if (e.target.value && selectedTaskId) {
                        const date = new Date(e.target.value + 'T00:00:00');
                        setTaskDate(selectedTaskId, date);
                        onClose();
                      }
                    }}
                  />
                </div>
              </Command.Group>
              
              <Command.Group heading="Repeat">
                {selectedTask?.recurrence && (
                  <Command.Item
                    value="no repeat"
                    onSelect={() => handleSelect(() => {
                      if (selectedTaskId) setRecurrence(selectedTaskId, null);
                    })}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                  >
                    <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="flex-1">No Repeat</span>
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">Remove recurrence</span>
                  </Command.Item>
                )}
                <Command.Item
                  value="daily"
                  onSelect={() => handleSelect(() => {
                    if (selectedTaskId) setRecurrence(selectedTaskId, { type: 'daily', interval: 1 });
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="flex-1">Daily</span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">Every day</span>
                </Command.Item>
                <Command.Item
                  value="weekdays"
                  onSelect={() => handleSelect(() => {
                    if (selectedTaskId) setRecurrence(selectedTaskId, { type: 'weekly', interval: 1, weekdays: [1, 2, 3, 4, 5] });
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="flex-1">Weekdays</span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">Mon-Fri</span>
                </Command.Item>
                <Command.Item
                  value="weekly"
                  onSelect={() => handleSelect(() => {
                    if (selectedTaskId) setRecurrence(selectedTaskId, { type: 'weekly', interval: 1 });
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="flex-1">Weekly</span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">Every week</span>
                </Command.Item>
                <Command.Item
                  value="biweekly"
                  onSelect={() => handleSelect(() => {
                    if (selectedTaskId) setRecurrence(selectedTaskId, { type: 'weekly', interval: 2 });
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="flex-1">Biweekly</span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">Every 2 weeks</span>
                </Command.Item>
                <Command.Item
                  value="monthly"
                  onSelect={() => handleSelect(() => {
                    if (selectedTaskId) setRecurrence(selectedTaskId, { type: 'monthly', interval: 1 });
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="flex-1">Monthly</span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">Every month</span>
                </Command.Item>
                <Command.Item
                  value="yearly"
                  onSelect={() => handleSelect(() => {
                    if (selectedTaskId) setRecurrence(selectedTaskId, { type: 'yearly', interval: 1 });
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="flex-1">Yearly</span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">Every year</span>
                </Command.Item>
              </Command.Group>
            </>
          )}

          {mode === 'deadline' && (
            <>
              {selectedTask && (
                <div className="px-3 py-2 mb-2 text-sm text-zinc-600 dark:text-zinc-300 border-b border-zinc-100 dark:border-zinc-800">
                  Setting deadline for: <span className="font-medium">{selectedTask.title}</span>
                  {selectedTask.deadline && (
                    <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                      (currently due: {format(selectedTask.deadline, 'MMM d')})
                    </span>
                  )}
                </div>
              )}
              
              {/* Dynamic date suggestions for deadline */}
              {getDateSuggestions(inputValue).filter(s => !s.isSomeday).map(suggestion => (
                <Command.Item
                  key={suggestion.id}
                  value={`${suggestion.label} ${suggestion.description}`}
                  onSelect={() => handleSelect(() => {
                    if (selectedTaskId) {
                      setDeadline(selectedTaskId, suggestion.date);
                    }
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  {suggestion.icon === 'sun' && (
                    <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                  )}
                  {(suggestion.icon === 'calendar' || suggestion.icon === 'week') && (
                    <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                  )}
                  {suggestion.icon === 'clear' && (
                    <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className="flex-1">
                    {suggestion.icon === 'clear' ? 'No Deadline' : `Due ${suggestion.label}`}
                  </span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">{suggestion.description}</span>
                </Command.Item>
              ))}
              
              {/* Show "no results" hint when query doesn't match */}
              {inputValue && getDateSuggestions(inputValue).filter(s => !s.isSomeday).length === 0 && (
                <div className="px-3 py-4 text-sm text-zinc-600 dark:text-zinc-400 text-center">
                  No matching dates. Try "today", "tomorrow", or a day name like "mon"
                </div>
              )}
              
              <Command.Group heading="Pick a Deadline">
                <div className="px-3 py-2">
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                    min={format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => {
                      if (e.target.value && selectedTaskId) {
                        const date = new Date(e.target.value + 'T00:00:00');
                        setDeadline(selectedTaskId, date);
                        onClose();
                      }
                    }}
                  />
                </div>
              </Command.Group>
            </>
          )}

          {/* Bulk Move Mode */}
          {mode === 'bulkMove' && (
            <>
              <div className="px-3 py-2 mb-2 text-sm text-blue-600 dark:text-blue-400 border-b border-zinc-100 dark:border-zinc-800">
                Moving <span className="font-semibold">{bulkCount} tasks</span> to...
              </div>
              <Command.Item
                value="inbox"
                onSelect={() => handleSelect(() => {
                  bulkMoveToProject(null);
                })}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
              >
                <span className="text-lg">📥</span>
                <span>Inbox</span>
              </Command.Item>
              {projects.map(project => (
                <Command.Item
                  key={project.id}
                  value={project.name}
                  onSelect={() => handleSelect(() => {
                    bulkMoveToProject(project.id);
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <span 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: project.color }}
                  />
                  <span>{project.name}</span>
                </Command.Item>
              ))}
              {areas.length > 0 && (
                <Command.Group heading="Areas">
                  {areas.map(area => (
                    <Command.Item
                      key={area.id}
                      value={`area ${area.name}`}
                      onSelect={() => handleSelect(() => {
                        bulkMoveToArea(area.id);
                      })}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                    >
                      <span className="text-zinc-600 dark:text-zinc-400">@</span>
                      <span>{area.name}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </>
          )}

          {/* Bulk Add Tag Mode */}
          {mode === 'bulkTag' && (
            <>
              <div className="px-3 py-2 mb-2 text-sm text-blue-600 dark:text-blue-400 border-b border-zinc-100 dark:border-zinc-800">
                Adding tag to <span className="font-semibold">{bulkCount} tasks</span>
              </div>
              {tags.map(tag => (
                <Command.Item
                  key={tag}
                  value={tag}
                  onSelect={() => handleSelect(() => {
                    bulkAddTag(tag);
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <span className="text-zinc-600 dark:text-zinc-400">#</span>
                  <span>{tag}</span>
                </Command.Item>
              ))}
              {inputValue && !tags.includes(inputValue.toLowerCase()) && (
                <Command.Item
                  value={`create tag ${inputValue}`}
                  onSelect={() => handleSelect(() => {
                    bulkAddTag(inputValue);
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  <span className="text-lg">+</span>
                  <span>Create and add tag "#{inputValue}"</span>
                </Command.Item>
              )}
            </>
          )}

          {/* Bulk Remove Tag Mode */}
          {mode === 'bulkRemoveTag' && (
            <>
              <div className="px-3 py-2 mb-2 text-sm text-blue-600 dark:text-blue-400 border-b border-zinc-100 dark:border-zinc-800">
                Removing tag from <span className="font-semibold">{bulkCount} tasks</span>
              </div>
              {/* Show tags that are on at least one selected task */}
              {tags.filter(tag => {
                return selectedTaskIds.some(taskId => {
                  const task = tasks.find(t => t.id === taskId);
                  return task?.tags.includes(tag);
                });
              }).map(tag => {
                // Count how many selected tasks have this tag
                const count = selectedTaskIds.filter(taskId => {
                  const task = tasks.find(t => t.id === taskId);
                  return task?.tags.includes(tag);
                }).length;
                return (
                  <Command.Item
                    key={tag}
                    value={tag}
                    onSelect={() => handleSelect(() => {
                      bulkRemoveTag(tag);
                    })}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                  >
                    <span className="text-zinc-600 dark:text-zinc-400">#</span>
                    <span className="flex-1">{tag}</span>
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">on {count} task{count > 1 ? 's' : ''}</span>
                  </Command.Item>
                );
              })}
              {tags.filter(tag => selectedTaskIds.some(taskId => tasks.find(t => t.id === taskId)?.tags.includes(tag))).length === 0 && (
                <div className="px-3 py-4 text-sm text-zinc-600 dark:text-zinc-400 text-center">
                  No common tags found on selected tasks
                </div>
              )}
            </>
          )}

          {/* Bulk Schedule Mode */}
          {mode === 'bulkSchedule' && (
            <>
              <div className="px-3 py-2 mb-2 text-sm text-blue-600 dark:text-blue-400 border-b border-zinc-100 dark:border-zinc-800">
                Scheduling <span className="font-semibold">{bulkCount} tasks</span>
              </div>
              
              {/* Date suggestions */}
              {getDateSuggestions(inputValue).map(suggestion => (
                <Command.Item
                  key={suggestion.id}
                  value={`${suggestion.label} ${suggestion.description}`}
                  onSelect={() => handleSelect(() => {
                    if (suggestion.isSomeday) {
                      bulkSetSomeday(true);
                    } else {
                      bulkSetSchedule(suggestion.date);
                    }
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  {suggestion.icon === 'sun' && (
                    <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                    </svg>
                  )}
                  {suggestion.icon === 'calendar' && (
                    <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                  {suggestion.icon === 'week' && (
                    <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                  {suggestion.icon === 'clear' && (
                    <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  {suggestion.icon === 'someday' && (
                    <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  )}
                  <span className="flex-1">{suggestion.label}</span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">{suggestion.description}</span>
                </Command.Item>
              ))}
              
              <Command.Group heading="Pick a Date">
                <div className="px-3 py-2">
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                    min={format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => {
                      if (e.target.value) {
                        const date = new Date(e.target.value + 'T00:00:00');
                        bulkSetSchedule(date);
                        onClose();
                      }
                    }}
                  />
                </div>
              </Command.Group>
            </>
          )}

          {/* Bulk Deadline Mode */}
          {mode === 'bulkDeadline' && (
            <>
              <div className="px-3 py-2 mb-2 text-sm text-blue-600 dark:text-blue-400 border-b border-zinc-100 dark:border-zinc-800">
                Setting deadline for <span className="font-semibold">{bulkCount} tasks</span>
              </div>
              
              {/* Date suggestions (excluding someday) */}
              {getDateSuggestions(inputValue).filter(s => !s.isSomeday).map(suggestion => (
                <Command.Item
                  key={suggestion.id}
                  value={`${suggestion.label} ${suggestion.description}`}
                  onSelect={() => handleSelect(() => {
                    bulkSetDeadline(suggestion.date);
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                >
                  {suggestion.icon === 'sun' && (
                    <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                  )}
                  {(suggestion.icon === 'calendar' || suggestion.icon === 'week') && (
                    <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                  )}
                  {suggestion.icon === 'clear' && (
                    <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className="flex-1">
                    {suggestion.icon === 'clear' ? 'No Deadline' : `Due ${suggestion.label}`}
                  </span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">{suggestion.description}</span>
                </Command.Item>
              ))}
              
              <Command.Group heading="Pick a Deadline">
                <div className="px-3 py-2">
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                    min={format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => {
                      if (e.target.value) {
                        const date = new Date(e.target.value + 'T00:00:00');
                        bulkSetDeadline(date);
                        onClose();
                      }
                    }}
                  />
                </div>
              </Command.Group>
            </>
          )}
        </Command.List>
        
        <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 flex gap-4">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </Command>
    </div>
  );
}
